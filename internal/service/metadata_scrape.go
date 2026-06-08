package service

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/nowen-video/nowen-video/internal/model"
)

// 刮削状态常量
const (
	ScrapeStatusScraped  = "scraped"
	ScrapeStatusPartial  = "partial"
	ScrapeStatusFailed   = "failed"
	ScrapeStatusManual   = "manual"
	DefaultWorkerCount   = 3
	FailedRetryInterval  = 24 * time.Hour
	PartialRetryInterval = 7 * 24 * time.Hour
)

// ScrapeMedia 刮削单个媒体的元数据
func (s *MetadataService) ScrapeMedia(mediaID string) error {
	media, err := s.mediaRepo.FindByID(mediaID)
	if err != nil {
		return ErrMediaNotFound
	}

	s.logger.Infof("开始刮削元数据: [%s] %s", mediaID, media.Title)

	s.logScrapeEvent(model.LogLevelInfo, mediaID, media.Title, "开始刮削元数据: "+media.Title, "")

	now := time.Now()
	media.ScrapeAttempts++
	media.LastScrapeAt = &now

	if media.IMDbID != "" && media.TMDbID == 0 {
		s.logger.Infof("[%s] 检测到 IMDbID=%s，通过 TMDb Find API 转换", mediaID, media.IMDbID)
		tmdbID, mediaType, err := s.ConvertIMDbToTMDbID(media.IMDbID)
		if err == nil {
			media.TMDbID = tmdbID
			if mediaType == "tv" && media.MediaType == "movie" {
				media.MediaType = "episode"
			}
			s.logger.Infof("[%s] IMDB ID %s -> TMDb ID %d (%s)", mediaID, media.IMDbID, tmdbID, mediaType)
		} else {
			s.logger.Infof("[%s] IMDB ID %s 转换失败，回退到搜索模式: %v", mediaID, media.IMDbID, err)
		}
	}

	s.saveMediaRetryTracking(mediaID, media.ScrapeAttempts, media.LastScrapeAt, media.TMDbID, media.MediaType)

	if media.TMDbID > 0 && media.Overview == "" {
		s.logger.Infof("[%s] 检测到 TMDbID=%d，直接使用 ID 刮削", mediaID, media.TMDbID)
		err := s.scrapeByTMDbIDDirect(media)
		if err != nil {
			s.logScrapeEvent(model.LogLevelWarn, mediaID, media.Title, "刮削失败: "+media.Title, err.Error())
		} else {
			s.logScrapeEvent(model.LogLevelInfo, mediaID, media.Title, "刮削成功: "+media.Title, "")
		}
		return err
	}

	searchTitle, year := s.parseTitle(media.Title)
	if year == 0 && media.Year > 0 {
		year = media.Year
	}

	if s.providerChain != nil {
		err := s.scrapeWithProviderChain(media, searchTitle, year)
		if err != nil {
			s.logScrapeEvent(model.LogLevelWarn, mediaID, media.Title, "刮削失败: "+media.Title, err.Error())
		} else {
			s.logScrapeEvent(model.LogLevelInfo, mediaID, media.Title, "刮削成功: "+media.Title, "")
		}
		return err
	}

	s.logScrapeEvent(model.LogLevelWarn, mediaID, media.Title, "刮削失败: "+media.Title, "无可用数据源")
	return fmt.Errorf("无可用数据源（ProviderChain 未初始化），请配置至少一个元数据刮削源")
}

var mediaImageTypes = []string{"poster", "backdrop", "logo", "landscape"}
var mediaImageExts = []string{".jpg", ".jpeg", ".png", ".webp"}

func (s *MetadataService) deleteMediaImageFiles(media *model.Media) int {
	if media.FilePath == "" {
		return 0
	}
	mediaDir := filepath.Dir(media.FilePath)
	deleted := 0

	for _, imgType := range mediaImageTypes {
		for _, ext := range mediaImageExts {
			localPath := filepath.Join(mediaDir, imgType+ext)
			if err := os.Remove(localPath); err == nil {
				s.logger.Debugf("已删除图片: %s", localPath)
				deleted++
			}
		}
	}

	videoExt := filepath.Ext(media.FilePath)
	thumbPath := strings.TrimSuffix(media.FilePath, videoExt) + "-thumb.jpg"
	if err := os.Remove(thumbPath); err == nil {
		s.logger.Debugf("已删除剧照: %s", thumbPath)
		deleted++
	}
	if err := os.Remove(thumbPath + ".webp"); err == nil {
		s.logger.Debugf("已删除剧照: %s", thumbPath+".webp")
		deleted++
	}

	return deleted
}

func (s *MetadataService) ScrapeMediaWithReplace(mediaID string, replaceImages bool) error {
	if replaceImages {
		media, err := s.mediaRepo.FindByID(mediaID)
		if err != nil {
			return ErrMediaNotFound
		}
		count := s.deleteMediaImageFiles(media)
		if count > 0 {
			s.logger.Infof("[%s] 已删除 %d 个已有图片，将重新下载", mediaID, count)
		}
	}
	return s.ScrapeMedia(mediaID)
}

func (s *MetadataService) ScrapeMediaWithMode(mediaID string, replaceImages bool, mode string) error {
	if mode == "fill_missing" {
		media, err := s.mediaRepo.FindByID(mediaID)
		if err != nil {
			return ErrMediaNotFound
		}
		if media.ScrapeStatus == ScrapeStatusManual {
			s.logger.Infof("[%s] %s 为手动锁定条目，跳过刮削", mediaID, media.Title)
			return nil
		}
		if media.ScrapeStatus == ScrapeStatusScraped &&
			media.Overview != "" && media.PosterPath != "" && media.Rating > 0 &&
			media.Genres != "" && media.Year > 0 {
			s.logger.Infof("[%s] %s 元数据已完整，跳过刮削", mediaID, media.Title)
			return nil
		}
	}
	return s.ScrapeMediaWithReplace(mediaID, replaceImages)
}

func (s *MetadataService) saveMediaRetryTracking(mediaID string, attempts int, lastScrapeAt *time.Time, tmdbID int, mediaType string) {
	fields := map[string]interface{}{
		"scrape_attempts": attempts,
		"last_scrape_at":  lastScrapeAt,
	}
	if tmdbID > 0 {
		fields["tmdb_id"] = tmdbID
		fields["media_type"] = mediaType
	}
	if err := s.mediaRepo.UpdateFields(mediaID, fields); err != nil {
		s.logger.Warnf("[%s] 保存刮削跟踪字段失败: %v", mediaID, err)
	}
}

// scrapeByTMDbIDDirect 通过 TMDb ID 直接刮削
func (s *MetadataService) scrapeByTMDbIDDirect(media *model.Media) error {
	var idErr error
	if media.MediaType == "movie" {
		idErr = s.scrapeMovieByTMDbID(media, media.TMDbID)
	} else {
		idErr = s.scrapeTVByTMDbID(media, media.TMDbID)
	}

	if idErr == nil {
		if s.providerChain != nil {
			searchTitle, year := s.parseTitle(media.Title)
			if year == 0 && media.Year > 0 {
				year = media.Year
			}
			s.providerChain.ScrapeMediaSupplements(media, searchTitle, year)
		}

		if media.PosterPath == "" {
			media.ScrapeStatus = ScrapeStatusPartial
		} else {
			media.ScrapeStatus = ScrapeStatusScraped
		}
		if saveErr := s.mediaRepo.Update(media); saveErr != nil {
			s.logger.Errorf("[%s] 保存元数据失败: %v", media.ID, saveErr)
			return saveErr
		}
		s.writeNFOAfterScrape(media)
		s.logger.Infof("[%s] TMDb ID 直连刮削成功 (status=%s)", media.ID, media.ScrapeStatus)
		randomDelay(int(ScrapeDelayMin.Milliseconds()), int(ScrapeDelayMax.Milliseconds()))
		return nil
	}

	s.mediaRepo.UpdateFields(media.ID, map[string]interface{}{"scrape_status": ScrapeStatusFailed})
	s.logger.Warnf("[%s] TMDb ID 直连刮削失败: %v", media.ID, idErr)
	return idErr
}

// scrapeWithProviderChain 使用 ProviderChain 刮削
func (s *MetadataService) scrapeWithProviderChain(media *model.Media, searchTitle string, year int) error {
	err := s.providerChain.ScrapeMedia(media, searchTitle, year)
	if err != nil {
		s.mediaRepo.UpdateFields(media.ID, map[string]interface{}{"scrape_status": ScrapeStatusFailed})
		s.logger.Warnf("[%s] 多数据源调度链刮削失败: %v", media.ID, err)
		return err
	}

	finalStatus := ScrapeStatusScraped
	if media.PosterPath == "" {
		finalStatus = ScrapeStatusPartial
	}
	media.ScrapeStatus = finalStatus

	if saveErr := s.mediaRepo.Update(media); saveErr != nil {
		s.logger.Errorf("[%s] 保存元数据失败: %v", media.ID, saveErr)
		return saveErr
	}

	s.writeNFOAfterScrape(media)
	s.logger.Infof("[%s] 元数据刮削完成 (多数据源, status=%s)", media.ID, finalStatus)
	randomDelay(int(ScrapeDelayMin.Milliseconds()), int(ScrapeDelayMax.Milliseconds()))
	return nil
}

// ScrapeLibrary 为整个媒体库刮削元数据
func (s *MetadataService) ScrapeLibrary(libraryID string, mediaList []model.Media, mode string) (int, int) {
	if s.cfg.Secrets.TMDbAPIKey == "" && s.providerChain == nil {
		s.logger.Warn("TMDb API Key未配置且无可用数据源，跳过元数据刮削")
		return 0, 0
	}

	needScrape := s.filterNeedScrape(mediaList, mode)
	if len(needScrape) == 0 {
		return 0, 0
	}

	total := len(needScrape)
	var success int32
	var failed int32
	var processed int32

	s.broadcastScrapeEvent(EventScrapeStarted, &ScrapeProgressData{
		LibraryID: libraryID,
		Total:     total,
		Message:   fmt.Sprintf("开始元数据刮削，共 %d 个媒体待处理", total),
	})

	s.logScrapeEvent(model.LogLevelInfo, "", "", fmt.Sprintf("批量刮削开始: 共 %d 个媒体", total), "")

	workerCount := DefaultWorkerCount
	jobs := make(chan int, total)
	var wg sync.WaitGroup

	for w := 0; w < workerCount; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for idx := range jobs {
				media := needScrape[idx]
				if err := s.ScrapeMedia(media.ID); err != nil {
					s.logger.Warnf("刮削失败: [%s] %s - %v", media.ID, media.Title, err)
					atomic.AddInt32(&failed, 1)
					s.mediaRepo.UpdateFields(media.ID, map[string]interface{}{"scrape_status": ScrapeStatusFailed})
				} else {
					atomic.AddInt32(&success, 1)
				}

				current := int(atomic.AddInt32(&processed, 1))
				s.broadcastScrapeEvent(EventScrapeProgress, &ScrapeProgressData{
					LibraryID:  libraryID,
					Total:      total,
					Current:    current,
					Success:    int(atomic.LoadInt32(&success)),
					Failed:     int(atomic.LoadInt32(&failed)),
					MediaTitle: media.Title,
				})
			}
		}()
	}

	for i := 0; i < total; i++ {
		jobs <- i
	}
	close(jobs)

	wg.Wait()

	s.broadcastScrapeEvent(EventScrapeCompleted, &ScrapeProgressData{
		LibraryID: libraryID,
		Total:     total,
		Current:   int(processed),
		Success:   int(success),
		Failed:    int(failed),
		Message:   fmt.Sprintf("元数据刮削完成，成功 %d，失败 %d", success, failed),
	})

	s.logger.Infof("元数据刮削完成: 成功 %d, 失败 %d (并发 %d workers)", success, failed, workerCount)
	s.logScrapeEvent(model.LogLevelInfo, "", "", fmt.Sprintf("批量刮削完成: 成功 %d, 失败 %d", success, failed), "")
	return int(success), int(failed)
}

// filterNeedScrape 过滤需要刮削的媒体
func (s *MetadataService) filterNeedScrape(mediaList []model.Media, mode string) []model.Media {
	var needScrape []model.Media
	for _, media := range mediaList {
		if media.ScrapeStatus == ScrapeStatusManual {
			continue
		}
		if mode == "overwrite_all" {
			needScrape = append(needScrape, media)
			continue
		}
		if media.Overview == "" || media.PosterPath == "" || media.Rating == 0 || media.Genres == "" || media.Year == 0 {
			if media.ScrapeStatus == ScrapeStatusFailed && media.LastScrapeAt != nil {
				if time.Since(*media.LastScrapeAt) < FailedRetryInterval {
					continue
				}
			}
			if media.ScrapeStatus == ScrapeStatusPartial && media.LastScrapeAt != nil {
				if time.Since(*media.LastScrapeAt) < PartialRetryInterval {
					continue
				}
			}
			needScrape = append(needScrape, media)
		}
	}
	return needScrape
}

// broadcastScrapeEvent 广播刮削事件
func (s *MetadataService) broadcastScrapeEvent(eventType string, data *ScrapeProgressData) {
	if s.wsHub != nil {
		s.wsHub.BroadcastEvent(eventType, data)
	}
}
