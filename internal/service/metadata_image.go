package service

import (
	"bytes"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/nowen-video/nowen-video/internal/model"
)

const (
	ImageSizePoster    = "w780"
	ImageSizeBackdrop  = "w1280"
	ImageSizeLandscape = "w1280"
	ImageSizeLogo      = "w500"
	ImageSizeFolder    = "w780"
	MinImageFileSize   = 1024

	imageExtJPG  = ".jpg"
	imageExtJPEG = ".jpeg"
	imageExtPNG  = ".png"
	imageExtWEBP = ".webp"

	maxImageDownloadSize = 10 * 1024 * 1024

	dirPerm  = 0755
	filePerm = 0644
)

var personDownloadLocks sync.Map

func (s *MetadataService) downloadPoster(media *model.Media, tmdbPath string) (string, error) {
	return s.downloadImage(media, tmdbPath, "poster", ImageSizePoster)
}

func (s *MetadataService) downloadBackdrop(media *model.Media, tmdbPath string) (string, error) {
	return s.downloadImage(media, tmdbPath, "backdrop", ImageSizeBackdrop)
}

func (s *MetadataService) downloadLandscape(media *model.Media, tmdbPath string) (string, error) {
	return s.downloadImage(media, tmdbPath, "landscape", ImageSizeLandscape)
}

func (s *MetadataService) downloadLogo(media *model.Media, tmdbPath string) (string, error) {
	return s.downloadImage(media, tmdbPath, "logo", ImageSizeLogo)
}

func (s *MetadataService) downloadSeriesLogo(series *model.Series, tmdbPath string) (string, error) {
	if tmdbPath == "" {
		return "", fmt.Errorf("Logo路径为空")
	}
	if strings.Contains(tmdbPath, "..") {
		return "", fmt.Errorf("Logo路径包含非法字符")
	}

	ext := strings.ToLower(filepath.Ext(tmdbPath))
	if ext == "" || !isValidImageFileExt(ext) {
		ext = imageExtPNG // Logo 通常是 PNG
	}

	localPath := filepath.Join(series.FolderPath, "logo"+ext)

	if isExistingImageValid(s, localPath) {
		s.logger.Debugf("剧集Logo已存在且有效，跳过下载: %s", localPath)
		return localPath, nil
	}

	if err := downloadAndSaveImage(s, s.buildTMDbImageURLs(tmdbPath, ImageSizeLogo), localPath); err != nil {
		return "", err
	}
	return localPath, nil
}

func (s *MetadataService) downloadFolder(media *model.Media, tmdbPath string) (string, error) {
	return s.downloadImage(media, tmdbPath, "folder", ImageSizeFolder)
}

// downloadImage 下载TMDb图片到媒体目录，含路径校验、并发锁、完整性检查
func (s *MetadataService) downloadImage(media *model.Media, tmdbPath, imageType, size string) (string, error) {
	if tmdbPath == "" {
		return "", fmt.Errorf("图片路径为空")
	}
	if strings.Contains(tmdbPath, "..") {
		return "", fmt.Errorf("图片路径包含非法字符")
	}

	ext := strings.ToLower(filepath.Ext(tmdbPath))
	if ext == "" || !isValidImageFileExt(ext) {
		ext = imageExtJPG
	}

	mediaDir := filepath.Dir(media.FilePath)
	if media.MediaType == "episode" {
		mediaDir = filepath.Dir(mediaDir)
	}
	localPath := filepath.Join(mediaDir, imageType+ext)
	if err := os.MkdirAll(mediaDir, dirPerm); err != nil {
		s.logger.Errorf("创建图片目录失败: %v", err)
	}

	if isExistingImageValid(s, localPath) {
		s.logger.Debugf("图片已存在且有效，跳过下载: %s", localPath)
		return localPath, nil
	}

	s.getMediaLock(media.ID).Lock()
	defer s.getMediaLock(media.ID).Unlock()

	if isExistingImageValid(s, localPath) {
		return localPath, nil
	}

	if err := downloadAndSaveImage(s, s.buildTMDbImageURLs(tmdbPath, size), localPath); err != nil {
		cacheDir := filepath.Join(s.cfg.Cache.CacheDir, "images", media.ID)
		if mkdirErr := os.MkdirAll(cacheDir, dirPerm); mkdirErr != nil {
			s.logger.Errorf("创建缓存目录失败: %v", mkdirErr)
			return "", fmt.Errorf("下载图片失败: %w", err)
		}
		fallbackPath := filepath.Join(cacheDir, imageType+ext)
		if err := downloadAndSaveImage(s, s.buildTMDbImageURLs(tmdbPath, size), fallbackPath); err != nil {
			s.logger.Errorf("下载图片到缓存目录也失败: %v", err)
			return "", fmt.Errorf("下载图片失败: %w", err)
		}
		localPath = fallbackPath
	}

	s.logger.Debugf("已下载%s: %s", imageType, localPath)
	return localPath, nil
}

func downloadAndSaveImage(s *MetadataService, imageURLs []string, localPath string) error {
	if len(imageURLs) == 0 {
		return fmt.Errorf("没有可用的图片URL")
	}

	var lastErr error
	for i, imageURL := range imageURLs {
		if i > 0 {
			s.logger.Debugf("回退到备选URL: %s", imageURL)
		}
		err := tryDownloadAndSave(s, imageURL, localPath)
		if err == nil {
			return nil
		}
		s.logger.Debugf("URL下载失败(%d/%d): %s - %v", i+1, len(imageURLs), imageURL, err)
		lastErr = err
	}
	return fmt.Errorf("所有URL下载均失败: %w", lastErr)
}

func tryDownloadAndSave(s *MetadataService, imageURL, localPath string) error {
	req, err := http.NewRequest("GET", imageURL, nil)
	if err != nil {
		return fmt.Errorf("创建图片请求失败: %w", err)
	}
	ua := getRandomUserAgent()
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/*,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Referer", "https://www.themoviedb.org/")
	req.Header.Set("Sec-Fetch-Dest", "image")
	req.Header.Set("Sec-Fetch-Mode", "no-cors")
	req.Header.Set("Sec-Fetch-Site", "cross-site")

	s.logger.Debugf("下载图片: %s (UA: %s)", imageURL, ua[:50])

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("下载图片失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		s.logger.Warnf("图片服务返回非200: %s -> HTTP %d (Content-Type: %s)", imageURL, resp.StatusCode, resp.Header.Get("Content-Type"))
		return fmt.Errorf("图片服务返回 HTTP %d (%s)", resp.StatusCode, imageURL)
	}

	if !isValidImageContentType(resp.Header.Get("Content-Type")) {
		return fmt.Errorf("响应内容不是图片 (Content-Type: %s)", resp.Header.Get("Content-Type"))
	}

	tmpPath := localPath + ".tmp"
	file, err := os.OpenFile(tmpPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, filePerm)
	if err != nil {
		return fmt.Errorf("创建临时文件失败: %w", err)
	}

	written, copyErr := io.Copy(file, io.LimitReader(resp.Body, maxImageDownloadSize+1))
	closeErr := file.Close()

	if copyErr != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("保存图片失败: %w", copyErr)
	}
	if closeErr != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("关闭临时文件失败: %w", closeErr)
	}

	if written > maxImageDownloadSize {
		os.Remove(tmpPath)
		return fmt.Errorf("图片过大 (%d bytes)", written)
	}
	if written < MinImageFileSize {
		os.Remove(tmpPath)
		return fmt.Errorf("下载的图片文件过小 (%d 字节)", written)
	}

	if !isValidImageFile(tmpPath) {
		os.Remove(tmpPath)
		return fmt.Errorf("下载的文件不是有效图片")
	}

	if err := os.Rename(tmpPath, localPath); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("重命名图片文件失败: %w", err)
	}

	return nil
}

// isExistingImageValid 通过文件大小和图片头部校验检查已有文件完整性
func isExistingImageValid(s *MetadataService, localPath string) bool {
	info, err := os.Stat(localPath)
	if err != nil {
		return false
	}
	if info.Size() < MinImageFileSize {
		s.logger.Warnf("已存在的图片文件过小 (%d 字节)，将重新下载: %s", info.Size(), localPath)
		return false
	}
	if !isValidImageFile(localPath) {
		s.logger.Warnf("已存在的图片文件损坏，将重新下载: %s", localPath)
		return false
	}
	return true
}

// isValidImageFile 通过解码文件内容校验文件是否为有效图片
// Go 标准库 image.Decode 不支持 SVG/WebP，TMDB Logo 常以这两种格式提供
func isValidImageFile(filePath string) bool {
	f, err := os.Open(filePath)
	if err != nil {
		return false
	}
	defer f.Close()

	// SVG 和 WebP 需要独立校验（image.Decode 不支持）
	if isSVGFileByReader(f) {
		return true
	}
	// 重置文件指针
	if _, err := f.Seek(0, 0); err != nil {
		return false
	}
	if isWebPFileByReader(f) {
		return true
	}
	if _, err := f.Seek(0, 0); err != nil {
		return false
	}

	_, _, err = image.Decode(f)
	return err == nil
}

// isSVGFileByReader 通过已打开的文件判断是否为 SVG
func isSVGFileByReader(f *os.File) bool {
	head := make([]byte, 256)
	n, _ := f.Read(head)
	if n > 0 {
		s := strings.TrimLeft(string(head[:n]), " \t\r\n")
		return strings.HasPrefix(s, "<svg") ||
			strings.HasPrefix(s, "<?xml") ||
			strings.HasPrefix(s, "<!DOCTYPE svg")
	}
	return false
}

// isWebPFileByReader 通过 RIFF/WEBP 魔数判断是否为 WebP
func isWebPFileByReader(f *os.File) bool {
	head := make([]byte, 12)
	n, _ := f.Read(head)
	if n >= 12 {
		return string(head[0:4]) == "RIFF" && string(head[8:12]) == "WEBP"
	}
	return false
}

// downloadToFile 下载URL到指定文件（供 metadata_provider.go 的 mkdirAndDownload 调用）
func (s *MetadataService) downloadToFile(url, filePath string) error {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("创建图片请求失败: %w", err)
	}
	req.Header.Set("User-Agent", getRandomUserAgent())
	req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/*,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
	req.Header.Set("Referer", "https://www.themoviedb.org/")
	req.Header.Set("Sec-Fetch-Dest", "image")
	req.Header.Set("Sec-Fetch-Mode", "no-cors")
	req.Header.Set("Sec-Fetch-Site", "cross-site")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("下载图片失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	if !isValidImageContentType(resp.Header.Get("Content-Type")) {
		return fmt.Errorf("响应内容不是图片 (Content-Type: %s)", resp.Header.Get("Content-Type"))
	}

	tmpPath := filePath + ".tmp"
	file, err := os.OpenFile(tmpPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, filePerm)
	if err != nil {
		return fmt.Errorf("创建临时文件失败: %w", err)
	}

	written, copyErr := io.Copy(file, io.LimitReader(resp.Body, maxImageDownloadSize+1))
	closeErr := file.Close()

	if copyErr != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("保存文件失败: %w", copyErr)
	}
	if closeErr != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("关闭临时文件失败: %w", closeErr)
	}

	if written > maxImageDownloadSize {
		os.Remove(tmpPath)
		return fmt.Errorf("图片过大 (%d bytes)", written)
	}
	if written < MinImageFileSize {
		os.Remove(tmpPath)
		return fmt.Errorf("图片文件过小 (%d 字节)", written)
	}

	if !isValidImageFile(tmpPath) {
		os.Remove(tmpPath)
		return fmt.Errorf("文件不是有效图片")
	}

	if err := os.Rename(tmpPath, filePath); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("重命名文件失败: %w", err)
	}

	return nil
}

// downloadPersonProfile 下载演员头像，含WebDAV路径防护、并发锁、完整性校验
func (s *MetadataService) downloadPersonProfile(person *model.Person, tmdbProfilePath string) {
	if tmdbProfilePath == "" {
		return
	}

	if IsWebDAVPath(tmdbProfilePath) {
		return
	}

	profileDir := filepath.Join(s.cfg.Cache.CacheDir, "people")
	if err := os.MkdirAll(profileDir, dirPerm); err != nil {
		s.logger.Errorf("创建演员头像目录失败: %v", err)
		return
	}

	ext := strings.ToLower(filepath.Ext(tmdbProfilePath))
	if ext == "" || !isValidImageFileExt(ext) {
		ext = imageExtJPG
	}

	localPath := filepath.Join(profileDir, fmt.Sprintf("%d%s", person.TMDbID, ext))

	if isExistingImageValid(s, localPath) {
		if person.ProfileURL != localPath {
			person.ProfileURL = localPath
			if err := s.personRepo.Update(person); err != nil {
				s.logger.Errorf("更新演员头像路径失败: %v", err)
			}
		}
		return
	}

	key := fmt.Sprintf("person-%d", person.TMDbID)
	mu, _ := personDownloadLocks.LoadOrStore(key, &sync.Mutex{})
	mu.(*sync.Mutex).Lock()
	defer func() {
		mu.(*sync.Mutex).Unlock()
		personDownloadLocks.Delete(key)
	}()

	if isExistingImageValid(s, localPath) {
		if person.ProfileURL != localPath {
			person.ProfileURL = localPath
			if err := s.personRepo.Update(person); err != nil {
				s.logger.Errorf("更新演员头像路径失败: %v", err)
			}
		}
		return
	}

	if err := downloadAndSaveImage(s, s.buildTMDbImageURLs(tmdbProfilePath, ImageSizePoster), localPath); err != nil {
		s.logger.Errorf("下载演员头像失败: %s - %v", person.Name, err)
		return
	}

	person.ProfileURL = localPath
	if err := s.personRepo.Update(person); err != nil {
		s.logger.Errorf("更新演员头像路径失败: %v", err)
	}
}

func isValidImageFileExt(ext string) bool {
	ext = strings.ToLower(ext)
	switch ext {
	case imageExtJPG, imageExtJPEG, imageExtPNG, imageExtWEBP, ".svg":
		return true
	default:
		return false
	}
}

func isValidImageContentType(contentType string) bool {
	lower := strings.ToLower(contentType)
	if strings.HasPrefix(lower, "image/") {
		return true
	}
	if lower == "application/octet-stream" {
		return true
	}
	return false
}

// isValidImageData 内部校验字节数组是否为有效图片（供上传模块使用）
func isValidImageData(data []byte) bool {
	_, _, err := image.Decode(bytes.NewReader(data))
	return err == nil
}

// TryLoadPersonProfile 按需加载人物头像：若本地已存在则直接返回路径，否则从 TMDb 拉取并下载。
// 返回本地头像文件路径，若所有途径都失败则返回空字符串。
func (s *MetadataService) TryLoadPersonProfile(person *model.Person) string {
	if person.ProfileURL != "" {
		if _, err := os.Stat(person.ProfileURL); err == nil {
			return person.ProfileURL
		}
	}

	if person.TMDbID <= 0 {
		return ""
	}

	detail, err := s.GetTMDbPersonDetail(person.TMDbID)
	if err != nil {
		s.logger.Warnf("按需获取人物头像失败,tmdbID=%d,name=%s: %v", person.TMDbID, person.Name, err)
		return ""
	}

	if detail.ProfilePath == "" {
		return ""
	}

	s.downloadPersonProfile(person, detail.ProfilePath)

	return person.ProfileURL
}
