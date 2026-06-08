package service

import (
	"bufio"
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	utls "github.com/refraction-networking/utls"
	"golang.org/x/net/http2"

	"github.com/nowen-video/nowen-video/internal/config"
	"go.uber.org/zap"
)

// HTTP 客户端配置常量
const (
	HTTPClientTimeout       = 12 * time.Second
	HTTPDialerTimeout       = 5 * time.Second
	HTTPKeepAliveDuration   = 30 * time.Second
	HTTPTLSHandshakeTimeout = 5 * time.Second

	// TMDb 基础 URL
	TMDbAPIBaseURL   = "https://api.themoviedb.org"
	TMDbImageBaseURL = "https://image.tmdb.org"

	// 重试配置
	DefaultRetryCount = 2
	RetryDelayMin     = 2 * time.Second
	RetryDelayMax     = 4 * time.Second
)

// tmdbTransport 封装 HTTP/2 Transport，支持直连和代理模式
type tmdbTransport struct {
	transport  *http2.Transport
	proxyURL   *url.URL
	baseDialer *net.Dialer
	logger     *zap.SugaredLogger
}

// buildTMDbHTTPClient 构建专用于 TMDb 的 HTTP 客户端
func buildTMDbHTTPClient(cfg *config.Config, logger *zap.SugaredLogger) *http.Client {
	baseDialer := &net.Dialer{
		Timeout:   HTTPDialerTimeout,
		KeepAlive: 30 * time.Second,
	}

	var proxyURL *url.URL
	if cfg.Secrets.TMDbAPIProxy != "" {
		var err error
		proxyURL, err = url.Parse(cfg.Secrets.TMDbAPIProxy)
		if err != nil {
			logger.Warnf("TMDb 代理配置无效: %v", err)
			proxyURL = nil
		}
	}

	// 调试日志：打印实际的代理配置值
	logger.Infof("TMDb 代理配置检查 - TMDbAPIProxy: [%s], proxyURL: %v", cfg.Secrets.TMDbAPIProxy, proxyURL)

	transport := newTMDbTransport(baseDialer, proxyURL, logger)

	logger.Infof("TMDb HTTP 客户端已初始化 (API代理: %s, 图片代理: %s)",
		defaultIfEmpty(cfg.Secrets.TMDbAPIProxy, "官方直连"),
		defaultIfEmpty(cfg.Secrets.TMDbImageProxy, "官方直连"))

	return &http.Client{
		Timeout:   HTTPClientTimeout,
		Transport: transport,
	}
}

// newTMDbTransport 创建 TMDb 专用的 HTTP/2 Transport
func newTMDbTransport(baseDialer *net.Dialer, proxyURL *url.URL, logger *zap.SugaredLogger) *tmdbTransport {
	t := &tmdbTransport{
		proxyURL:   proxyURL,
		baseDialer: baseDialer,
		logger:     logger,
	}

	// 创建 HTTP/2 Transport
	t.transport = &http2.Transport{
		DialTLSContext:  t.dialTLSContext,
		AllowHTTP:       false,
		IdleConnTimeout: 30 * time.Second,
	}

	return t
}

// dialTLSContext 实现 HTTP/2 的 DialTLSContext 接口
func (t *tmdbTransport) dialTLSContext(ctx context.Context, network, addr string, cfg *tls.Config) (net.Conn, error) {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return nil, err
	}

	var conn net.Conn

	if t.proxyURL != nil {
		// 代理模式：通过 CONNECT 隧道建立连接
		conn, err = t.dialViaProxy(ctx, addr)
	} else {
		// 直连模式：直接建立 TCP 连接
		conn, err = t.baseDialer.DialContext(ctx, network, addr)
	}

	if err != nil {
		return nil, err
	}

	// 使用 uTLS 模拟 Chrome 浏览器的 TLS 指纹
	// HelloChrome_Auto 自动选择最新版 Chrome 指纹 (v133)，
	// 与浏览器 Chrome 147 指纹极为接近，可绕过 BunnyCDN 的 TLS 检测
	uconn := utls.UClient(conn, &utls.Config{
		ServerName:         host,
		InsecureSkipVerify: false,
	}, utls.HelloChrome_Auto)

	if err := uconn.Handshake(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("TLS 握手失败: %s: %w", host, err)
	}

	return uconn, nil
}

// dialViaProxy 通过 HTTP CONNECT 代理建立 TCP 连接
func (t *tmdbTransport) dialViaProxy(ctx context.Context, targetAddr string) (net.Conn, error) {
	// 获取代理地址
	proxyAddr := t.proxyURL.Host
	if !strings.Contains(proxyAddr, ":") {
		// 根据协议确定默认端口
		switch t.proxyURL.Scheme {
		case "https":
			proxyAddr = net.JoinHostPort(proxyAddr, "443")
		default:
			proxyAddr = net.JoinHostPort(proxyAddr, "3128") // HTTP 代理行业默认端口
		}
	}

	// 连接到代理服务器
	proxyConn, err := t.baseDialer.DialContext(ctx, "tcp", proxyAddr)
	if err != nil {
		return nil, fmt.Errorf("连接代理失败: %w", err)
	}

	// 发送 CONNECT 请求
	connectReq := &http.Request{
		Method: "CONNECT",
		URL:    &url.URL{Scheme: "https", Host: targetAddr},
		Host:   targetAddr,
		Header: make(http.Header),
	}
	connectReq.Header.Set("User-Agent", getRandomUserAgent())

	if err := connectReq.Write(proxyConn); err != nil {
		proxyConn.Close()
		return nil, fmt.Errorf("发送 CONNECT 请求失败: %w", err)
	}

	// 读取 CONNECT 响应
	reader := bufio.NewReader(proxyConn)
	connectResp, err := http.ReadResponse(reader, connectReq)
	if err != nil {
		proxyConn.Close()
		return nil, fmt.Errorf("读取 CONNECT 响应失败: %w", err)
	}

	// 关闭响应 Body，避免内存泄漏
	defer connectResp.Body.Close()

	if connectResp.StatusCode != http.StatusOK {
		proxyConn.Close()
		return nil, fmt.Errorf("代理 CONNECT 失败: %s", connectResp.Status)
	}

	return proxyConn, nil
}

// RoundTrip 实现 http.RoundTripper 接口
func (t *tmdbTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// 确保请求使用正确的 Host（保持域名用于 TLS 验证）
	if req.Host == "" {
		req.Host = req.URL.Host
	}
	return t.transport.RoundTrip(req)
}

// getTMDbAPIBase 获取 TMDb API 基础地址（支持代理）
func (s *MetadataService) getTMDbAPIBase() string {
	if proxy := s.cfg.Secrets.TMDbAPIProxy; proxy != "" {
		return strings.TrimRight(proxy, "/")
	}
	return TMDbAPIBaseURL
}

func (s *MetadataService) getTMDbImageBase() string {
	if proxy := s.cfg.Secrets.TMDbImageProxy; proxy != "" {
		return strings.TrimRight(proxy, "/")
	}
	return TMDbImageBaseURL
}

func (s *MetadataService) buildTMDbImageURLs(tmdbPath, size string) []string {
	var urls []string
	imageBase := s.getTMDbImageBase()
	urls = append(urls, fmt.Sprintf("%s/t/p/%s%s", imageBase, size, tmdbPath))
	if s.cfg.Secrets.TMDbAPIProxy != "" {
		apiBase := s.getTMDbAPIBase()
		if apiBase != imageBase {
			urls = append(urls, fmt.Sprintf("%s/t/p/%s%s", apiBase, size, tmdbPath))
		}
	}
	return urls
}

// tmdbGetWithRetry 带重试的 TMDb GET 请求
func (s *MetadataService) tmdbGetWithRetry(tmdbURL string) (*http.Response, error) {
	var lastErr error
	for i := 0; i < DefaultRetryCount; i++ {
		req, reqErr := http.NewRequest("GET", tmdbURL, nil)
		if reqErr != nil {
			lastErr = reqErr
			break
		}
		setAPIHeaders(req)

		resp, err := s.client.Do(req)
		if err != nil {
			lastErr = err
			randomDelay(int(RetryDelayMin.Milliseconds()), int(RetryDelayMax.Milliseconds()))
			continue
		}

		if resp.StatusCode == http.StatusOK {
			return resp, nil
		}

		if resp.StatusCode == http.StatusTooManyRequests {
			retryAfter := parseRetryAfter(resp)
			resp.Body.Close()
			s.logger.Warnf("TMDb 触发速率限制 (429)，等待 %v 后重试 (%d/%d)", retryAfter, i+1, DefaultRetryCount)
			time.Sleep(retryAfter)
			lastErr = fmt.Errorf("HTTP 429")
			continue
		}

		resp.Body.Close()
		if resp.StatusCode >= 500 {
			lastErr = fmt.Errorf("HTTP %d", resp.StatusCode)
			randomDelay(int(RetryDelayMin.Milliseconds()), int(RetryDelayMax.Milliseconds()))
			continue
		}
		lastErr = fmt.Errorf("HTTP %d", resp.StatusCode)
		break
	}
	return nil, fmt.Errorf("TMDb 请求失败（重试 %d 次后仍失败）: %w", DefaultRetryCount-1, lastErr)
}

// parseRetryAfter 解析 Retry-After 响应头，返回等待时长
func parseRetryAfter(resp *http.Response) time.Duration {
	if v := resp.Header.Get("Retry-After"); v != "" {
		if sec, err := strconv.Atoi(v); err == nil {
			return time.Duration(sec) * time.Second
		}
		if t, err := time.Parse(time.RFC1123, v); err == nil {
			if d := time.Until(t); d > 0 {
				return d
			}
		}
	}
	return 5 * time.Second
}

// PingTMDb 测试 TMDb API 连通性
func (s *MetadataService) PingTMDb(apiKey string) (ok bool, msg string) {
	if apiKey == "" {
		return false, "API Key 未配置"
	}

	apiURL := fmt.Sprintf("%s/3/movie/11?api_key=%s", s.getTMDbAPIBase(), apiKey)
	resp, err := s.tmdbGetWithRetry(apiURL)
	if err != nil {
		return false, "TMDb API 连接失败: " + err.Error() + "（请检查网络或 TMDb 代理配置）"
	}
	resp.Body.Close()
	return true, "TMDb API 连通正常"
}

// defaultIfEmpty 如果字符串为空返回默认值
func defaultIfEmpty(s, def string) string {
	if s == "" {
		return def
	}
	return s
}
