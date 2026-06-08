package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/nowen-video/nowen-video/internal/model"
)

type TVSeriesDetail struct {
	Name         string  `json:"name"`
	OriginalName string  `json:"original_name"`
	Overview     string  `json:"overview"`
	PosterPath   string  `json:"poster_path"`
	BackdropPath string  `json:"backdrop_path"`
	FirstAirDate string  `json:"first_air_date"`
	VoteAverage  float64 `json:"vote_average"`
	Genres       []struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
	} `json:"genres"`
}

func (s *MetadataService) ScrapeSeries(seriesID string) error {
	series, err := s.seriesRepo.FindByID(seriesID)
	if err != nil {
		return fmt.Errorf("查询剧集失败: %w", err)
	}

	s.logger.Infof("[%s] 开始刮削剧集元数据: %s", seriesID, series.Title)
	s.logScrapeEvent(model.LogLevelInfo, seriesID, series.Title, "开始刮削剧集元数据: "+series.Title, "")

	if s.providerChain != nil {
		searchTitle := NormalizeSeriesTitle(series.Title)
		year := series.Year
		if err := s.providerChain.ScrapeSeries(series, searchTitle, year); err != nil {
			s.logger.Warnf("[%s] 多数据源调度链剧集刮削失败: %v", seriesID, err)
			s.logScrapeEvent(model.LogLevelWarn, seriesID, series.Title, "剧集刮削失败: "+series.Title, err.Error())
			return err
		}
		err := s.finishSeriesScrape(series)
		if err != nil {
			s.logScrapeEvent(model.LogLevelWarn, seriesID, series.Title, "剧集刮削失败: "+series.Title, err.Error())
		} else {
			s.logScrapeEvent(model.LogLevelInfo, seriesID, series.Title, "剧集刮削成功: "+series.Title, "")
		}
		return err
	}

	if s.cfg.Secrets.TMDbAPIKey == "" {
		s.logScrapeEvent(model.LogLevelWarn, seriesID, series.Title, "剧集刮削失败: "+series.Title, "TMDb API Key 未配置")
		return fmt.Errorf("TMDb API Key 未配置")
	}

	var scrapeErr error
	if series.TMDbID > 0 {
		scrapeErr = s.scrapeSeriesByTMDbID(series)
	} else {
		scrapeErr = s.scrapeSeriesBySearch(series)
	}
	if scrapeErr != nil {
		s.logScrapeEvent(model.LogLevelWarn, seriesID, series.Title, "剧集刮削失败: "+series.Title, scrapeErr.Error())
		return scrapeErr
	}
	s.logScrapeEvent(model.LogLevelInfo, seriesID, series.Title, "剧集刮削成功: "+series.Title, "")
	return nil
}

func (s *MetadataService) deleteSeriesImages(series *model.Series) int {
	if series.FolderPath == "" {
		return 0
	}
	deleted := 0
	seriesImageFiles := []string{"poster.jpg", "backdrop.jpg", "folder.jpg", "landscape.jpg", "logo.png", "logo.webp"}
	for _, f := range seriesImageFiles {
		if err := os.Remove(filepath.Join(series.FolderPath, f)); err == nil {
			s.logger.Debugf("已删除剧集图片: %s/%s", series.FolderPath, f)
			deleted++
		}
	}
	seasonPosterGlob := filepath.Join(series.FolderPath, "season*-poster.*")
	if matches, err := filepath.Glob(seasonPosterGlob); err == nil {
		for _, m := range matches {
			if err := os.Remove(m); err == nil {
				s.logger.Debugf("已删除季海报: %s", m)
				deleted++
			}
		}
	}
	return deleted
}

func (s *MetadataService) ScrapeSeriesWithReplace(seriesID string, replaceImages bool) error {
	if replaceImages {
		series, err := s.seriesRepo.FindByID(seriesID)
		if err != nil {
			return fmt.Errorf("查询剧集失败: %w", err)
		}
		count := s.deleteSeriesImages(series)
		if count > 0 {
			s.logger.Infof("[%s] 已删除 %d 个已有图片，将重新下载", seriesID, count)
		}
	}
	return s.ScrapeSeries(seriesID)
}

func (s *MetadataService) ScrapeSeriesWithMode(seriesID string, replaceImages bool, mode string) error {
	if mode == "fill_missing" {
		series, err := s.seriesRepo.FindByID(seriesID)
		if err != nil {
			return fmt.Errorf("查询剧集失败: %w", err)
		}
		if series.ScrapeStatus == ScrapeStatusManual {
			s.logger.Infof("[%s] %s 为手动锁定条目，跳过刮削", seriesID, series.Title)
			return nil
		}
		if series.ScrapeStatus == ScrapeStatusScraped &&
			series.Overview != "" && series.PosterPath != "" && series.Rating > 0 &&
			series.Genres != "" && series.Year > 0 {
			s.logger.Infof("[%s] %s 元数据已完整，跳过刮削", seriesID, series.Title)
			return nil
		}
	}
	return s.ScrapeSeriesWithReplace(seriesID, replaceImages)
}

func (s *MetadataService) scrapeSeriesByTMDbID(series *model.Series) error {
	apiURL := fmt.Sprintf("%s/3/tv/%d?api_key=%s&language=zh-CN",
		s.getTMDbAPIBase(), series.TMDbID, s.cfg.Secrets.TMDbAPIKey)
	resp, err := s.tmdbGetWithRetry(apiURL)
	if err != nil {
		s.logger.Warnf("[%s] TMDb ID=%d 获取详情失败，回退搜索: %v", series.ID, series.TMDbID, err)
		return s.scrapeSeriesBySearch(series)
	}
	defer resp.Body.Close()

	var tvDetail TVSeriesDetail
	if err := json.NewDecoder(resp.Body).Decode(&tvDetail); err != nil {
		s.logger.Warnf("[%s] 解析 TMDb TV 详情失败，回退搜索: %v", series.ID, err)
		return s.scrapeSeriesBySearch(series)
	}

	s.applySeriesTVDetail(series, &tvDetail)

	s.downloadSeriesImagesFromTMDb(series, tvDetail.PosterPath, tvDetail.BackdropPath)

	return s.finishSeriesScrape(series)
}

func (s *MetadataService) scrapeSeriesBySearch(series *model.Series) error {
	searchTitle := NormalizeSeriesTitle(series.Title)
	year := series.Year

	results, err := s.searchTMDb("tv", searchTitle, year)
	if err != nil {
		return fmt.Errorf("搜索剧集失败: %w", err)
	}

	if len(results) == 0 {
		return fmt.Errorf("未找到匹配的剧集: %s", searchTitle)
	}

	best := s.bestMatchResult(results, searchTitle, year)
	if best.ID <= 0 {
		return fmt.Errorf("无有效匹配结果: %s", searchTitle)
	}

	s.applySeriesSearchResult(series, &best)

	s.downloadSeriesImagesFromTMDb(series, best.PosterPath, best.BackdropPath)

	return s.finishSeriesScrape(series)
}

func (s *MetadataService) finishSeriesScrape(series *model.Series) error {
	s.finalizeSeriesStatus(series)
	s.setSeriesLastScrapeAt(series)

	// 下载季海报
	if series.TMDbID > 0 && series.FolderPath != "" {
		if err := s.DownloadSeasonPostersFromTMDb(series, series.TMDbID); err != nil {
			s.logger.Warnf("[%s] 下载 TMDb 季海报失败: %v", series.ID, err)
		}
	}

	if err := s.seriesRepo.Update(series); err != nil {
		return fmt.Errorf("保存剧集失败: %w", err)
	}

	// 刮削成功后自动生成 tvshow.nfo（Emby/Jellyfin/Kodi 兼容）
	if s.nfoService != nil && series.FolderPath != "" {
		if _, err := s.nfoService.WriteTVShowNFO(series.FolderPath, series); err != nil {
			s.logger.Warnf("[%s] 写入 tvshow.nfo 失败: %v", series.ID, err)
		}

		// 为每个 Season 目录生成 season.nfo
		s.writeSeasonNFOs(series)
	}

	// 逐集刮削：为每集生成 {文件名}.nfo 和 {文件名}-thumb.jpg
	go s.scrapeAllEpisodes(series)

	s.logger.Infof("[%s] 剧集刮削完成 (status=%s): %s", series.ID, series.ScrapeStatus, series.Title)
	return nil
}

// scrapeAllEpisodes 逐集刮削该系列下的所有单集（异步执行）
func (s *MetadataService) scrapeAllEpisodes(series *model.Series) {
	episodes, err := s.mediaRepo.ListBySeriesID(series.ID)
	if err != nil {
		s.logger.Warnf("[%s] 获取单集列表失败: %v", series.ID, err)
		return
	}

	if len(episodes) == 0 {
		s.logger.Debugf("[%s] 无单集需要刮削", series.ID)
		return
	}

	s.logger.Infof("[%s] 开始逐集刮削，共 %d 集", series.ID, len(episodes))
	successCount := 0
	for _, ep := range episodes {
		if ep.ScrapeStatus == ScrapeStatusScraped && ep.Overview != "" {
			s.logger.Debugf("[%s] 单集 S%02dE%02d 已刮削，跳过", series.ID, ep.SeasonNum, ep.EpisodeNum)
			s.ensureEpisodeNFO(&ep)
			continue
		}

		if err := s.ScrapeMedia(ep.ID); err != nil {
			s.logger.Warnf("[%s] 单集 S%02dE%02d 刮削失败: %v", series.ID, ep.SeasonNum, ep.EpisodeNum, err)
		} else {
			successCount++
		}
	}
	s.logger.Infof("[%s] 逐集刮削完成: %d/%d 成功", series.ID, successCount, len(episodes))
}

// ensureEpisodeNFO 补生成已刮削但缺失 .nfo 的单集 NFO 文件
func (s *MetadataService) ensureEpisodeNFO(ep *model.Media) {
	if s.nfoService == nil || ep.FilePath == "" {
		return
	}

	nfoPath := mediaNFOPath(ep.FilePath)
	if _, err := os.Stat(nfoPath); err == nil {
		return
	}

	s.writeNFOAfterScrape(ep)
}

// writeSeasonNFOs 为剧集目录下的各 Season 目录生成 season.nfo
func (s *MetadataService) writeSeasonNFOs(series *model.Series) {
	if series.FolderPath == "" {
		return
	}

	// 扫描系列目录下的 Season 子目录
	entries, err := os.ReadDir(series.FolderPath)
	if err != nil {
		s.logger.Warnf("[%s] 扫描系列目录失败: %v", series.ID, err)
		return
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		seasonNum := parseSeasonDirNum(entry.Name())
		if seasonNum <= 0 {
			continue
		}

		seasonDir := filepath.Join(series.FolderPath, entry.Name())
		if _, err := s.nfoService.WriteSeasonNFO(seasonDir, seasonNum, series.Title, series.Year); err != nil {
			s.logger.Warnf("[%s] 写入 season.nfo 失败 (season=%d): %v", series.ID, seasonNum, err)
		}
	}
}

func (s *MetadataService) applySeriesTVDetail(series *model.Series, tv *TVSeriesDetail) {
	if tv.Name != "" {
		series.Title = tv.Name
	}
	series.OrigTitle = tv.OriginalName
	if tv.Overview != "" {
		series.Overview = tv.Overview
	}
	series.Rating = tv.VoteAverage

	if tv.FirstAirDate != "" && len(tv.FirstAirDate) >= 4 {
		if y, err := strconv.Atoi(tv.FirstAirDate[:4]); err == nil {
			series.Year = y
		} else {
			s.logger.Warnf("[%s] 解析年份失败: %s", series.ID, tv.FirstAirDate[:4])
		}
	}

	var genreIDs []int
	for _, g := range tv.Genres {
		genreIDs = append(genreIDs, g.ID)
	}
	if len(genreIDs) > 0 {
		series.Genres = s.mapGenreIDs(genreIDs)
	}
}

func (s *MetadataService) applySeriesSearchResult(series *model.Series, best *TMDbMovie) {
	series.TMDbID = best.ID

	title := best.Name
	if title == "" {
		title = best.Title
	}
	if title != "" {
		series.Title = title
	}

	origTitle := best.OriginalName
	if origTitle == "" {
		origTitle = best.OriginalTitle
	}
	series.OrigTitle = origTitle

	if best.Overview != "" {
		series.Overview = best.Overview
	}
	series.Rating = best.VoteAverage

	if best.FirstAirDate != "" && len(best.FirstAirDate) >= 4 {
		if y, err := strconv.Atoi(best.FirstAirDate[:4]); err == nil {
			series.Year = y
		} else {
			s.logger.Warnf("[%s] 解析年份失败: %s", series.ID, best.FirstAirDate[:4])
		}
	}

	if len(best.GenreIDs) > 0 {
		series.Genres = s.mapGenreIDs(best.GenreIDs)
	}
}

func (s *MetadataService) finalizeSeriesStatus(series *model.Series) {
	series.ScrapeStatus = ScrapeStatusScraped
	if series.PosterPath == "" {
		series.ScrapeStatus = ScrapeStatusPartial
	}
}

func (s *MetadataService) setSeriesLastScrapeAt(series *model.Series) {
	now := time.Now()
	series.LastScrapeAt = &now
}

func (s *MetadataService) downloadSeriesImagesFromTMDb(series *model.Series, posterTMDbPath, backdropTMDbPath string) {
	if posterTMDbPath != "" {
		if localPath, err := s.downloadSeriesImage(series, posterTMDbPath, ImageSizePoster, "poster.jpg"); err == nil {
			series.PosterPath = localPath
			// 同时生成 folder.jpg（Emby/Jellyfin/Kodi 文件夹封面）
			s.copySeriesImage(localPath, filepath.Join(series.FolderPath, "folder.jpg"))
		} else {
			s.logger.Warnf("[%s] 下载海报失败: %v", series.ID, err)
		}
	}

	if backdropTMDbPath != "" {
		if localPath, err := s.downloadSeriesImage(series, backdropTMDbPath, ImageSizeBackdrop, "backdrop.jpg"); err == nil {
			series.BackdropPath = localPath
			// 同时生成 landscape.jpg（Emby/Jellyfin 横版缩略图）
			s.copySeriesImage(localPath, filepath.Join(series.FolderPath, "landscape.jpg"))
		} else {
			s.logger.Warnf("[%s] 下载背景图失败: %v", series.ID, err)
		}
	}

	// 下载 Logo（需要单独调用图片列表 API）
	s.downloadSeriesLogoFromTMDb(series)
}

// copySeriesImage 将源图片复制为目标路径（如 poster.jpg -> folder.jpg）
func (s *MetadataService) copySeriesImage(srcPath, dstPath string) {
	if srcPath == "" || dstPath == "" || srcPath == dstPath {
		return
	}
	if _, err := os.Stat(dstPath); err == nil {
		return // 目标已存在，跳过
	}
	srcFile, err := os.Open(srcPath)
	if err != nil {
		s.logger.Warnf("复制图片失败(打开源文件): %v", err)
		return
	}
	defer srcFile.Close()

	dstFile, err := os.Create(dstPath)
	if err != nil {
		s.logger.Warnf("复制图片失败(创建目标文件): %v", err)
		return
	}
	defer dstFile.Close()

	if _, err := io.Copy(dstFile, srcFile); err != nil {
		s.logger.Warnf("复制图片失败(写入): %v", err)
	}
}

// downloadSeriesLogoFromTMDb 从 TMDb 下载剧集 Logo
func (s *MetadataService) downloadSeriesLogoFromTMDb(series *model.Series) {
	if series.TMDbID <= 0 {
		s.logger.Debugf("[%s] 跳过 Logo 下载: TMDbID 为空", series.ID)
		return
	}

	images, err := s.SearchTMDbImages("tv", series.TMDbID)
	if err != nil {
		s.logger.Warnf("[%s] 获取剧集图片列表失败: %v", series.ID, err)
		return
	}

	logoPath := selectBestLogo(images.Logos)
	if logoPath == "" {
		s.logger.Debugf("[%s] TMDb 未找到 Logo 图片，检查本地文件", series.ID)
		if localPath := s.findExistingSeriesLogo(series); localPath != "" {
			series.LogoPath = localPath
		}
		return
	}

	if localPath, err := s.downloadSeriesLogo(series, logoPath); err == nil {
		series.LogoPath = localPath
	} else {
		// 404 是正常情况（不是所有剧集都有 Logo），只记录 debug
		if strings.Contains(err.Error(), "HTTP 404") {
			s.logger.Debugf("[%s] Logo 图片不存在 (404): %v", series.ID, err)
		} else {
			s.logger.Warnf("[%s] 下载 Logo 失败: %v", series.ID, err)
		}
	}
}

func (s *MetadataService) findExistingSeriesLogo(series *model.Series) string {
	if series.FolderPath == "" {
		return ""
	}
	logoExts := []string{".png", ".jpg", ".jpeg", ".webp"}
	for _, ext := range logoExts {
		localPath := filepath.Join(series.FolderPath, "logo"+ext)
		if isExistingImageValid(s, localPath) {
			s.logger.Debugf("[%s] 找到本地 Logo 文件: %s", series.ID, localPath)
			return localPath
		}
	}
	return ""
}

func (s *MetadataService) downloadSeriesImage(series *model.Series, tmdbPath string, imageSize string, filename string) (string, error) {
	if tmdbPath == "" {
		return "", fmt.Errorf("图片路径为空")
	}

	localPath := filepath.Join(series.FolderPath, filename)

	if _, err := os.Stat(localPath); err == nil {
		return localPath, nil
	} else if !os.IsNotExist(err) {
		return "", fmt.Errorf("检查图片文件失败: %w", err)
	}

	var lastErr error
	for _, imageURL := range s.buildTMDbImageURLs(tmdbPath, imageSize) {
		var resp *http.Response
		var err error
		for retry := 0; retry < DefaultRetryCount; retry++ {
			req, reqErr := http.NewRequest("GET", imageURL, nil)
			if reqErr != nil {
				err = reqErr
				break
			}
			req.Header.Set("User-Agent", getRandomUserAgent())
			req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/*,*/*;q=0.8")
			req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
			req.Header.Set("Referer", "https://www.themoviedb.org/")
			req.Header.Set("Sec-Fetch-Dest", "image")
			req.Header.Set("Sec-Fetch-Mode", "no-cors")
			req.Header.Set("Sec-Fetch-Site", "cross-site")

			resp, err = s.client.Do(req)
			if err != nil {
				randomDelay(int(RetryDelayMin.Milliseconds()), int(RetryDelayMax.Milliseconds()))
				continue
			}
			if resp.StatusCode == http.StatusOK {
				break
			}
			statusCode := resp.StatusCode
			resp.Body.Close()
			resp = nil
			err = fmt.Errorf("HTTP %d", statusCode)
			randomDelay(int(RetryDelayMin.Milliseconds()), int(RetryDelayMax.Milliseconds()))
		}
		if err != nil {
			lastErr = fmt.Errorf("请求图片失败: %w", err)
			continue
		}
		if resp == nil {
			lastErr = fmt.Errorf("请求图片失败: 所有重试均已耗尽")
			continue
		}

		if err := os.MkdirAll(series.FolderPath, 0755); err != nil {
			resp.Body.Close()
			return "", fmt.Errorf("创建目录失败: %w", err)
		}

		file, err := os.Create(localPath)
		if err != nil {
			resp.Body.Close()
			return "", fmt.Errorf("创建图片文件失败: %w", err)
		}

		if _, err = io.Copy(file, resp.Body); err != nil {
			file.Close()
			resp.Body.Close()
			_ = os.Remove(localPath)
			lastErr = fmt.Errorf("写入图片失败: %w", err)
			continue
		}

		file.Close()
		resp.Body.Close()
		return localPath, nil
	}
	return "", lastErr
}

// seasonDirNumPatterns 用于识别 Season 目录名的正则表达式
var seasonDirNumPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)^Season\s*(\d{1,2})$`),
	regexp.MustCompile(`(?i)^S(\d{1,2})$`),
	regexp.MustCompile(`^第\s*(\d{1,2})\s*季$`),
}

// parseSeasonDirNum 从目录名中解析季号，如 "Season 1" → 1, "S02" → 2
func parseSeasonDirNum(dirName string) int {
	for _, pattern := range seasonDirNumPatterns {
		if m := pattern.FindStringSubmatch(dirName); len(m) >= 2 {
			num, _ := strconv.Atoi(m[1])
			return num
		}
	}
	return 0
}
