package service

import (
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/nowen-video/nowen-video/internal/model"
)

const (
	ImageTypePoster    = "poster"
	ImageTypeBackdrop  = "backdrop"
	ImageTypeLandscape = "landscape"
	ImageTypeLogo      = "logo"
	ImageTypeFolder    = "folder"

	maxImageSize = 5 * 1024 * 1024

	maxRedirects = 10
)

var ErrSeriesNotFound = errors.New("series not found")

var imageTypeConfig = map[string]struct {
	defaultExt string
	maxSize    int64
}{
	ImageTypePoster:    {defaultExt: imageExtJPG, maxSize: maxImageSize},
	ImageTypeBackdrop:  {defaultExt: imageExtJPG, maxSize: maxImageSize},
	ImageTypeLandscape: {defaultExt: imageExtJPG, maxSize: maxImageSize},
	ImageTypeLogo:      {defaultExt: imageExtPNG, maxSize: maxImageSize},
	ImageTypeFolder:    {defaultExt: imageExtJPG, maxSize: maxImageSize},
}

func getHTTPClient() *http.Client {
	return &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        10,
			IdleConnTimeout:     30 * time.Second,
			TLSHandshakeTimeout: 10 * time.Second,
			ForceAttemptHTTP2:   false,
			TLSClientConfig: &tls.Config{
				MinVersion:             tls.VersionTLS12,
				MaxVersion:             tls.VersionTLS12,
				SessionTicketsDisabled: true,
				CipherSuites: []uint16{
					tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
					tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
					tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
					tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
				},
			},
		},
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= maxRedirects {
				return fmt.Errorf("too many redirects (%d)", len(via))
			}
			return nil
		},
	}
}

func (s *MetadataService) DownloadTMDbImageForMedia(mediaID string, tmdbPath string, imageType string) (string, error) {
	media, err := s.mediaRepo.FindByID(mediaID)
	if err != nil {
		return "", ErrMediaNotFound
	}
	if media == nil {
		return "", ErrMediaNotFound
	}

	if err := validateImageType(imageType); err != nil {
		return "", err
	}

	oldPath := getMediaImagePath(media, imageType)

	ext := strings.ToLower(filepath.Ext(tmdbPath))
	if ext == "" || !isValidImageFileExt(ext) {
		ext = imageExtJPG
	}
	expectedPath := filepath.Join(filepath.Dir(media.FilePath), imageType+ext)

	if err := s.updateMediaImagePath(media, imageType, expectedPath); err != nil {
		return "", fmt.Errorf("failed to update media record: %w", err)
	}

	var localPath string
	switch imageType {
	case ImageTypePoster:
		localPath, err = s.downloadPoster(media, tmdbPath)
	case ImageTypeBackdrop:
		localPath, err = s.downloadBackdrop(media, tmdbPath)
	case ImageTypeLandscape:
		localPath, err = s.downloadLandscape(media, tmdbPath)
	case ImageTypeLogo:
		localPath, err = s.downloadLogo(media, tmdbPath)
	case ImageTypeFolder:
		localPath, err = s.downloadFolder(media, tmdbPath)
	}

	if err != nil {
		if rollbackErr := s.updateMediaImagePath(media, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback media image path: %v", rollbackErr)
		}
		return "", fmt.Errorf("failed to download image: %w", err)
	}

	if localPath != "" && localPath != expectedPath {
		if err := s.updateMediaImagePath(media, imageType, localPath); err != nil {
			s.logger.Errorf("failed to update media image path after cache fallback: %v", err)
		}
	}

	return localPath, nil
}

func (s *MetadataService) DownloadTMDbImageForSeries(seriesID string, tmdbPath string, imageType string) (string, error) {
	series, err := s.seriesRepo.FindByID(seriesID)
	if err != nil {
		return "", ErrSeriesNotFound
	}
	if series == nil {
		return "", ErrSeriesNotFound
	}

	if err := validateImageType(imageType); err != nil {
		return "", err
	}

	return s.downloadTMDbImageForSeries(series, tmdbPath, imageType)
}

func (s *MetadataService) downloadTMDbImageForSeries(series *model.Series, tmdbPath, imageType string) (string, error) {
	if tmdbPath == "" {
		return "", fmt.Errorf("image path is empty")
	}

	imageURL := fmt.Sprintf("%s/t/p/%s%s", s.getTMDbImageBase(), getImageSize(imageType), tmdbPath)

	ext := strings.ToLower(filepath.Ext(tmdbPath))
	if ext == "" {
		ext = imageTypeConfig[imageType].defaultExt
	}

	seriesDir := series.FolderPath
	if seriesDir == "" {
		return "", fmt.Errorf("series folder path is empty")
	}

	if err := os.MkdirAll(seriesDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create series directory: %w", err)
	}

	fileName := imageType + ext
	localPath := filepath.Join(seriesDir, fileName)

	if info, err := os.Stat(localPath); err == nil && info.Size() > MinImageFileSize {
		s.logger.Debugf("image already exists, skipping download: %s", localPath)
		if err := s.updateSeriesImagePath(series, imageType, localPath); err != nil {
			return "", err
		}
		return localPath, nil
	}

	oldPath := getSeriesImagePath(series, imageType)

	if err := s.updateSeriesImagePath(series, imageType, localPath); err != nil {
		return "", fmt.Errorf("failed to update series record: %w", err)
	}

	client := getHTTPClient()

	resp, err := client.Get(imageURL)
	if err != nil {
		if rollbackErr := s.updateSeriesImagePath(series, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback series image path: %v", rollbackErr)
		}
		return "", fmt.Errorf("failed to download image: %w", err)
	}
	defer resp.Body.Close()

	contentType := resp.Header.Get("Content-Type")
	if !isValidImageContentType(contentType) {
		if rollbackErr := s.updateSeriesImagePath(series, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback series image path: %v", rollbackErr)
		}
		return "", fmt.Errorf("invalid content type: %s", contentType)
	}

	tmpPath := localPath + ".tmp"
	file, err := os.Create(tmpPath)
	if err != nil {
		if rollbackErr := s.updateSeriesImagePath(series, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback series image path: %v", rollbackErr)
		}
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer func() {
		file.Close()
		os.Remove(tmpPath)
	}()

	written, err := io.Copy(file, resp.Body)
	if err != nil {
		if rollbackErr := s.updateSeriesImagePath(series, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback series image path: %v", rollbackErr)
		}
		return "", fmt.Errorf("failed to save image: %w", err)
	}

	if written < MinImageFileSize {
		if rollbackErr := s.updateSeriesImagePath(series, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback series image path: %v", rollbackErr)
		}
		return "", fmt.Errorf("downloaded image is too small (%d bytes)", written)
	}

	if err := os.Rename(tmpPath, localPath); err != nil {
		if rollbackErr := s.updateSeriesImagePath(series, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback series image path: %v", rollbackErr)
		}
		return "", fmt.Errorf("failed to rename image file: %w", err)
	}

	s.logger.Debugf("downloaded %s for series %s: %s (%d bytes)", imageType, series.ID, localPath, written)
	return localPath, nil
}

func (s *MetadataService) SaveUploadedImageForMedia(mediaID string, imageData []byte, ext string, imageType string) (string, error) {
	media, err := s.mediaRepo.FindByID(mediaID)
	if err != nil {
		return "", ErrMediaNotFound
	}
	if media == nil {
		return "", ErrMediaNotFound
	}

	return s.saveUploadedImageForMedia(media, imageData, ext, imageType)
}

func (s *MetadataService) saveUploadedImageForMedia(media *model.Media, imageData []byte, ext string, imageType string) (string, error) {
	if err := validateImageType(imageType); err != nil {
		return "", err
	}

	if len(imageData) == 0 {
		return "", fmt.Errorf("image data is empty")
	}

	if len(imageData) > maxImageSize {
		return "", fmt.Errorf("image size exceeds maximum allowed size (%d bytes)", maxImageSize)
	}

	if !isValidImageFileExt(ext) {
		return "", fmt.Errorf("invalid image extension: %s", ext)
	}

	if !isValidImageData(imageData) {
		return "", fmt.Errorf("invalid image content")
	}

	if media.FilePath == "" {
		return "", fmt.Errorf("media file path is empty")
	}

	mediaDir := filepath.Dir(media.FilePath)
	if err := os.MkdirAll(mediaDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create media directory: %w", err)
	}

	fileName := imageType + ext
	localPath := filepath.Join(mediaDir, fileName)

	if _, err := os.Stat(localPath); err == nil {
		if err := backupFile(localPath); err != nil {
			s.logger.Warnf("failed to backup existing image: %v", err)
		}
	}

	oldPath := getMediaImagePath(media, imageType)

	if err := s.updateMediaImagePath(media, imageType, localPath); err != nil {
		return "", fmt.Errorf("failed to update media record: %w", err)
	}

	tmpPath := localPath + ".tmp"
	if err := os.WriteFile(tmpPath, imageData, 0644); err != nil {
		if rollbackErr := s.updateMediaImagePath(media, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback media image path: %v", rollbackErr)
		}
		return "", fmt.Errorf("failed to write image file: %w", err)
	}

	if err := os.Rename(tmpPath, localPath); err != nil {
		if rollbackErr := s.updateMediaImagePath(media, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback media image path: %v", rollbackErr)
		}
		os.Remove(tmpPath)
		return "", fmt.Errorf("failed to rename image file: %w", err)
	}

	s.logger.Debugf("saved uploaded %s for media %s: %s (%d bytes)", imageType, media.ID, localPath, len(imageData))
	return localPath, nil
}

func (s *MetadataService) SaveUploadedImageForSeries(seriesID string, imageData []byte, ext string, imageType string) (string, error) {
	series, err := s.seriesRepo.FindByID(seriesID)
	if err != nil {
		return "", ErrSeriesNotFound
	}
	if series == nil {
		return "", ErrSeriesNotFound
	}

	return s.saveUploadedImageForSeries(series, imageData, ext, imageType)
}

func (s *MetadataService) saveUploadedImageForSeries(series *model.Series, imageData []byte, ext string, imageType string) (string, error) {
	if err := validateImageType(imageType); err != nil {
		return "", err
	}

	if len(imageData) == 0 {
		return "", fmt.Errorf("image data is empty")
	}

	if len(imageData) > maxImageSize {
		return "", fmt.Errorf("image size exceeds maximum allowed size (%d bytes)", maxImageSize)
	}

	if !isValidImageFileExt(ext) {
		return "", fmt.Errorf("invalid image extension: %s", ext)
	}

	if !isValidImageData(imageData) {
		return "", fmt.Errorf("invalid image content")
	}

	if series.FolderPath == "" {
		return "", fmt.Errorf("series folder path is empty")
	}

	seriesDir := series.FolderPath
	if err := os.MkdirAll(seriesDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create series directory: %w", err)
	}

	fileName := imageType + ext
	localPath := filepath.Join(seriesDir, fileName)

	if _, err := os.Stat(localPath); err == nil {
		if err := backupFile(localPath); err != nil {
			s.logger.Warnf("failed to backup existing image: %v", err)
		}
	}

	oldPath := getSeriesImagePath(series, imageType)

	if err := s.updateSeriesImagePath(series, imageType, localPath); err != nil {
		return "", fmt.Errorf("failed to update series record: %w", err)
	}

	tmpPath := localPath + ".tmp"
	if err := os.WriteFile(tmpPath, imageData, 0644); err != nil {
		if rollbackErr := s.updateSeriesImagePath(series, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback series image path: %v", rollbackErr)
		}
		return "", fmt.Errorf("failed to write image file: %w", err)
	}

	if err := os.Rename(tmpPath, localPath); err != nil {
		if rollbackErr := s.updateSeriesImagePath(series, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback series image path: %v", rollbackErr)
		}
		os.Remove(tmpPath)
		return "", fmt.Errorf("failed to rename image file: %w", err)
	}

	s.logger.Debugf("saved uploaded %s for series %s: %s (%d bytes)", imageType, series.ID, localPath, len(imageData))
	return localPath, nil
}

func (s *MetadataService) DownloadURLImageForMedia(mediaID string, imageURL string, imageType string) (string, error) {
	media, err := s.mediaRepo.FindByID(mediaID)
	if err != nil {
		return "", ErrMediaNotFound
	}
	if media == nil {
		return "", ErrMediaNotFound
	}

	return s.downloadURLImageForMedia(media, imageURL, imageType)
}

func (s *MetadataService) downloadURLImageForMedia(media *model.Media, imageURL string, imageType string) (string, error) {
	if err := validateImageType(imageType); err != nil {
		return "", err
	}

	if imageURL == "" {
		return "", fmt.Errorf("image URL is empty")
	}

	if media.FilePath == "" {
		return "", fmt.Errorf("media file path is empty")
	}

	ext := strings.ToLower(filepath.Ext(imageURL))
	if ext == "" || !isValidImageFileExt(ext) {
		ext = imageTypeConfig[imageType].defaultExt
	}

	mediaDir := filepath.Dir(media.FilePath)
	if err := os.MkdirAll(mediaDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create media directory: %w", err)
	}

	fileName := imageType + ext
	localPath := filepath.Join(mediaDir, fileName)

	if _, err := os.Stat(localPath); err == nil {
		if err := backupFile(localPath); err != nil {
			s.logger.Warnf("failed to backup existing image: %v", err)
		}
	}

	oldPath := getMediaImagePath(media, imageType)

	client := getHTTPClient()

	resp, err := client.Get(imageURL)
	if err != nil {
		return "", fmt.Errorf("failed to download image: %w", err)
	}
	defer resp.Body.Close()

	contentType := resp.Header.Get("Content-Type")
	if !isValidImageContentType(contentType) {
		return "", fmt.Errorf("invalid content type: %s", contentType)
	}

	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read image data: %w", err)
	}

	if len(imageData) < MinImageFileSize {
		return "", fmt.Errorf("downloaded image is too small (%d bytes)", len(imageData))
	}

	if len(imageData) > maxImageSize {
		return "", fmt.Errorf("image size exceeds maximum allowed size (%d bytes)", maxImageSize)
	}

	if !isValidImageData(imageData) {
		return "", fmt.Errorf("invalid image content")
	}

	if err := s.updateMediaImagePath(media, imageType, localPath); err != nil {
		return "", fmt.Errorf("failed to update media record: %w", err)
	}

	tmpPath := localPath + ".tmp"
	if err := os.WriteFile(tmpPath, imageData, 0644); err != nil {
		if rollbackErr := s.updateMediaImagePath(media, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback media image path: %v", rollbackErr)
		}
		return "", fmt.Errorf("failed to write image file: %w", err)
	}

	if err := os.Rename(tmpPath, localPath); err != nil {
		if rollbackErr := s.updateMediaImagePath(media, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback media image path: %v", rollbackErr)
		}
		os.Remove(tmpPath)
		return "", fmt.Errorf("failed to rename image file: %w", err)
	}

	s.logger.Debugf("downloaded %s from URL for media %s: %s (%d bytes)", imageType, media.ID, localPath, len(imageData))
	return localPath, nil
}

func (s *MetadataService) DownloadURLImageForSeries(seriesID string, imageURL string, imageType string) (string, error) {
	series, err := s.seriesRepo.FindByID(seriesID)
	if err != nil {
		return "", ErrSeriesNotFound
	}
	if series == nil {
		return "", ErrSeriesNotFound
	}

	return s.downloadURLImageForSeries(series, imageURL, imageType)
}

func (s *MetadataService) downloadURLImageForSeries(series *model.Series, imageURL string, imageType string) (string, error) {
	if err := validateImageType(imageType); err != nil {
		return "", err
	}

	if imageURL == "" {
		return "", fmt.Errorf("image URL is empty")
	}

	if series.FolderPath == "" {
		return "", fmt.Errorf("series folder path is empty")
	}

	ext := strings.ToLower(filepath.Ext(imageURL))
	if ext == "" || !isValidImageFileExt(ext) {
		ext = imageTypeConfig[imageType].defaultExt
	}

	seriesDir := series.FolderPath
	if err := os.MkdirAll(seriesDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create series directory: %w", err)
	}

	fileName := imageType + ext
	localPath := filepath.Join(seriesDir, fileName)

	if _, err := os.Stat(localPath); err == nil {
		if err := backupFile(localPath); err != nil {
			s.logger.Warnf("failed to backup existing image: %v", err)
		}
	}

	oldPath := getSeriesImagePath(series, imageType)

	client := getHTTPClient()

	resp, err := client.Get(imageURL)
	if err != nil {
		return "", fmt.Errorf("failed to download image: %w", err)
	}
	defer resp.Body.Close()

	contentType := resp.Header.Get("Content-Type")
	if !isValidImageContentType(contentType) {
		return "", fmt.Errorf("invalid content type: %s", contentType)
	}

	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read image data: %w", err)
	}

	if len(imageData) < MinImageFileSize {
		return "", fmt.Errorf("downloaded image is too small (%d bytes)", len(imageData))
	}

	if len(imageData) > maxImageSize {
		return "", fmt.Errorf("image size exceeds maximum allowed size (%d bytes)", maxImageSize)
	}

	if !isValidImageData(imageData) {
		return "", fmt.Errorf("invalid image content")
	}

	if err := s.updateSeriesImagePath(series, imageType, localPath); err != nil {
		return "", fmt.Errorf("failed to update series record: %w", err)
	}

	tmpPath := localPath + ".tmp"
	if err := os.WriteFile(tmpPath, imageData, 0644); err != nil {
		if rollbackErr := s.updateSeriesImagePath(series, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback series image path: %v", rollbackErr)
		}
		return "", fmt.Errorf("failed to write image file: %w", err)
	}

	if err := os.Rename(tmpPath, localPath); err != nil {
		if rollbackErr := s.updateSeriesImagePath(series, imageType, oldPath); rollbackErr != nil {
			s.logger.Errorf("failed to rollback series image path: %v", rollbackErr)
		}
		os.Remove(tmpPath)
		return "", fmt.Errorf("failed to rename image file: %w", err)
	}

	s.logger.Debugf("downloaded %s from URL for series %s: %s (%d bytes)", imageType, series.ID, localPath, len(imageData))
	return localPath, nil
}

func getMediaImagePath(media *model.Media, imageType string) string {
	switch imageType {
	case ImageTypePoster:
		return media.PosterPath
	case ImageTypeBackdrop:
		return media.BackdropPath
	case ImageTypeLandscape:
		return media.LandscapePath
	case ImageTypeLogo:
		return media.LogoPath
	case ImageTypeFolder:
		return media.FolderPath
	default:
		return ""
	}
}

func getSeriesImagePath(series *model.Series, imageType string) string {
	switch imageType {
	case ImageTypePoster:
		return series.PosterPath
	case ImageTypeBackdrop:
		return series.BackdropPath
	default:
		return ""
	}
}

func (s *MetadataService) updateMediaImagePath(media *model.Media, imageType, localPath string) error {
	switch imageType {
	case ImageTypePoster:
		media.PosterPath = localPath
	case ImageTypeBackdrop:
		media.BackdropPath = localPath
	case ImageTypeLandscape:
		media.LandscapePath = localPath
	case ImageTypeLogo:
		media.LogoPath = localPath
	case ImageTypeFolder:
		media.FolderPath = localPath
	default:
		return fmt.Errorf("unsupported image type: %s", imageType)
	}
	return s.mediaRepo.Update(media)
}

func (s *MetadataService) updateSeriesImagePath(series *model.Series, imageType, localPath string) error {
	switch imageType {
	case ImageTypePoster:
		series.PosterPath = localPath
	case ImageTypeBackdrop:
		series.BackdropPath = localPath
	default:
		return fmt.Errorf("unsupported image type: %s", imageType)
	}
	return s.seriesRepo.Update(series)
}

func validateImageType(imageType string) error {
	if _, ok := imageTypeConfig[imageType]; !ok {
		return fmt.Errorf("unsupported image type: %s", imageType)
	}
	return nil
}

func backupFile(filePath string) error {
	backupPath := filePath + ".bak" + time.Now().Format("20060102150405")
	data, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}
	return os.WriteFile(backupPath, data, 0644)
}

func getImageSize(imageType string) string {
	switch imageType {
	case ImageTypePoster:
		return ImageSizePoster
	case ImageTypeBackdrop, ImageTypeLandscape:
		return ImageSizeBackdrop
	case ImageTypeLogo:
		return ImageSizeLogo
	case ImageTypeFolder:
		return ImageSizeFolder
	default:
		return ImageSizePoster
	}
}
