package service

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/nowen-video/nowen-video/internal/model"
)

// TMDb API 路径常量
const (
	TMDbSearchMoviePath = "/3/search/movie"
	TMDbSearchTVPath    = "/3/search/tv"
)

// ==================== TMDb API 数据结构 ====================

// TMDbErrorResponse TMDb错误响应
type TMDbErrorResponse struct {
	StatusCode    int    `json:"status_code"`
	StatusMessage string `json:"status_message"`
	Success       bool   `json:"success"`
}

// TMDbSearchResult TMDb搜索结果
type TMDbSearchResult struct {
	Page         int         `json:"page"`
	TotalResults int         `json:"total_results"`
	Results      []TMDbMovie `json:"results"`
}

// TMDbMovie TMDb电影/剧集信息
type TMDbMovie struct {
	ID            int     `json:"id"`
	Title         string  `json:"title"`
	Name          string  `json:"name"`
	OriginalTitle string  `json:"original_title"`
	OriginalName  string  `json:"original_name"`
	Overview      string  `json:"overview"`
	PosterPath    string  `json:"poster_path"`
	BackdropPath  string  `json:"backdrop_path"`
	ReleaseDate   string  `json:"release_date"`
	FirstAirDate  string  `json:"first_air_date"`
	VoteAverage   float64 `json:"vote_average"`
	GenreIDs      []int   `json:"genre_ids"`
	Runtime       int     `json:"runtime"`
}

// TMDbMovieDetail TMDb电影详情
type TMDbMovieDetail struct {
	ID            int             `json:"id"`
	Title         string          `json:"title"`
	OriginalTitle string          `json:"original_title"`
	Overview      string          `json:"overview"`
	PosterPath    string          `json:"poster_path"`
	BackdropPath  string          `json:"backdrop_path"`
	ReleaseDate   string          `json:"release_date"`
	VoteAverage   float64         `json:"vote_average"`
	Runtime       int             `json:"runtime"`
	Genres        []TMDbGenre     `json:"genres"`
	Videos        *TMDbVideosWrap `json:"videos,omitempty"`
}

// TMDbVideosWrap TMDb视频包装
type TMDbVideosWrap struct {
	Results []TMDbVideo `json:"results"`
}

// TMDbVideo TMDb视频
type TMDbVideo struct {
	Key      string `json:"key"`
	Site     string `json:"site"`
	Type     string `json:"type"`
	Official bool   `json:"official"`
}

// TMDbGenre TMDb类型
type TMDbGenre struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// TMDbCredits TMDb演职人员
type TMDbCredits struct {
	Cast []TMDbCast `json:"cast"`
	Crew []TMDbCrew `json:"crew"`
}

// TMDbCast TMDb演员
type TMDbCast struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Character   string `json:"character"`
	ProfilePath string `json:"profile_path"`
	Order       int    `json:"order"`
}

// TMDbCrew TMDb工作人员
type TMDbCrew struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Job         string `json:"job"`
	Department  string `json:"department"`
	ProfilePath string `json:"profile_path"`
}

// TMDbFindResult TMDb Find API 结果
type TMDbFindResult struct {
	MovieResults []TMDbMovie `json:"movie_results"`
	TVResults    []TMDbMovie `json:"tv_results"`
}

// TMDbImagesResult TMDb图片结果
type TMDbImagesResult struct {
	Logos     []TMDbImage `json:"logos"`
	Backdrops []TMDbImage `json:"backdrops"`
	Posters   []TMDbImage `json:"posters"`
}

// TMDbImage TMDb图片
type TMDbImage struct {
	FilePath string  `json:"file_path"`
	Width    int     `json:"width"`
	Height   int     `json:"height"`
	VoteAvg  float64 `json:"vote_average"`
}

// TMDbEpisode TMDb剧集单集
type TMDbEpisode struct {
	ID            int     `json:"id"`
	EpisodeNumber int     `json:"episode_number"`
	Name          string  `json:"name"`
	Overview      string  `json:"overview"`
	StillPath     string  `json:"still_path"`
	AirDate       string  `json:"air_date"`
	Runtime       int     `json:"runtime"`
	VoteAverage   float64 `json:"vote_average"`
}

// TMDbSeason TMDb季信息
type TMDbSeason struct {
	SeasonNumber int    `json:"season_number"`
	PosterPath   string `json:"poster_path"`
	EpisodeCount int    `json:"episode_count"`
	Name         string `json:"name"`
	Overview     string `json:"overview"`
	AirDate      string `json:"air_date"`
}

// TMDbTVSeason TMDb季详情
type TMDbTVSeason struct {
	ID           int           `json:"id"`
	SeasonNumber int           `json:"season_number"`
	PosterPath   string        `json:"poster_path"`
	EpisodeCount int           `json:"episode_count"`
	Name         string        `json:"name"`
	Overview     string        `json:"overview"`
	AirDate      string        `json:"air_date"`
	Episodes     []TMDbEpisode `json:"episodes"`
}

// TMDbPersonDetail TMDb人物详情
type TMDbPersonDetail struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	ProfilePath string `json:"profile_path"`
}

// ==================== TMDb API 方法 ====================

// FindByIMDbID 通过 IMDb ID 查找 TMDb 数据
func (s *MetadataService) FindByIMDbID(imdbID string) (*TMDbMovie, string, error) {
	if s.cfg.Secrets.TMDbAPIKey == "" {
		return nil, "", fmt.Errorf("TMDb API Key 未配置")
	}

	base := s.getTMDbAPIBase()
	apiURL := fmt.Sprintf("%s/3/find/%s?api_key=%s&language=zh-CN&external_source=imdb_id",
		base, url.QueryEscape(imdbID), url.QueryEscape(s.cfg.Secrets.TMDbAPIKey))

	resp, err := s.tmdbGetWithRetry(apiURL)
	if err != nil {
		return nil, "", fmt.Errorf("TMDb Find API 请求失败: %w", err)
	}
	defer resp.Body.Close()

	var result TMDbFindResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, "", fmt.Errorf("解析 TMDb Find 响应失败: %w", err)
	}

	// 优先返回电影结果
	if len(result.MovieResults) > 0 {
		return &result.MovieResults[0], "movie", nil
	}

	// 返回剧集结果
	if len(result.TVResults) > 0 {
		return &result.TVResults[0], "tv", nil
	}

	return nil, "", fmt.Errorf("IMDB ID %s 在 TMDb 中未找到匹配结果", imdbID)
}

// ConvertIMDbToTMDbID 将 IMDb ID 转换为 TMDb ID
func (s *MetadataService) ConvertIMDbToTMDbID(imdbID string) (int, string, error) {
	movie, mediaType, err := s.FindByIMDbID(imdbID)
	if err != nil {
		return 0, "", err
	}
	return movie.ID, mediaType, nil
}

// SearchTMDb 搜索 TMDb
func (s *MetadataService) SearchTMDb(mediaType, query string, year int) ([]TMDbMovie, error) {
	return s.searchTMDb(mediaType, query, year)
}

// searchTMDb 执行 TMDb 搜索
func (s *MetadataService) searchTMDb(mediaType, query string, year int) ([]TMDbMovie, error) {
	if s.cfg.Secrets.TMDbAPIKey == "" {
		return nil, fmt.Errorf("TMDb API Key 未配置")
	}

	base := s.getTMDbAPIBase()
	path := TMDbSearchMoviePath
	if mediaType == "tv" {
		path = TMDbSearchTVPath
	}

	apiURL := fmt.Sprintf("%s%s?api_key=%s&language=zh-CN&query=%s",
		base, path, url.QueryEscape(s.cfg.Secrets.TMDbAPIKey), url.QueryEscape(query))

	if year > 0 {
		apiURL += fmt.Sprintf("&year=%d", year)
	}

	resp, err := s.tmdbGetWithRetry(apiURL)
	if err != nil {
		return nil, fmt.Errorf("TMDb 搜索失败: %w", err)
	}
	defer resp.Body.Close()

	var result TMDbSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("解析 TMDb 搜索结果失败: %w", err)
	}

	return result.Results, nil
}

// searchTMDbWithAlt 使用备选标题搜索
func (s *MetadataService) searchTMDbWithAlt(mediaType, title, alt string, year int) ([]TMDbMovie, error) {
	results, err := s.searchTMDb(mediaType, title, year)
	if err != nil {
		return nil, err
	}

	// 如果主标题搜索结果为空，尝试备选标题
	if len(results) == 0 && alt != "" {
		results, err = s.searchTMDb(mediaType, alt, year)
		if err != nil {
			return nil, err
		}
	}

	return results, nil
}

// getMovieDetail 获取电影详情
func (s *MetadataService) getMovieDetail(tmdbID int) (*TMDbMovieDetail, error) {
	if s.cfg.Secrets.TMDbAPIKey == "" {
		return nil, fmt.Errorf("TMDb API Key 未配置")
	}

	base := s.getTMDbAPIBase()
	apiURL := fmt.Sprintf("%s/3/movie/%d?api_key=%s&language=zh-CN&append_to_response=videos",
		base, tmdbID, url.QueryEscape(s.cfg.Secrets.TMDbAPIKey))

	resp, err := s.tmdbGetWithRetry(apiURL)
	if err != nil {
		return nil, fmt.Errorf("获取电影详情失败: %w", err)
	}
	defer resp.Body.Close()

	var detail TMDbMovieDetail
	if err := json.NewDecoder(resp.Body).Decode(&detail); err != nil {
		return nil, fmt.Errorf("解析电影详情失败: %w", err)
	}

	return &detail, nil
}

// getTMDbMovieCredits 获取电影演职人员
func (s *MetadataService) getTMDbMovieCredits(tmdbID int) (*TMDbCredits, error) {
	return s.getTMDbCredits("movie", tmdbID)
}

// getTMDbTVCredits 获取剧集演职人员
func (s *MetadataService) getTMDbTVCredits(tmdbID int) (*TMDbCredits, error) {
	return s.getTMDbCredits("tv", tmdbID)
}

func (s *MetadataService) getTMDbCredits(mediaType string, tmdbID int) (*TMDbCredits, error) {
	if s.cfg.Secrets.TMDbAPIKey == "" {
		return nil, fmt.Errorf("TMDb API Key 未配置")
	}

	base := s.getTMDbAPIBase()
	apiURL := fmt.Sprintf("%s/3/%s/%d/credits?api_key=%s&language=zh-CN",
		base, mediaType, tmdbID, url.QueryEscape(s.cfg.Secrets.TMDbAPIKey))

	resp, err := s.tmdbGetWithRetry(apiURL)
	if err != nil {
		return nil, fmt.Errorf("获取演职人员失败: %w", err)
	}
	defer resp.Body.Close()

	var credits TMDbCredits
	if err := json.NewDecoder(resp.Body).Decode(&credits); err != nil {
		return nil, fmt.Errorf("解析演职人员失败: %w", err)
	}

	return &credits, nil
}

// getEpisodeDetail 获取剧集单集完整详情（TMDb Episode API）
func (s *MetadataService) getEpisodeDetail(seriesTMDbID int, seasonNum, episodeNum int) *TMDbEpisode {
	if s.cfg.Secrets.TMDbAPIKey == "" {
		return nil
	}

	base := s.getTMDbAPIBase()
	apiURL := fmt.Sprintf("%s/3/tv/%d/season/%d/episode/%d?api_key=%s&language=zh-CN",
		base, seriesTMDbID, seasonNum, episodeNum, url.QueryEscape(s.cfg.Secrets.TMDbAPIKey))

	resp, err := s.tmdbGetWithRetry(apiURL)
	if err != nil {
		s.logger.Warnf("获取剧集单集详情失败 (S%02dE%02d): %v", seasonNum, episodeNum, err)
		return nil
	}
	defer resp.Body.Close()

	var ep TMDbEpisode
	if err := json.NewDecoder(resp.Body).Decode(&ep); err != nil {
		s.logger.Warnf("解析剧集单集详情失败 (S%02dE%02d): %v", seasonNum, episodeNum, err)
		return nil
	}

	return &ep
}

// GetEpisodeMetadata 从 TMDb 获取单集完整元数据
func (s *MetadataService) GetEpisodeMetadata(seriesTMDbID int, seasonNum, episodeNum int) *TMDbEpisode {
	return s.getEpisodeDetail(seriesTMDbID, seasonNum, episodeNum)
}

// SearchTMDbImages 搜索 TMDb 图片
func (s *MetadataService) SearchTMDbImages(mediaType string, tmdbID int) (*TMDbImagesResult, error) {
	if s.cfg.Secrets.TMDbAPIKey == "" {
		return nil, fmt.Errorf("TMDb API Key 未配置")
	}

	base := s.getTMDbAPIBase()
	mediaPath := "movie"
	if mediaType == "tv" {
		mediaPath = "tv"
	}

	apiURL := fmt.Sprintf("%s/3/%s/%d/images?api_key=%s&include_image_language=zh-CN,en,null",
		base, mediaPath, tmdbID, url.QueryEscape(s.cfg.Secrets.TMDbAPIKey))

	resp, err := s.tmdbGetWithRetry(apiURL)
	if err != nil {
		return nil, fmt.Errorf("获取图片列表失败: %w", err)
	}
	defer resp.Body.Close()

	var result TMDbImagesResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("解析图片列表失败: %w", err)
	}

	return &result, nil
}

// bestMatchResult 从搜索结果中找到最佳匹配
func (s *MetadataService) bestMatchResult(results []TMDbMovie, searchTitle string, year int) TMDbMovie {
	if len(results) == 0 {
		return TMDbMovie{}
	}

	if len(results) == 1 {
		return results[0]
	}

	searchLower := strings.ToLower(searchTitle)
	yearPattern := regexp.MustCompile(`\d{4}`)
	searchYear := 0
	if match := yearPattern.FindString(searchLower); match != "" {
		searchYear, _ = strconv.Atoi(match)
	}

	var bestMatch TMDbMovie
	bestScore := -1

	for _, result := range results {
		score := 0
		title := strings.ToLower(result.Title)
		if result.Title == "" {
			title = strings.ToLower(result.Name)
		}

		// 标题完全匹配
		if title == searchLower {
			score += 10
		} else if strings.Contains(title, searchLower) || strings.Contains(searchLower, title) {
			score += 5
		}

		// 年份匹配
		resultYear := 0
		if result.ReleaseDate != "" {
			if match := yearPattern.FindString(result.ReleaseDate); match != "" {
				resultYear, _ = strconv.Atoi(match)
			}
		}
		if resultYear == 0 && result.FirstAirDate != "" {
			if match := yearPattern.FindString(result.FirstAirDate); match != "" {
				resultYear, _ = strconv.Atoi(match)
			}
		}

		if year > 0 && resultYear == year {
			score += 5
		} else if searchYear > 0 && resultYear == searchYear {
			score += 3
		}

		// 匹配度分数
		score += int(result.VoteAverage)

		if score > bestScore {
			bestScore = score
			bestMatch = result
		}
	}

	return bestMatch
}

// selectBestLogo 从 Logo 列表中选评分最高的（vote_average 最高的那个）
func selectBestLogo(logos []TMDbImage) string {
	if len(logos) == 0 {
		return ""
	}

	best := logos[0]
	for _, logo := range logos[1:] {
		if logo.VoteAvg > best.VoteAvg {
			best = logo
		}
	}
	return best.FilePath
}

// TMDbTVDetail TMDb剧集详情（包含季列表）
type TMDbTVDetail struct {
	ID              int          `json:"id"`
	Name            string       `json:"name"`
	Seasons         []TMDbSeason `json:"seasons"`
	NumberOfSeasons int          `json:"number_of_seasons"`
}

// getTVDetail 获取剧集详情（包含季列表）
func (s *MetadataService) getTVDetail(tmdbID int) (*TMDbTVDetail, error) {
	if s.cfg.Secrets.TMDbAPIKey == "" {
		return nil, fmt.Errorf("TMDb API Key 未配置")
	}

	base := s.getTMDbAPIBase()
	apiURL := fmt.Sprintf("%s/3/tv/%d?api_key=%s&language=zh-CN",
		base, tmdbID, url.QueryEscape(s.cfg.Secrets.TMDbAPIKey))

	resp, err := s.tmdbGetWithRetry(apiURL)
	if err != nil {
		return nil, fmt.Errorf("获取剧集详情失败: %w", err)
	}
	defer resp.Body.Close()

	var detail TMDbTVDetail
	if err := json.NewDecoder(resp.Body).Decode(&detail); err != nil {
		return nil, fmt.Errorf("解析剧集详情失败: %w", err)
	}

	return &detail, nil
}

// GetTMDbPersonDetail 获取 TMDb 人物详情（按需加载，用于 PersonProfile 懒加载头像）
func (s *MetadataService) GetTMDbPersonDetail(tmdbID int) (*TMDbPersonDetail, error) {
	if s.cfg.Secrets.TMDbAPIKey == "" {
		return nil, fmt.Errorf("TMDb API Key 未配置")
	}

	base := s.getTMDbAPIBase()
	apiURL := fmt.Sprintf("%s/3/person/%d?api_key=%s&language=zh-CN",
		base, tmdbID, url.QueryEscape(s.cfg.Secrets.TMDbAPIKey))

	resp, err := s.tmdbGetWithRetry(apiURL)
	if err != nil {
		return nil, fmt.Errorf("获取人物详情失败: %w", err)
	}
	defer resp.Body.Close()

	var detail TMDbPersonDetail
	if err := json.NewDecoder(resp.Body).Decode(&detail); err != nil {
		return nil, fmt.Errorf("解析人物详情失败: %w", err)
	}

	return &detail, nil
}

// DownloadSeasonPostersFromTMDb 从 TMDb 下载所有季海报
func (s *MetadataService) DownloadSeasonPostersFromTMDb(series *model.Series, tmdbID int) error {
	if tmdbID == 0 {
		return fmt.Errorf("TMDb ID 为空")
	}

	if series.FolderPath == "" {
		return fmt.Errorf("剧集目录路径为空")
	}

	// 获取剧集详情（包含季列表）
	tvDetail, err := s.getTVDetail(tmdbID)
	if err != nil {
		return fmt.Errorf("获取剧集季列表失败: %w", err)
	}

	s.logger.Debugf("TMDb 季列表: %d 季", len(tvDetail.Seasons))

	for _, season := range tvDetail.Seasons {
		// 跳过特别篇（season_number = 0）
		if season.SeasonNumber <= 0 {
			continue
		}

		// 如果没有海报路径则跳过
		if season.PosterPath == "" {
			continue
		}

		// 构建目标路径：直接存为 seasonXX-poster.jpg
		localPath := filepath.Join(series.FolderPath, fmt.Sprintf("season%02d-poster.jpg", season.SeasonNumber))

		// 如果已存在则跳过
		if _, err := os.Stat(localPath); err == nil {
			s.logger.Debugf("季海报已存在，跳过: %s", localPath)
			continue
		}

		// 下载海报
		for _, imageURL := range s.buildTMDbImageURLs(season.PosterPath, "w500") {
			if err := s.downloadToFile(imageURL, localPath); err == nil {
				s.logger.Debugf("已下载季海报: S%d -> %s", season.SeasonNumber, localPath)
				s.randomDelay(500, 1000)
				break
			}
			s.logger.Debugf("季海报备选URL下载失败 (S%d): %v", season.SeasonNumber, err)
		}
	}

	return nil
}

// randomDelay 随机延迟
func (s *MetadataService) randomDelay(min, max int) {
	if min >= max {
		return
	}
	delay := min + int(s.getRandomFloat()*float64(max-min))
	time.Sleep(time.Duration(delay) * time.Millisecond)
}

// getRandomFloat 返回 0.0-1.0 之间的随机浮点数
func (s *MetadataService) getRandomFloat() float64 {
	return float64(rand.Intn(1000)) / 1000.0
}
