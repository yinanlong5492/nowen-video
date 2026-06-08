package service

import (
	"fmt"
	"os"

	"github.com/nowen-video/nowen-video/internal/model"
	"gorm.io/gorm"
)

const (
	MediaTypeMovie   = "movie"
	MediaTypeTVShow  = "tvshow"
	MediaTypeEpisode = "episode"
)

func (s *MetadataService) UnmatchMedia(mediaID string) error {
	if mediaID == "" {
		return fmt.Errorf("%w: mediaID 不能为空", ErrInvalidParameter)
	}

	s.getMediaLock(mediaID).Lock()
	defer s.getMediaLock(mediaID).Unlock()

	var media *model.Media
	var imagePaths []string

	err := s.mediaRepo.DB().Transaction(func(tx *gorm.DB) error {
		txMedia := s.mediaRepo.WithTx(tx)
		txMediaPerson := s.mediaPersonRepo.WithTx(tx)

		var findErr error
		media, findErr = txMedia.FindByID(mediaID)
		if findErr != nil {
			return fmt.Errorf("查询媒体失败: %w", findErr)
		}
		if media == nil {
			return ErrMediaNotFound
		}

		imagePaths = []string{media.PosterPath, media.BackdropPath, media.LandscapePath, media.LogoPath}

		if err := txMediaPerson.DeleteByMediaID(mediaID); err != nil {
			s.logger.Warnf("清除演职人员关联失败,media=%s: %v", mediaID, err)
		}

		s.clearMediaMetadata(media)
		return txMedia.Update(media)
	})
	if err != nil {
		return err
	}

	s.deleteMediaImages(imagePaths)

	s.logger.Infof("已解除媒体元数据匹配: %s (%s)", media.Title, mediaID)
	return nil
}

func (s *MetadataService) deleteMediaImages(paths []string) {
	for _, path := range paths {
		if path == "" {
			continue
		}
		if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
			s.logger.Warnf("删除图片文件失败,path=%s: %v", path, err)
		}
	}
}

func (s *MetadataService) clearMediaMetadata(media *model.Media) {
	media.TMDbID = 0
	media.IMDbID = ""
	media.DoubanID = ""
	media.BangumiID = 0
	media.Overview = ""
	media.OriginalPlot = ""
	media.Outline = ""
	media.PosterPath = ""
	media.BackdropPath = ""
	media.LandscapePath = ""
	media.LogoPath = ""
	media.Rating = 0
	media.Runtime = 0
	media.Genres = ""
	media.Tags = ""
	media.OrigTitle = ""
	media.SortTitle = ""
	media.Country = ""
	media.CountryCode = ""
	media.Language = ""
	media.Tagline = ""
	media.Studio = ""
	media.TrailerURL = ""
	media.MPAA = ""
	media.Maker = ""
	media.Publisher = ""
	media.Label = ""
	media.Website = ""
	media.Num = ""
	media.ReleaseDate = ""
	media.ScrapeStatus = ""
	media.ScrapeAttempts = 0
	media.LastScrapeAt = nil
}

func (s *MetadataService) UnmatchSeries(seriesID string) error {
	if seriesID == "" {
		return fmt.Errorf("%w: seriesID 不能为空", ErrInvalidParameter)
	}

	s.getSeriesLock(seriesID).Lock()
	defer s.getSeriesLock(seriesID).Unlock()

	var series *model.Series
	var imagePaths []string

	err := s.mediaRepo.DB().Transaction(func(tx *gorm.DB) error {
		txSeries := s.seriesRepo.WithTx(tx)
		txMediaPerson := s.mediaPersonRepo.WithTx(tx)

		var findErr error
		series, findErr = txSeries.FindByID(seriesID)
		if findErr != nil {
			return fmt.Errorf("查询剧集合集失败: %w", findErr)
		}
		if series == nil {
			return ErrSeriesNotFound
		}

		imagePaths = []string{series.PosterPath, series.BackdropPath}

		if err := txMediaPerson.DeleteBySeriesID(seriesID); err != nil {
			s.logger.Warnf("清除系列演职人员关联失败,series=%s: %v", seriesID, err)
		}

		s.clearSeriesMetadata(series)
		return txSeries.Update(series)
	})
	if err != nil {
		return err
	}

	s.deleteMediaImages(imagePaths)

	s.logger.Infof("已解除剧集合集元数据匹配: %s (%s)", series.Title, seriesID)
	return nil
}

func (s *MetadataService) clearSeriesMetadata(series *model.Series) {
	series.TMDbID = 0
	series.IMDbID = ""
	series.DoubanID = ""
	series.BangumiID = 0
	series.Overview = ""
	series.PosterPath = ""
	series.BackdropPath = ""
	series.Rating = 0
	series.Genres = ""
	series.OrigTitle = ""
	series.Country = ""
	series.Language = ""
	series.Studio = ""
	series.ScrapeStatus = ""
	series.LastScrapeAt = nil
}

func (s *MetadataService) MatchSeriesWithTMDb(seriesID string, tmdbID int) error {
	if seriesID == "" {
		return fmt.Errorf("%w: seriesID 不能为空", ErrInvalidParameter)
	}
	if tmdbID <= 0 {
		return fmt.Errorf("%w: TMDb ID 无效", ErrInvalidParameter)
	}

	s.getSeriesLock(seriesID).Lock()
	defer s.getSeriesLock(seriesID).Unlock()

	series, err := s.seriesRepo.FindByID(seriesID)
	if err != nil {
		return fmt.Errorf("查询剧集合集失败: %w", err)
	}
	if series == nil {
		return ErrSeriesNotFound
	}

	s.logger.Infof("手动匹配剧集合集到 TMDb ID %d: %s", tmdbID, series.Title)

	oldTMDbID := series.TMDbID

	err = s.seriesRepo.DB().Transaction(func(tx *gorm.DB) error {
		series.TMDbID = tmdbID
		return s.seriesRepo.WithTx(tx).Update(series)
	})
	if err != nil {
		return fmt.Errorf("保存剧集合集失败: %w", err)
	}

	if scrapeErr := s.ScrapeSeries(seriesID); scrapeErr != nil {
		_ = s.seriesRepo.DB().Transaction(func(tx *gorm.DB) error {
			series.TMDbID = oldTMDbID
			return s.seriesRepo.WithTx(tx).Update(series)
		})
		return fmt.Errorf("刮削剧集元数据失败: %w", scrapeErr)
	}

	return nil
}

func (s *MetadataService) MatchMediaWithTMDb(mediaID string, tmdbID int) error {
	if mediaID == "" {
		return fmt.Errorf("%w: mediaID 不能为空", ErrInvalidParameter)
	}
	if tmdbID <= 0 {
		return fmt.Errorf("%w: TMDb ID 无效", ErrInvalidParameter)
	}

	s.getMediaLock(mediaID).Lock()
	defer s.getMediaLock(mediaID).Unlock()

	media, err := s.mediaRepo.FindByID(mediaID)
	if err != nil {
		return fmt.Errorf("查询媒体失败: %w", err)
	}
	if media == nil {
		return ErrMediaNotFound
	}

	s.logger.Infof("手动匹配媒体到 TMDb ID %d: %s", tmdbID, media.Title)

	var errDetail error
	switch media.MediaType {
	case MediaTypeMovie:
		errDetail = s.scrapeMovieByTMDbID(media, tmdbID)
	case MediaTypeTVShow, MediaTypeEpisode:
		errDetail = s.scrapeTVByTMDbID(media, tmdbID)
	default:
		return fmt.Errorf("不支持的媒体类型: %s", media.MediaType)
	}

	if errDetail != nil {
		return fmt.Errorf("获取 TMDb 详情失败: %w", errDetail)
	}

	if err := s.mediaRepo.Update(media); err != nil {
		return fmt.Errorf("保存媒体失败: %w", err)
	}

	s.writeNFOAfterScrape(media)
	s.logger.Infof("媒体匹配成功: %s -> TMDb ID %d", media.Title, tmdbID)
	return nil
}
