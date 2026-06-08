package service

import (
	"crypto/md5"
	"crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	mathrand "math/rand"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/nowen-video/nowen-video/internal/config"
	"go.uber.org/zap"
)

// ==================== 喜马拉雅 API 数据结构 ====================

type ximalayaDeviceResponse struct {
	Ret       int    `json:"ret"`
	Msg       string `json:"msg"`
	DeviceID  string `json:"device_id"`
	IsNew     bool   `json:"is_new"`
	ThirdID   string `json:"third_id"`
	ServerNow int64  `json:"server_now"`
}

type ximalayaTokenResponse struct {
	Ret          int    `json:"ret"`
	Msg          string `json:"msg"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
	UID          int64  `json:"uid"`
}

type ximalayaSearchResponse struct {
	Ret         int                   `json:"ret"`
	Msg         string                `json:"msg"`
	TotalCount  int                   `json:"total_count"`
	TotalPage   int                   `json:"total_page"`
	CurrentPage int                   `json:"current_page"`
	Albums      []ximalayaSearchAlbum `json:"albums"`
}

type ximalayaSearchAlbum struct {
	AlbumID           int64  `json:"album_id"`
	AlbumTitle        string `json:"album_title"`
	AlbumIntro        string `json:"album_intro"`
	CoverURLSmall     string `json:"cover_url_small"`
	CoverURLMiddle    string `json:"cover_url_middle"`
	CoverURLLarge     string `json:"cover_url_large"`
	CategoryName      string `json:"category_name"`
	Nickname          string `json:"nickname"`
	IsFinished        int    `json:"is_finished"`
	IncludeTrackCount int    `json:"include_track_count"`
	PlayCount         int64  `json:"play_count"`
	Duration          int64  `json:"track_total_duration"`
	UpdatedAt         int64  `json:"updated_at"`
}

type ximalayaTrackListResponse struct {
	Ret         int             `json:"ret"`
	Msg         string          `json:"msg"`
	TotalCount  int             `json:"total_count"`
	TotalPage   int             `json:"total_page"`
	CurrentPage int             `json:"current_page"`
	Tracks      []ximalayaTrack `json:"tracks"`
}

type ximalayaTrack struct {
	TrackID      int64  `json:"track_id"`
	AlbumID      int64  `json:"album_id"`
	Title        string `json:"title"`
	TrackIntro   string `json:"track_intro"`
	Index        int    `json:"index"`
	Duration     int64  `json:"duration"`
	PlayCount    int64  `json:"play_count"`
	CommentCount int64  `json:"comment_count"`
	PlayURL32    string `json:"play_url_32"`
	PlayURL64    string `json:"play_url_64"`
	PlayURLAmr   string `json:"play_url_amr"`
	Size32       int64  `json:"size_32"`
	Size64       int64  `json:"size_64"`
	CreatedAt    int64  `json:"created_at"`
	UpdatedAt    int64  `json:"updated_at"`
}

// ==================== 喜马拉雅刮削结果 ====================

// XimalayaScrapeResult 喜马拉雅刮削结果
type XimalayaScrapeResult struct {
	Title        string                  `json:"title"`
	Description  string                  `json:"description"`
	Author       string                  `json:"author"`
	Narrator     string                  `json:"narrator"`
	Publisher    string                  `json:"publisher"`
	Language     string                  `json:"language"`
	ISBN         string                  `json:"isbn"`
	CoverURL     string                  `json:"cover_url"`
	Genres       string                  `json:"genres"`
	IsCompleted  bool                    `json:"is_completed"`
	Duration     int64                   `json:"duration"`
	ChapterCount int                     `json:"chapter_count"`
	ReleaseDate  string                  `json:"release_date"`
	UpdateDate   string                  `json:"update_date"`
	Year         int                     `json:"year"`
	Rating       float64                 `json:"rating"`
	XimalayaID   int64                   `json:"ximalaya_id"`
	Chapters     []XimalayaChapterResult `json:"chapters"`
}

// XimalayaChapterResult 章节结果
type XimalayaChapterResult struct {
	Index    int    `json:"index"`
	Title    string `json:"title"`
	Duration int64  `json:"duration"`
}

// XimalayaSearchResult 搜索结果
type XimalayaSearchResult struct {
	AlbumID      int64  `json:"album_id"`
	Title        string `json:"title"`
	Author       string `json:"author"`
	Description  string `json:"description"`
	CoverURL     string `json:"cover_url"`
	ChapterCount int    `json:"chapter_count"`
	IsCompleted  bool   `json:"is_completed"`
	Duration     int64  `json:"duration"`
}

// ==================== Web 搜索 API 数据结构 (无认证) ====================

type ximalayaWebSearchResponse struct {
	Ret  int `json:"ret"`
	Data struct {
		Result struct {
			Response struct {
				Docs []ximalayaWebSearchDoc `json:"docs"`
			} `json:"response"`
		} `json:"result"`
	} `json:"data"`
}

type ximalayaWebSearchDoc struct {
	ID           int64  `json:"id"`
	Title        string `json:"title"`
	Intro        string `json:"intro"`
	CoverPath    string `json:"cover_path"`
	Nickname     string `json:"nickname"`
	CustomTitle  string `json:"custom_title"`
	Tags         string `json:"tags"`
	CategoryName string `json:"category_title"`
	IsFinished   int    `json:"is_finished"`
	CreatedAt    int64  `json:"created_at"`
	Tracks       int    `json:"tracks"`
	Score        float64 `json:"score"`
	Play         int64  `json:"play"`
}

type ximalayaWebAlbumPageResponse struct {
	Ret  int `json:"ret"`
	Data struct {
		AlbumID        int64  `json:"albumId"`
		AlbumTitle     string `json:"albumTitle"`
		AlbumIntro     string `json:"albumIntro"`
		AlbumCoverPath string `json:"albumCoverPath"`
		AnchorName     string `json:"anchorName"`
		CategoryName   string `json:"categoryName"`
		IsFinished     int    `json:"isFinished"`
		TrackCount     int    `json:"trackCount"`
		CreatedAt      int64  `json:"createdAt"`
	} `json:"data"`
}

// ==================== plant/detail API 数据结构 (主力详情接口) ====================

type ximalayaPlantDetailResponse struct {
	Ret  int    `json:"ret"`
	Msg  string `json:"msg"`
	Data struct {
		BaseAlbum struct {
			ID         int64  `json:"id"`
			Title      string `json:"title"`
			Intro      string `json:"intro"`
			CoverLarge string `json:"coverLarge"`
			CoverSmall string `json:"coverSmall"`
			TrackCount int    `json:"trackCount"`
			CreatedAt  int64  `json:"createdAt"`
			UpdatedAt  int64  `json:"updatedAt"`
			IsFinished int    `json:"isFinished"`
			Tags       []struct {
				TagName string `json:"tagName"`
			} `json:"albumTags"`
		} `json:"baseAlbum"`
		Anchor struct {
			Nickname string `json:"nickname"`
		} `json:"anchor"`
		Intro struct {
			RichIntro string `json:"richIntro"`
			Intro     string `json:"intro"`
		} `json:"intro"`
		ResourceBit struct {
			CreativeTeam struct {
				ExtraInfo struct {
					CreativeTeamJSON string `json:"creativeTeam"`
				} `json:"extraInfo"`
			} `json:"creativeTeam"`
		} `json:"resourceBit"`
	} `json:"data"`
}

// ==================== 喜马拉雅服务 ====================

// XimalayaService 喜马拉雅移动端API刮削服务
type XimalayaService struct {
	cfg    *config.Config
	logger *zap.SugaredLogger
	client *http.Client
	mu     sync.Mutex
}

// NewXimalayaService 创建喜马拉雅服务
func NewXimalayaService(cfg *config.Config, logger *zap.SugaredLogger) *XimalayaService {
	return &XimalayaService{
		cfg:    cfg,
		logger: logger.Named("ximalaya"),
		client: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				DialContext: (&net.Dialer{
					Timeout:   10 * time.Second,
					KeepAlive: 30 * time.Second,
				}).DialContext,
				MaxIdleConns:          100,
				MaxIdleConnsPerHost:   10,
				IdleConnTimeout:       90 * time.Second,
				TLSHandshakeTimeout:   10 * time.Second,
				ExpectContinueTimeout: 1 * time.Second,
			},
		},
	}
}

// IsEnabled 检查喜马拉雅刮削是否可用
func (s *XimalayaService) IsEnabled() bool {
	return s.cfg.Secrets.XimalayaScraperEnabled && s.cfg.Secrets.Ximalaya.Enabled
}

func init() {
	var seed int64
	if err := binary.Read(rand.Reader, binary.LittleEndian, &seed); err != nil {
		seed = time.Now().UnixNano()
	}
	mathrand.Seed(seed)
}

func (s *XimalayaService) baseURL() string {
	if s.cfg.Secrets.Ximalaya.APIBaseURL != "" {
		return s.cfg.Secrets.Ximalaya.APIBaseURL
	}
	return "https://mobile.ximalaya.com"
}

func (s *XimalayaService) deviceID() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.cfg.Secrets.Ximalaya.DeviceID
}

func (s *XimalayaService) setDeviceID(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cfg.Secrets.Ximalaya.DeviceID = id
}

func (s *XimalayaService) accessToken() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.cfg.Secrets.Ximalaya.AccessToken
}

func (s *XimalayaService) setAccessToken(token string, expiresAt int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cfg.Secrets.Ximalaya.AccessToken = token
	s.cfg.Secrets.Ximalaya.TokenExpiresAt = expiresAt
}

func (s *XimalayaService) setRefreshToken(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cfg.Secrets.Ximalaya.RefreshToken = token
}

func (s *XimalayaService) randomDelay() {
	minI := s.cfg.Secrets.Ximalaya.MinRequestInterval
	maxI := s.cfg.Secrets.Ximalaya.MaxRequestInterval
	if minI <= 0 {
		minI = 800
	}
	if maxI <= 0 {
		maxI = 2000
	}
	delay := minI + mathrand.Intn(maxI-minI)
	time.Sleep(time.Duration(delay) * time.Millisecond)
}

func (s *XimalayaService) newRequest(method, path string, params url.Values, body io.Reader) (*http.Request, error) {
	u := s.baseURL() + path
	if len(params) > 0 {
		u += "?" + params.Encode()
	}

	req, err := http.NewRequest(method, u, body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Linux; Android 9; SM-S9110 Build/PQ3A.190605.09291615; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/92.0.4515.131 Mobile Safari/537.36 iting(main)/9.3.96/android_1 xmly(main)/9.3.96/android_1 kdtUnion_iting/9.3.96")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7")
	req.Header.Set("x-requested-with", "XMLHttpRequest")

	if method == "POST" {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
	}

	req.Header.Set("Cookie", s.buildMobileCookie())

	return req, nil
}

func (s *XimalayaService) buildMobileCookie() string {
	var parts []string

	deviceID := s.deviceID()
	if deviceID != "" {
		parts = append(parts, "1&_device=android&"+deviceID+"&9.3.96")
	}

	if token := s.accessToken(); token != "" {
		parts = append(parts, "1&_token="+token)
	}

	parts = append(parts,
		"channel=and-f5",
		"impl=com.ximalaya.ting.android",
		"osversion=28",
		"fp=009517657x2222322v64v050210000k120211200200000001103611000",
		"device_model=SM-S9110",
		"XUM=CAAn8P8v",
		"c-oper=%E4%B8%AD%E5%9B%BD%E7%A7%BB%E5%8A%A8",
		"net-mode=WIFI",
		"res=1600%2C900",
		"AID=Yjg2YWIyZTRmNzYyN2FjNA==",
		"manufacturer=samsung",
		"umid=ai0fc70f150ccc444005b5c665d7ee7861",
		"xm_grade=0",
		"specialModeStatus=0",
		"yzChannel=and-f5",
		"_xmLog=h5&9550461b-17b4-4dcc-ab09-8609fcda6c02&2.4.24",
		"xm-page-viewid=album-detail-intro",
	)

	return strings.Join(parts, "; ")
}

func (s *XimalayaService) doRequest(req *http.Request, target interface{}) error {
	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body[:min(len(body), 200)]))
	}

	if err := json.Unmarshal(body, target); err != nil {
		return fmt.Errorf("解析响应失败: %w, body=%s", err, string(body[:min(len(body), 500)]))
	}

	return nil
}

// ensureDeviceID 确保有可用的 device_id
func (s *XimalayaService) ensureDeviceID() error {
	if s.deviceID() != "" {
		return nil
	}
	if err := s.registerDevice(); err != nil {
		s.logger.Warnf("设备注册失败，使用内置 device_id: %v", err)
		s.setDeviceID("28b5647f-40d9-3cb6-802a-54905eccc23d")
	}
	return nil
}

// registerDevice 注册设备获取 device_id
func (s *XimalayaService) registerDevice() error {
	s.logger.Debug("注册喜马拉雅设备...")

	params := url.Values{}
	params.Set("device_id", "")
	params.Set("client_os_type", "2")

	req, err := s.newRequest("POST", "/mobile/v4/oauth2/device_id", params, strings.NewReader(params.Encode()))
	if err != nil {
		return fmt.Errorf("创建设备注册请求失败: %w", err)
	}

	var result ximalayaDeviceResponse
	if err := s.doRequest(req, &result); err != nil {
		return fmt.Errorf("设备注册失败: %w", err)
	}

	if result.Ret != 0 {
		return fmt.Errorf("设备注册失败: ret=%d msg=%s", result.Ret, result.Msg)
	}

	if result.DeviceID == "" {
		return fmt.Errorf("设备注册返回空 device_id")
	}

	s.setDeviceID(result.DeviceID)
	s.logger.Infof("喜马拉雅设备注册成功: device_id=%s", result.DeviceID[:min(len(result.DeviceID), 8)]+"...")
	return nil
}

func (s *XimalayaService) ensureLogin() error {
	if s.accessToken() != "" {
		return nil
	}
	return s.guestLogin()
}

// guestLogin 游客登录
func (s *XimalayaService) guestLogin() error {
	if err := s.ensureDeviceID(); err != nil {
		return err
	}

	s.logger.Debug("执行喜马拉雅游客登录...")

	params := url.Values{}
	params.Set("device_id", s.deviceID())
	params.Set("client_os_type", "2")
	params.Set("grant_type", "device_id")

	req, err := s.newRequest("POST", "/mobile/v4/oauth2/token", params, strings.NewReader(params.Encode()))
	if err != nil {
		return fmt.Errorf("创建登录请求失败: %w", err)
	}

	var result ximalayaTokenResponse
	if err := s.doRequest(req, &result); err != nil {
		s.logger.Warnf("游客登录失败，继续使用未登录状态: %v", err)
		s.setAccessToken("C29CC6B0140C8E529835C3060AD1FE97FBF87FFBF4DB5BFB15C60DECE3899A36EDA3462173EE229Mbf90403ACAFF0C4_", time.Now().Unix()+86400)
		return nil
	}

	if result.Ret != 0 {
		s.logger.Warnf("游客登录失败: ret=%d msg=%s，使用内置 token 继续", result.Ret, result.Msg)
		s.setAccessToken("C29CC6B0140C8E529835C3060AD1FE97FBF87FFBF4DB5BFB15C60DECE3899A36EDA3462173EE229Mbf90403ACAFF0C4_", time.Now().Unix()+86400)
		return nil
	}

	if result.AccessToken != "" {
		expiresAt := time.Now().Unix() + result.ExpiresIn
		s.setAccessToken(result.AccessToken, expiresAt)
	}
	if result.RefreshToken != "" {
		s.setRefreshToken(result.RefreshToken)
	}

	s.logger.Info("喜马拉雅游客登录成功")
	return nil
}

// SearchAlbums 搜索专辑
func (s *XimalayaService) SearchAlbums(keyword string, page int, count int) ([]XimalayaSearchResult, int, error) {
	if err := s.ensureDeviceID(); err != nil {
		return nil, 0, err
	}
	if err := s.ensureLogin(); err != nil {
		return nil, 0, err
	}
	s.randomDelay()

	if count <= 0 {
		count = 20
	}

	params := url.Values{}
	params.Set("kw", keyword)
	params.Set("page", strconv.Itoa(page))
	params.Set("count", strconv.Itoa(count))
	params.Set("search_type", "album")
	params.Set("category_id", "0")
	params.Set("condition", "relation")

	req, err := s.newRequest("GET", "/mobile/v1/search/albumV2", params, nil)
	if err != nil {
		return nil, 0, err
	}

	var result ximalayaSearchResponse
	if err := s.doRequest(req, &result); err != nil {
		return nil, 0, err
	}

	if result.Ret != 0 {
		return nil, 0, fmt.Errorf("搜索失败: ret=%d msg=%s", result.Ret, result.Msg)
	}

	var searchResults []XimalayaSearchResult
	for _, album := range result.Albums {
		searchResults = append(searchResults, XimalayaSearchResult{
			AlbumID:      album.AlbumID,
			Title:        album.AlbumTitle,
			Author:       album.Nickname,
			Description:  album.AlbumIntro,
			CoverURL:     album.CoverURLLarge,
			ChapterCount: album.IncludeTrackCount,
			IsCompleted:  album.IsFinished == 2,
			Duration:     album.Duration,
		})
		if len(album.CoverURLLarge) == 0 {
			searchResults[len(searchResults)-1].CoverURL = album.CoverURLMiddle
		}
	}

	return searchResults, result.TotalCount, nil
}

// GetAlbumDetail 获取专辑详情（plant/detail → 失败回退WebAPI → HTML）
func (s *XimalayaService) GetAlbumDetail(albumID int64) (*XimalayaScrapeResult, error) {
	if err := s.ensureDeviceID(); err != nil {
		s.logger.Warnf("设备注册失败: %v，直接尝试 Web API 和 HTML", err)
		return s.getAlbumDetailWeb(albumID)
	}

	result, err := s.getAlbumDetailFromPlant(albumID)
	if err != nil {
		s.logger.Warnf("plant/detail 获取专辑详情失败: %v,尝试Web API", err)
		return s.getAlbumDetailWeb(albumID)
	}
	if result.Title == "" || result.Title == fmt.Sprintf("喜马拉雅专辑 %d", albumID) {
		s.logger.Warnf("plant/detail 返回空标题,尝试Web API")
		return s.getAlbumDetailWeb(albumID)
	}
	return result, nil
}

func (s *XimalayaService) getAlbumDetailWeb(albumID int64) (*XimalayaScrapeResult, error) {
	s.randomDelay()

	albumURL := fmt.Sprintf(
		"https://www.ximalaya.com/revision/album/v1/getAlbumPage?albumId=%d&pageNum=1&pageSize=1",
		albumID,
	)

	req, err := http.NewRequest("GET", albumURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json")
	if xmSign := s.getXmSign(); xmSign != "" {
		req.Header.Set("xm-sign", xmSign)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Web获取专辑详情失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取Web专辑详情失败: %w", err)
	}

	var result ximalayaWebAlbumPageResponse
	if err := json.Unmarshal(body, &result); err != nil {
		s.logger.Warnf("Web专辑详情JSON解析失败，尝试HTML页面: %v", err)
		return s.getAlbumDetailHTML(albumID)
	}

	if result.Ret != 200 || result.Data.AlbumTitle == "" {
		s.logger.Warnf("Web专辑详情API返回无效数据 (ret=%d, title=%s)，尝试HTML页面", result.Ret, result.Data.AlbumTitle)
		return s.getAlbumDetailHTML(albumID)
	}

	data := result.Data
	coverURL := normalizeCoverURL(data.AlbumCoverPath)

	date := time.Unix(data.CreatedAt/1000, 0)

	return &XimalayaScrapeResult{
		Title:        cleanBookTitle(data.AlbumTitle),
		Description:  data.AlbumIntro,
		Narrator:     data.AnchorName,
		Publisher:    "喜马拉雅",
		CoverURL:     coverURL,
		Genres:       data.CategoryName,
		IsCompleted:  data.IsFinished == 2,
		ChapterCount: data.TrackCount,
		XimalayaID:   data.AlbumID,
		ReleaseDate:  date.Format("2006-01-02"),
		Year:         date.Year(),
	}, nil
}

// getAlbumDetailHTML 通过解析HTML页面获取专辑元数据（最后兜底方案）
func (s *XimalayaService) getAlbumDetailHTML(albumID int64) (*XimalayaScrapeResult, error) {
	pageURL := fmt.Sprintf("https://www.ximalaya.com/album/%d", albumID)

	req, err := http.NewRequest("GET", pageURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTML页面请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取HTML页面失败: %w", err)
	}

	html := string(body)

	title := extractJSONField(html, `"albumTitle"\s*:\s*"([^"]*)"`)
	nickname := extractJSONField(html, `"nickname"\s*:\s*"([^"]*)"`)
	intro := extractJSONField(html, `"albumIntro"\s*:\s*"([^"]*)"`)
	coverPath := extractJSONField(html, `"albumCoverPath"\s*:\s*"([^"]*)"`)
	categoryName := extractJSONField(html, `"categoryName"\s*:\s*"([^"]*)"`)
	_ = categoryName
	tags := extractJSONField(html, `"albumTags"\s*:\s*"([^"]*)"`)

	isFinishedStr := extractJSONField(html, `"isFinished"\s*:\s*(\d+)`)
	isFinished := 0
	if isFinishedStr != "" {
		isFinished, _ = strconv.Atoi(isFinishedStr)
	}

	trackCountStr := extractJSONField(html, `"includeTrackCount"\s*:\s*(\d+)`)
	trackCount := 0
	if trackCountStr != "" {
		trackCount, _ = strconv.Atoi(trackCountStr)
	}

	createdAtStr := extractJSONField(html, `"createdAt"\s*:\s*(\d+)`)
	var year int
	var releaseDate string
	if createdAtStr != "" {
		createdAt, _ := strconv.ParseInt(createdAtStr, 10, 64)
		date := time.Unix(createdAt/1000, 0)
		year = date.Year()
		releaseDate = date.Format("2006-01-02")
	}

	coverURL := ""
	if coverPath != "" {
		coverURL = "https:" + strings.Replace(coverPath, `\u002F`, "/", -1)
		coverURL = normalizeCoverURL(coverURL)
	}

	if title == "" {
		s.logger.Warnf("HTML页面也无法提取专辑元数据, albumID=%d", albumID)
		title = fmt.Sprintf("喜马拉雅专辑 %d", albumID)
	}

	return &XimalayaScrapeResult{
		Title:        cleanBookTitle(title),
		Description:  intro,
		Narrator:     nickname,
		Publisher:    "喜马拉雅",
		CoverURL:     coverURL,
		Genres:       tags,
		IsCompleted:  isFinished == 2,
		ChapterCount: trackCount,
		XimalayaID:   albumID,
		ReleaseDate:  releaseDate,
		Year:         year,
	}, nil
}

func extractJSONField(html, pattern string) string {
	re := regexp.MustCompile(pattern)
	matches := re.FindStringSubmatch(html)
	if len(matches) >= 2 {
		return matches[1]
	}
	return ""
}

// GetAlbumTracks 获取专辑声音列表
func (s *XimalayaService) GetAlbumTracks(albumID int64, page int, count int) ([]XimalayaChapterResult, int, error) {
	if err := s.ensureDeviceID(); err != nil {
		return nil, 0, err
	}
	if err := s.ensureLogin(); err != nil {
		return nil, 0, err
	}
	s.randomDelay()

	if count <= 0 {
		count = 200
	}

	params := url.Values{}
	params.Set("albumId", strconv.FormatInt(albumID, 10))
	params.Set("page", strconv.Itoa(page))
	params.Set("count", strconv.Itoa(count))
	params.Set("sort", "asc")

	req, err := s.newRequest("GET", "/mobile/v1/album/track", params, nil)
	if err != nil {
		return nil, 0, err
	}

	var result ximalayaTrackListResponse
	if err := s.doRequest(req, &result); err != nil {
		return nil, 0, err
	}

	if result.Ret != 0 {
		return nil, 0, fmt.Errorf("获取声音列表失败: ret=%d msg=%s", result.Ret, result.Msg)
	}

	var chapters []XimalayaChapterResult
	for _, track := range result.Tracks {
		chapters = append(chapters, XimalayaChapterResult{
			Index:    track.Index,
			Title:    track.Title,
			Duration: track.Duration,
		})
	}

	return chapters, result.TotalCount, nil
}

// GetAllTracks 获取专辑全部声音列表
func (s *XimalayaService) GetAllTracks(albumID int64) ([]XimalayaChapterResult, error) {
	const maxPages = 500
	var allChapters []XimalayaChapterResult
	page := 1

	for {
		chapters, totalCount, err := s.GetAlbumTracks(albumID, page, 200)
		if err != nil {
			return nil, err
		}

		allChapters = append(allChapters, chapters...)

		if len(allChapters) >= totalCount || len(chapters) == 0 {
			break
		}
		if page >= maxPages {
			s.logger.Warnf("专辑 %d 超过最大页数限制 (%d)，停止获取", albumID, maxPages)
			break
		}
		page++
	}

	return allChapters, nil
}

// DownloadCover 下载封面图片
func (s *XimalayaService) DownloadCover(coverURL, saveDir string) (string, error) {
	if coverURL == "" {
		return "", fmt.Errorf("封面URL为空")
	}

	s.randomDelay()

	req, err := http.NewRequest("GET", coverURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "ting_v7.3.92_c5(Android,5.1,Redmi Note 4X)")
	req.Header.Set("Referer", "https://www.ximalaya.com/")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("下载封面失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("下载封面 HTTP %d", resp.StatusCode)
	}

	ext := ".jpg"
	contentType := resp.Header.Get("Content-Type")
	if strings.Contains(contentType, "png") {
		ext = ".png"
	} else if strings.Contains(contentType, "webp") {
		ext = ".webp"
	}

	if err := os.MkdirAll(saveDir, 0755); err != nil {
		return "", fmt.Errorf("创建目录失败: %w", err)
	}

	savePath := filepath.Join(saveDir, "cover"+ext)
	file, err := os.Create(savePath)
	if err != nil {
		return "", fmt.Errorf("创建文件失败: %w", err)
	}
	defer file.Close()

	_, err = io.Copy(file, resp.Body)
	if err != nil {
		return "", fmt.Errorf("保存封面失败: %w", err)
	}

	return savePath, nil
}

// GenerateSignature 生成喜马拉雅签名（用于需要签名的接口）
func GenerateSignature(params map[string]string, timestamp string) string {
	var keys []string
	for k := range params {
		keys = append(keys, k)
	}
	// 按key排序
	for i := 0; i < len(keys); i++ {
		for j := i + 1; j < len(keys); j++ {
			if keys[i] > keys[j] {
				keys[i], keys[j] = keys[j], keys[i]
			}
		}
	}

	sigBase := "@#$^&*(OIUYT"
	for _, k := range keys {
		sigBase += k + "=" + params[k] + "&"
	}
	sigBase += timestamp + "@#$^&*(OIUYT"

	hash := md5.Sum([]byte(sigBase))
	return hex.EncodeToString(hash[:])
}

// ==================== 元数据刮削入口 ====================

// SearchAlbumsWeb 通过 Web API 搜索专辑（无需认证，更稳定）
func (s *XimalayaService) SearchAlbumsWeb(keyword string, page int) ([]XimalayaSearchResult, int, error) {
	docs, err := s.webSearchDocs(keyword, page)
	if err != nil {
		return nil, 0, err
	}

	if len(docs) == 0 {
		return nil, 0, nil
	}

	var searchResults []XimalayaSearchResult
	for _, doc := range docs {
		coverURL := "https:" + doc.CoverPath
		coverURL = strings.Replace(coverURL, "!op_type=3&columns=290&rows=290&magick=png", "", 1)

		searchResults = append(searchResults, XimalayaSearchResult{
			AlbumID:      doc.ID,
			Title:        doc.Title,
			Author:       doc.Nickname,
			Description:  doc.Intro,
			CoverURL:     coverURL,
			ChapterCount: doc.Tracks,
			IsCompleted:  doc.IsFinished == 2,
		})
	}

	return searchResults, len(searchResults), nil
}

// ==================== plant/detail 主力详情 ====================

func (s *XimalayaService) plantDetailRequest(albumID int64) (*ximalayaPlantDetailResponse, error) {
	detailURL := fmt.Sprintf(
		"https://mobile.ximalaya.com/mobile-album/album/plant/detail?albumId=%d&identity=podcast&supportWebp=true",
		albumID,
	)

	req, err := http.NewRequest("GET", detailURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Linux; Android 9; SM-S9110 Build/PQ3A.190605.09291615; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/92.0.4515.131 Mobile Safari/537.36 iting(main)/9.3.96/android_1 xmly(main)/9.3.96/android_1 kdtUnion_iting/9.3.96")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7")
	req.Header.Set("x-requested-with", "XMLHttpRequest")
	req.Header.Set("Referer", "https://mobile.ximalaya.com/")
	req.Header.Set("Cookie", s.buildMobileCookie())

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("plant/detail 请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取 plant/detail 响应失败: %w", err)
	}

	var result ximalayaPlantDetailResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("解析 plant/detail 响应失败: %w", err)
	}

	if result.Ret != 0 {
		return nil, fmt.Errorf("plant/detail 返回失败: ret=%d msg=%s", result.Ret, result.Msg)
	}

	if result.Data.BaseAlbum.Title == "" {
		bodyPreview := string(body)
		if len(bodyPreview) > 500 {
			bodyPreview = bodyPreview[:500]
		}
		s.logger.Warnf("plant/detail ret=0 但 baseAlbum.Title 为空 (albumID=%d), body=%.500s", albumID, bodyPreview)
	}

	return &result, nil
}

func (s *XimalayaService) getAlbumDetailFromPlant(albumID int64) (*XimalayaScrapeResult, error) {
	result, err := s.plantDetailRequest(albumID)
	if err != nil {
		return nil, err
	}

	data := result.Data
	base := data.BaseAlbum

	title := cleanBookTitle(base.Title)
	if title == "" {
		s.logger.Warnf("plant/detail 返回空标题 (albumID=%d), baseAlbum=%+v", albumID, base)
		title = fmt.Sprintf("喜马拉雅专辑 %d", albumID)
	}

	coverURL := base.CoverLarge
	if coverURL == "" {
		coverURL = base.CoverSmall
	}
	coverURL = normalizeCoverURL(coverURL)

	var author string
	if data.ResourceBit.CreativeTeam.ExtraInfo.CreativeTeamJSON != "" {
		author = extractCreativeAuthor(data.ResourceBit.CreativeTeam.ExtraInfo.CreativeTeamJSON)
	}

	narrator := data.Anchor.Nickname

	description := data.Intro.RichIntro
	if description == "" {
		description = data.Intro.Intro
	}
	if description == "" {
		description = base.Intro
	}
	description = cleanDescription(description)

	var tags []string
	for _, t := range base.Tags {
		if t.TagName != "" {
			tags = append(tags, t.TagName)
		}
	}

	isCompleted := base.IsFinished == 2

	var releaseDate string
	var year int
	if base.CreatedAt > 0 {
		date := time.Unix(base.CreatedAt/1000, 0)
		releaseDate = date.Format("2006-01-02")
		year = date.Year()
	}

	return &XimalayaScrapeResult{
		Title:        title,
		Description:  description,
		Author:       author,
		Narrator:     narrator,
		Publisher:    "喜马拉雅",
		CoverURL:     coverURL,
		Genres:       strings.Join(tags, ","),
		IsCompleted:  isCompleted,
		ChapterCount: base.TrackCount,
		XimalayaID:   albumID,
		ReleaseDate:  releaseDate,
		Year:         year,
	}, nil
}

func extractCreativeAuthor(creativeJSON string) string {
	var data struct {
		CreativeTeams []struct {
			Role     string `json:"role"`
			NickName string `json:"nickName"`
		} `json:"creativeTeams"`
	}
	if err := json.Unmarshal([]byte(creativeJSON), &data); err != nil {
		return ""
	}
	for _, m := range data.CreativeTeams {
		if m.Role == "作者" || m.Role == "原著" || m.Role == "编剧" {
			return m.NickName
		}
	}
	return ""
}

// ==================== 文本清洗 ====================

func cleanBookTitle(title string) string {
	if title == "" {
		return ""
	}
	parts := SplitBySeparators(title)
	if len(parts) > 0 {
		return strings.TrimSpace(parts[0])
	}
	return strings.TrimSpace(title)
}

func extractAuthorFromFullTitle(fullTitle string) string {
	if fullTitle == "" {
		return ""
	}

	parts := SplitBySeparators(fullTitle)
	if len(parts) < 2 {
		return ""
	}

	second := strings.TrimSpace(parts[1])
	if second == "" {
		return ""
	}

	runes := []rune(second)
	if len(runes) < 2 {
		return ""
	}

	authorEnd := 0
	for i, r := range runes {
		if r >= 0x4e00 && r <= 0x9fff {
			authorEnd = i + 1
		} else {
			break
		}
	}

	if authorEnd < 2 {
		return ""
	}

	if authorEnd > 4 {
		authorEnd = 2
	}

	return string(runes[:authorEnd])
}

func SplitBySeparators(s string) []string {
	return strings.FieldsFunc(s, func(r rune) bool {
		switch r {
		case '|', '丨', '｜', '│', '┃', '∣', '║', '❘':
			return true
		}
		return false
	})
}

func cleanDescription(html string) string {
	if html == "" {
		return ""
	}
	desc := regexp.MustCompile(`<br\s*/?>`).ReplaceAllString(html, "\n")
	desc = regexp.MustCompile(`<p[^>]*>`).ReplaceAllString(desc, "\n")
	desc = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(desc, "")

	lines := strings.Split(desc, "\n")
	stopKeywords := []string{"购买须知", "温馨提示", "版权声明", "加听友群", "联系方式", "主播联系"}
	var filtered []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		cut := false
		for _, kw := range stopKeywords {
			if strings.Contains(trimmed, kw) {
				cut = true
				break
			}
		}
		if cut {
			break
		}
		if regexp.MustCompile(`^\d{5,}$`).MatchString(trimmed) {
			continue
		}
		filtered = append(filtered, trimmed)
	}
	return strings.Join(filtered, "\n")
}

func normalizeCoverURL(rawURL string) string {
	if rawURL == "" {
		return ""
	}
	u := strings.Replace(rawURL, "!op_type=3&columns=290&rows=290&magick=png", "", 1)

	if strings.HasPrefix(u, "https://") {
		return u
	}
	if strings.HasPrefix(u, "http://") {
		return "https://" + u[7:]
	}
	if strings.HasPrefix(u, "//") {
		return "https:" + u
	}
	return "https://" + u
}

// ==================== xm-sign 签名 ====================

func (s *XimalayaService) getXmSign() string {
	req, err := http.NewRequest("GET", "https://www.ximalaya.com/revision/time", nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Cache-Control", "no-cache")

	resp, err := s.client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return ""
	}

	serverTime := strings.TrimSpace(string(body))
	if serverTime == "" {
		return ""
	}

	hash := md5.Sum([]byte("himalaya-" + serverTime))
	hashStr := hex.EncodeToString(hash[:])

	now := time.Now().UnixMilli()
	randomNum := mathrand.Intn(100)
	return fmt.Sprintf("%s(%d)%s(%d)%d", hashStr, randomNum, serverTime, randomNum, now)
}

// ScrapeByID 通过喜马拉雅专辑ID刮削完整元数据
func (s *XimalayaService) ScrapeByID(albumID int64, saveDir string) (*XimalayaScrapeResult, error) {
	if err := s.ensureDeviceID(); err != nil {
		return nil, fmt.Errorf("设备注册失败: %w", err)
	}
	if err := s.ensureLogin(); err != nil {
		return nil, fmt.Errorf("登录失败: %w", err)
	}

	s.logger.Infof("开始刮削喜马拉雅专辑: id=%d", albumID)

	result, err := s.GetAlbumDetail(albumID)
	if err != nil {
		return nil, fmt.Errorf("获取专辑详情失败: %w", err)
	}

	if result.CoverURL != "" {
		result.CoverURL = normalizeCoverURL(result.CoverURL)
	}

	s.enrichResultFromWebSearch(result)

	tracks, err := s.GetAllTracks(albumID)
	if err != nil {
		s.logger.Warnf("获取声音列表失败: %v，继续刮削", err)
	} else {
		result.Chapters = tracks
	}

	if result.CoverURL != "" && saveDir != "" {
		coverPath, err := s.DownloadCover(result.CoverURL, saveDir)
		if err != nil {
			s.logger.Warnf("下载封面失败: %v", err)
		} else {
			s.logger.Infof("封面已下载: %s", coverPath)
		}
	}

	s.logger.Infof("喜马拉雅刮削完成: %s (id=%d, 章节数=%d)", result.Title, albumID, len(result.Chapters))
	return result, nil
}

// enrichResultFromWebSearch 通过Web搜索API补充元数据（章节数、评分、年份、分类等）
func (s *XimalayaService) enrichResultFromWebSearch(result *XimalayaScrapeResult) {
	keyword := result.Title
	if keyword == "" {
		return
	}

	docs, err := s.webSearchDocs(keyword, 1)
	if err != nil {
		s.logger.Warnf("Web搜索补充元数据失败: %v", err)
		return
	}

	for _, doc := range docs {
		if doc.ID == result.XimalayaID {
			if result.ChapterCount == 0 && doc.Tracks > 0 {
				result.ChapterCount = doc.Tracks
			}
			if result.Rating == 0 && doc.Score > 0 {
				result.Rating = doc.Score
			}
			if result.Year == 0 && doc.CreatedAt > 0 {
				result.Year = time.Unix(doc.CreatedAt/1000, 0).Year()
			}
			if result.Genres == "" && doc.CategoryName != "" {
				result.Genres = doc.CategoryName
			}
			if !result.IsCompleted && doc.IsFinished == 2 {
				result.IsCompleted = true
			}
			if result.ReleaseDate == "" && doc.CreatedAt > 0 {
				result.ReleaseDate = time.Unix(doc.CreatedAt/1000, 0).Format("2006-01-02")
			}
			if result.Author == "" && doc.Title != "" {
				result.Author = extractAuthorFromFullTitle(doc.Title)
			}
			s.logger.Infof("Web搜索补充元数据成功: chapterCount=%d rating=%.1f year=%d genres=%s isCompleted=%v author=%s",
				result.ChapterCount, result.Rating, result.Year, result.Genres, result.IsCompleted, result.Author)
			return
		}
	}

	s.logger.Warnf("Web搜索未找到匹配专辑: id=%d title=%s", result.XimalayaID, keyword)
}

// webSearchDocs 执行Web搜索并返回原始文档列表
func (s *XimalayaService) webSearchDocs(keyword string, page int) ([]ximalayaWebSearchDoc, error) {
	s.randomDelay()

	kw := url.QueryEscape(keyword)
	searchURL := fmt.Sprintf(
		"https://www.ximalaya.com/revision/search?core=album&kw=%s&page=%d&spellchecker=true&rows=20&condition=relation&device=web",
		kw, page,
	)

	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json")
	if xmSign := s.getXmSign(); xmSign != "" {
		req.Header.Set("xm-sign", xmSign)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Web搜索请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取Web搜索响应失败: %w", err)
	}

	var result ximalayaWebSearchResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("解析Web搜索响应失败: %w", err)
	}

	if result.Ret != 200 {
		return nil, fmt.Errorf("Web搜索失败: ret=%d", result.Ret)
	}

	return result.Data.Result.Response.Docs, nil
}

// SearchAndScrape 搜索并刮削第一个匹配结果
func (s *XimalayaService) SearchAndScrape(keyword string, saveDir string) (*XimalayaScrapeResult, error) {
	results, total, err := s.SearchAlbums(keyword, 1, 5)
	if err != nil || len(results) == 0 {
		s.logger.Warnf("移动端搜索 '%s' 失败或无结果 (total=%d)，尝试Web搜索: %v", keyword, total, err)
		results, _, err = s.SearchAlbumsWeb(keyword, 1)
		if err != nil {
			return nil, fmt.Errorf("搜索失败: %w", err)
		}
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("未找到匹配的专辑: %s", keyword)
	}

	best := results[0]
	s.logger.Infof("搜索 '%s' 找到 %d 个结果，使用第一个: %s (id=%d)", keyword, len(results), best.Title, best.AlbumID)

	result := &XimalayaScrapeResult{
		Title:       cleanBookTitle(best.Title),
		Description: best.Description,
		CoverURL:    normalizeCoverURL(best.CoverURL),
		XimalayaID:  best.AlbumID,
		IsCompleted: best.IsCompleted,
		Publisher:   "喜马拉雅",
	}

	if enriched, err := s.enrichAlbumResult(best.AlbumID, result, saveDir); err == nil {
		result = enriched
	} else {
		s.logger.Warnf("丰富专辑元数据失败: %v，使用搜索数据", err)
	}

	s.logger.Infof("喜马拉雅刮削完成: %s (id=%d, 章节数=%d)", result.Title, result.XimalayaID, len(result.Chapters))
	return result, nil
}

func (s *XimalayaService) enrichAlbumResult(albumID int64, base *XimalayaScrapeResult, saveDir string) (*XimalayaScrapeResult, error) {
	if err := s.ensureDeviceID(); err != nil {
		s.logger.Warnf("plant/detail 设备注册失败: %v，使用搜索数据", err)
	} else {
		detail, err := s.getAlbumDetailFromPlant(albumID)
		if err != nil {
			s.logger.Warnf("plant/detail 获取详情失败: %v，使用搜索数据", err)
		} else if detail.Title != "" {
			if detail.Title != base.Title {
				base.Title = detail.Title
			}
			base.Author = detail.Author
			base.Narrator = detail.Narrator
			base.ChapterCount = detail.ChapterCount
			if detail.ReleaseDate != "" {
				base.ReleaseDate = detail.ReleaseDate
			}
			if detail.Year > 0 {
				base.Year = detail.Year
			}
			if detail.Description != "" {
				base.Description = detail.Description
			}
			if detail.CoverURL != "" {
				base.CoverURL = detail.CoverURL
			}
			if detail.Genres != "" {
				base.Genres = detail.Genres
			}
			if detail.IsCompleted {
				base.IsCompleted = true
			}
		}
	}

	if base.CoverURL != "" {
		base.CoverURL = normalizeCoverURL(base.CoverURL)
	}

	s.enrichResultFromWebSearch(base)

	chapters, err := s.GetAllTracks(albumID)
	if err == nil {
		base.Chapters = chapters
	}

	if base.CoverURL != "" && saveDir != "" {
		coverPath, err := s.DownloadCover(base.CoverURL, saveDir)
		if err != nil {
			s.logger.Warnf("下载封面失败: %v", err)
		} else {
			s.logger.Infof("封面已下载: %s", coverPath)
		}
	}

	return base, nil
}
