package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/nowen-video/nowen-video/internal/model"
)

const maxCastCount = 50

func (s *MetadataService) scrapeMovie(media *model.Media, searchTitle string, year int) error {
	_, alt, _ := s.parseTitleWithAlt(media.Title)
	results, err := s.searchTMDbWithAlt("movie", searchTitle, alt, year)
	if err != nil {
		return fmt.Errorf("搜索电影失败: %w", err)
	}

	if len(results) == 0 {
		return fmt.Errorf("未找到匹配结果: %s", searchTitle)
	}

	best := s.bestMatchResult(results, searchTitle, year)
	if best.ID <= 0 {
		return fmt.Errorf("无有效匹配结果: %s", searchTitle)
	}

	var detail *TMDbMovieDetail
	detail, err = s.getMovieDetail(best.ID)
	if err != nil {
		s.logger.Warnf("获取电影详情失败, 使用搜索结果: %s - %v", searchTitle, err)
		s.applySearchResult(media, &best)
	} else {
		s.applyMovieDetail(media, detail)
	}

	s.downloadMediaImages(media, best.PosterPath, best.BackdropPath)

	// 通过 SearchTMDbImages 获取 Logo 图片（TMDB 详情接口不直接返回 logo_path）
	if detail != nil && detail.ID > 0 {
		s.downloadMovieLogo(media, detail.ID)
	}

	if credits, err := s.getTMDbMovieCredits(best.ID); err == nil {
		s.saveCreditsForMedia(media.ID, credits, "")
	} else {
		s.logger.Warnf("获取演职人员失败: %v", err)
	}

	return s.mediaRepo.Update(media)
}

func (s *MetadataService) scrapeTV(media *model.Media, searchTitle string, year int) error {
	_, alt, _ := s.parseTitleWithAlt(media.Title)
	results, err := s.searchTMDbWithAlt("tv", searchTitle, alt, year)
	if err != nil {
		return fmt.Errorf("搜索剧集失败: %w", err)
	}

	if len(results) == 0 {
		return fmt.Errorf("未找到匹配结果: %s", searchTitle)
	}

	best := s.bestMatchResult(results, searchTitle, year)
	if best.ID <= 0 {
		return fmt.Errorf("无有效匹配结果: %s", searchTitle)
	}

	title := best.Name
	if title == "" {
		title = best.Title
	}
	origTitle := best.OriginalName
	if origTitle == "" {
		origTitle = best.OriginalTitle
	}

	if title != "" {
		media.Title = title
	}
	media.OrigTitle = origTitle
	media.TMDbID = best.ID

	dateStr := best.FirstAirDate
	if dateStr == "" {
		dateStr = best.ReleaseDate
	}
	if len(dateStr) >= 4 && media.Year == 0 {
		if y, err := strconv.Atoi(dateStr[:4]); err == nil {
			media.Year = y
		}
	}

	s.downloadMediaImages(media, best.PosterPath, best.BackdropPath)

	s.downloadEpisodeThumb(media, best.ID)

	s.downloadTVLogo(media, best.ID)

	if media.MediaType != "episode" {
		if best.Overview != "" && media.Overview == "" {
			media.Overview = best.Overview
		}
		if dateStr != "" && media.Premiered == "" {
			media.Premiered = dateStr
		}
	}
	if best.VoteAverage > 0 && media.Rating == 0 {
		media.Rating = best.VoteAverage
	}

	if credits, err := s.getTMDbTVCredits(best.ID); err == nil {
		s.saveCreditsForMedia(media.ID, credits, media.SeriesID)
	} else {
		s.logger.Warnf("获取剧集演职人员失败: %v", err)
	}

	return s.mediaRepo.Update(media)
}

func (s *MetadataService) scrapeMovieByTMDbID(media *model.Media, tmdbID int) error {
	detail, err := s.getMovieDetail(tmdbID)
	if err != nil {
		return fmt.Errorf("TMDb ID=%d 获取电影详情失败: %w", tmdbID, err)
	}
	s.applyMovieDetail(media, detail)
	media.TMDbID = tmdbID

	s.downloadMediaImages(media, detail.PosterPath, detail.BackdropPath)

	// 通过 SearchTMDbImages 获取 Logo 图片
	s.downloadMovieLogo(media, detail.ID)

	if credits, err := s.getTMDbMovieCredits(tmdbID); err == nil {
		s.saveCreditsForMedia(media.ID, credits, "")
	} else {
		s.logger.Warnf("获取演职人员失败: %v", err)
	}

	return s.mediaRepo.Update(media)
}

func (s *MetadataService) scrapeTVByTMDbID(media *model.Media, tmdbID int) error {
	apiURL := fmt.Sprintf("%s/3/tv/%d?api_key=%s&language=zh-CN",
		s.getTMDbAPIBase(), tmdbID, s.cfg.Secrets.TMDbAPIKey)
	resp, err := s.tmdbGetWithRetry(apiURL)
	if err != nil {
		return fmt.Errorf("TMDb TV ID=%d 获取详情失败: %w", tmdbID, err)
	}
	defer resp.Body.Close()

	var tvDetail struct {
		ID           int     `json:"id"`
		Name         string  `json:"name"`
		OriginalName string  `json:"original_name"`
		Overview     string  `json:"overview"`
		PosterPath   string  `json:"poster_path"`
		BackdropPath string  `json:"backdrop_path"`
		FirstAirDate string  `json:"first_air_date"`
		VoteAverage  float64 `json:"vote_average"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tvDetail); err != nil {
		return fmt.Errorf("解析 TMDb TV 详情失败: %w", err)
	}

	if tvDetail.Name != "" {
		media.Title = tvDetail.Name
	}
	media.OrigTitle = tvDetail.OriginalName
	media.TMDbID = tmdbID

	if tvDetail.FirstAirDate != "" && len(tvDetail.FirstAirDate) >= 4 {
		if media.Year == 0 {
			if y, err := strconv.Atoi(tvDetail.FirstAirDate[:4]); err == nil {
				media.Year = y
			}
		}
	}

	s.downloadMediaImages(media, tvDetail.PosterPath, tvDetail.BackdropPath)

	s.downloadEpisodeThumb(media, tmdbID)

	s.downloadTVLogo(media, tmdbID)

	if media.MediaType != "episode" {
		if tvDetail.Overview != "" && media.Overview == "" {
			media.Overview = tvDetail.Overview
		}
		if tvDetail.FirstAirDate != "" && media.Premiered == "" {
			media.Premiered = tvDetail.FirstAirDate
		}
	}
	if tvDetail.VoteAverage > 0 && media.Rating == 0 {
		media.Rating = tvDetail.VoteAverage
	}

	if credits, err := s.getTMDbTVCredits(tmdbID); err == nil {
		s.saveCreditsForMedia(media.ID, credits, media.SeriesID)
	} else {
		s.logger.Warnf("获取剧集演职人员失败: %v", err)
	}

	return s.mediaRepo.Update(media)
}

func (s *MetadataService) downloadMediaImages(media *model.Media, posterPath, backdropPath string) {
	if posterPath != "" {
		if localPath, err := s.downloadPoster(media, posterPath); err == nil {
			media.PosterPath = localPath
		} else {
			s.logger.Warnf("下载海报失败: %v", err)
		}

		if localPath, err := s.downloadFolder(media, posterPath); err == nil {
			media.FolderPath = localPath
		} else {
			s.logger.Warnf("下载文件夹封面失败: %v", err)
		}
	}

	if backdropPath != "" {
		if localPath, err := s.downloadBackdrop(media, backdropPath); err == nil {
			media.BackdropPath = localPath
		} else {
			s.logger.Warnf("下载背景图失败: %v", err)
		}

		if localPath, err := s.downloadLandscape(media, backdropPath); err == nil {
			media.LandscapePath = localPath
		} else {
			s.logger.Warnf("下载横向缩略图失败: %v", err)
		}
	}
}

// downloadMovieLogo 通过 TMDb Images API 获取并下载电影 Logo
func (s *MetadataService) downloadMovieLogo(media *model.Media, tmdbID int) {
	images, err := s.SearchTMDbImages("movie", tmdbID)
	if err != nil {
		s.logger.Warnf("获取电影图片列表失败 (TMDbID=%d): %v", tmdbID, err)
		return
	}

	logoPath := selectBestLogo(images.Logos)
	if logoPath == "" {
		s.logger.Debugf("未找到 Logo 图片 (TMDbID=%d)", tmdbID)
		return
	}

	if localPath, err := s.downloadLogo(media, logoPath); err == nil {
		media.LogoPath = localPath
	} else {
		s.logger.Warnf("下载 Logo 失败: %v", err)
	}
}

// downloadTVLogo 通过 TMDb Images API 获取并下载剧集 Logo
func (s *MetadataService) downloadTVLogo(media *model.Media, tmdbID int) {
	images, err := s.SearchTMDbImages("tv", tmdbID)
	if err != nil {
		s.logger.Warnf("获取剧集图片列表失败 (TMDbID=%d): %v", tmdbID, err)
		return
	}

	logoPath := selectBestLogo(images.Logos)
	if logoPath == "" {
		s.logger.Debugf("未找到剧集 Logo 图片 (TMDbID=%d)", tmdbID)
		return
	}

	if localPath, err := s.downloadLogo(media, logoPath); err == nil {
		media.LogoPath = localPath
	} else {
		s.logger.Warnf("下载剧集 Logo 失败: %v", err)
	}
}

// downloadEpisodeThumb 下载单集剧照缩略图（{视频文件名}-thumb.jpg），同时填充集元数据
func (s *MetadataService) downloadEpisodeThumb(media *model.Media, seriesTMDbID int) {
	if media.SeasonNum <= 0 || media.EpisodeNum <= 0 {
		s.logger.Debugf("跳过单集剧照下载: SeasonNum=%d EpisodeNum=%d", media.SeasonNum, media.EpisodeNum)
		return
	}
	detail := s.getEpisodeDetail(seriesTMDbID, media.SeasonNum, media.EpisodeNum)
	if detail == nil {
		s.logger.Warnf("未获取到单集详情 (S%02dE%02d)，将缺少单集标题与简介", media.SeasonNum, media.EpisodeNum)
		return
	}

	s.applyEpisodeMeta(media, detail)

	if detail.StillPath == "" {
		s.logger.Debugf("未找到单集剧照 still_path (S%02dE%02d)", media.SeasonNum, media.EpisodeNum)
		return
	}

	ext := filepath.Ext(media.FilePath)
	thumbPath := strings.TrimSuffix(media.FilePath, ext) + "-thumb.jpg"

	for _, imageURL := range s.buildTMDbImageURLs(detail.StillPath, "w500") {
		req, err := http.NewRequest("GET", imageURL, nil)
		if err != nil {
			continue
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
			continue
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			continue
		}

		dir := filepath.Dir(thumbPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			resp.Body.Close()
			return
		}

		file, err := os.Create(thumbPath)
		if err != nil {
			resp.Body.Close()
			return
		}

		if _, err = io.Copy(file, resp.Body); err != nil {
			file.Close()
			resp.Body.Close()
			_ = os.Remove(thumbPath)
			return
		}

		file.Close()
		resp.Body.Close()
		s.logger.Debugf("单集剧照下载成功: %s", thumbPath)
		media.PosterPath = thumbPath
		return
	}
	s.logger.Debugf("未找到可用的单集剧照 (S%02dE%02d)", media.SeasonNum, media.EpisodeNum)
}

// applyEpisodeMeta 将 TMDb 单集元数据填充到 Media
func (s *MetadataService) applyEpisodeMeta(media *model.Media, ep *TMDbEpisode) {
	if ep.Name != "" {
		media.EpisodeTitle = ep.Name
		s.logger.Debugf("单集元数据: S%02dE%02d title=%s overview=%s rating=%.1f runtime=%d air=%s",
			media.SeasonNum, media.EpisodeNum, ep.Name, truncate(ep.Overview, 40), ep.VoteAverage, ep.Runtime, ep.AirDate)
	} else {
		s.logger.Debugf("单集元数据: S%02dE%02d title=(空) overview=%s rating=%.1f runtime=%d air=%s",
			media.SeasonNum, media.EpisodeNum, truncate(ep.Overview, 40), ep.VoteAverage, ep.Runtime, ep.AirDate)
	}
	if ep.Overview != "" {
		media.Overview = ep.Overview
	}
	if ep.VoteAverage > 0 {
		media.Rating = ep.VoteAverage
	}
	if ep.Runtime > 0 {
		media.Runtime = ep.Runtime
	}
	if ep.AirDate != "" {
		media.Premiered = ep.AirDate
	}
}

// truncate 截断字符串用于日志
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

func (s *MetadataService) applySearchResult(media *model.Media, result *TMDbMovie) {
	title := result.Title
	if title == "" {
		title = result.Name
	}
	if title != "" {
		media.Title = title
	}

	origTitle := result.OriginalTitle
	if origTitle == "" {
		origTitle = result.OriginalName
	}
	media.OrigTitle = origTitle

	if result.Overview != "" {
		media.Overview = result.Overview
	}
	media.Rating = result.VoteAverage
	media.TMDbID = result.ID

	if result.ReleaseDate != "" {
		if y, err := strconv.Atoi(result.ReleaseDate[:4]); err == nil {
			media.Year = y
		}
		media.Premiered = result.ReleaseDate
	} else if result.FirstAirDate != "" {
		if y, err := strconv.Atoi(result.FirstAirDate[:4]); err == nil {
			media.Year = y
		}
		media.Premiered = result.FirstAirDate
	}

	if len(result.GenreIDs) > 0 {
		media.Genres = s.mapGenreIDs(result.GenreIDs)
	}
}

func (s *MetadataService) applyMovieDetail(media *model.Media, detail *TMDbMovieDetail) {
	if detail.Title != "" {
		media.Title = detail.Title
	}
	media.OrigTitle = detail.OriginalTitle
	if detail.Overview != "" {
		media.Overview = detail.Overview
	}
	media.Rating = detail.VoteAverage
	media.TMDbID = detail.ID
	media.Runtime = detail.Runtime

	if detail.ReleaseDate != "" {
		if y, err := strconv.Atoi(detail.ReleaseDate[:4]); err == nil {
			media.Year = y
		}
		media.Premiered = detail.ReleaseDate
	}

	var genreIDs []int
	for _, g := range detail.Genres {
		genreIDs = append(genreIDs, g.ID)
	}
	if len(genreIDs) > 0 {
		media.Genres = s.mapGenreIDs(genreIDs)
	}

	if detail.Videos != nil {
		for _, video := range detail.Videos.Results {
			if video.Type == "Trailer" && video.Site == "YouTube" && video.Official {
				media.TrailerURL = "https://www.youtube.com/watch?v=" + video.Key
				break
			}
		}
	}
}

func (s *MetadataService) saveCreditsForMedia(mediaID string, credits *TMDbCredits, seriesID string) {
	if s.personRepo == nil || s.mediaPersonRepo == nil {
		return
	}
	if credits == nil {
		return
	}

	if err := s.mediaPersonRepo.DeleteByMediaID(mediaID); err != nil {
		s.logger.Warnf("清除旧演职人员关联失败,media=%s: %v", mediaID, err)
	}

	for i, cast := range credits.Cast {
		if i >= maxCastCount {
			break
		}

		person, err := s.personRepo.FindOrCreateByTMDbID(cast.ID, cast.Name, cast.ProfilePath)
		if err != nil {
			s.logger.Warnf("创建演员失败,name=%s,tmdbID=%d: %v", cast.Name, cast.ID, err)
			continue
		}

		if err := s.mediaPersonRepo.Create(&model.MediaPerson{
			MediaID:   mediaID,
			SeriesID:  seriesID,
			PersonID:  person.ID,
			Role:      "actor",
			Character: cast.Character,
			SortOrder: cast.Order,
		}); err != nil {
			s.logger.Warnf("创建演员关联失败,media=%s,person=%s: %v", mediaID, person.ID, err)
		}

		s.downloadPersonProfile(person, cast.ProfilePath)
	}

	for _, crew := range credits.Crew {
		if !isAllowedCrewDepartment(crew.Department) {
			continue
		}

		role := resolveCrewRole(crew.Job)

		person, err := s.personRepo.FindOrCreateByTMDbID(crew.ID, crew.Name, crew.ProfilePath)
		if err != nil {
			s.logger.Warnf("创建剧组成员失败,name=%s,tmdbID=%d: %v", crew.Name, crew.ID, err)
			continue
		}

		if err := s.mediaPersonRepo.Create(&model.MediaPerson{
			MediaID:   mediaID,
			SeriesID:  seriesID,
			PersonID:  person.ID,
			Role:      role,
			Character: crew.Job,
			SortOrder: 0,
		}); err != nil {
			s.logger.Warnf("创建剧组成员关联失败,media=%s,person=%s: %v", mediaID, person.ID, err)
		}

		s.downloadPersonProfile(person, crew.ProfilePath)
	}
}

var allowedCrewDepartments = map[string]bool{
	"Directing":  true,
	"Writing":    true,
	"Production": true,
	"Sound":      true,
	"Camera":     true,
}

func isAllowedCrewDepartment(dept string) bool {
	return allowedCrewDepartments[dept]
}

// resolveCrewRole 根据职位返回标准化的角色类型
func resolveCrewRole(job string) string {
	jobLower := strings.ToLower(job)
	if jobLower == "director" || strings.Contains(jobLower, "director") {
		return "director"
	}
	if strings.Contains(jobLower, "writer") || strings.Contains(jobLower, "screenplay") ||
		strings.Contains(jobLower, "story") || strings.Contains(jobLower, "author") {
		return "writer"
	}
	if strings.Contains(jobLower, "producer") {
		return "producer"
	}
	if strings.Contains(jobLower, "music") || strings.Contains(jobLower, "composer") ||
		strings.Contains(jobLower, "song") || strings.Contains(jobLower, "soundtrack") {
		return "composer"
	}
	if strings.Contains(jobLower, "cinematograph") || strings.Contains(jobLower, "director of photography") {
		return "cinematographer"
	}
	return "other"
}
