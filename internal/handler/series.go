package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/nowen-video/nowen-video/internal/repository"
	"github.com/nowen-video/nowen-video/internal/service"
	"go.uber.org/zap"
)

// SeriesHandler 剧集合集处理器
type SeriesHandler struct {
	seriesService   *service.SeriesService
	mediaPersonRepo *repository.MediaPersonRepo
	logger          *zap.SugaredLogger
}

// List 获取剧集合集列表
func (h *SeriesHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	libraryID := c.Query("library_id")

	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}

	series, total, err := h.seriesService.ListSeries(page, size, libraryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取剧集列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  series,
		"total": total,
		"page":  page,
		"size":  size,
	})
}

// Detail 获取剧集合集详情（含所有剧集）
func (h *SeriesHandler) Detail(c *gin.Context) {
	id := c.Param("id")
	series, err := h.seriesService.GetSeriesDetail(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "剧集不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": series})
}

// Seasons 获取季列表（季视图）
func (h *SeriesHandler) Seasons(c *gin.Context) {
	id := c.Param("id")
	seasons, err := h.seriesService.GetSeasons(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取季列表失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": seasons})
}

// SeasonEpisodes 获取指定季的剧集列表（集视图）
func (h *SeriesHandler) SeasonEpisodes(c *gin.Context) {
	id := c.Param("id")
	seasonNum, _ := strconv.Atoi(c.Param("season"))

	episodes, err := h.seriesService.GetSeasonEpisodes(id, seasonNum)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取剧集列表失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": episodes})
}

// NextEpisode 获取下一集
func (h *SeriesHandler) NextEpisode(c *gin.Context) {
	id := c.Param("id")
	season, _ := strconv.Atoi(c.Query("season"))
	episode, _ := strconv.Atoi(c.Query("episode"))

	next, err := h.seriesService.GetNextEpisode(id, season, episode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取下一集失败"})
		return
	}
	if next == nil {
		c.JSON(http.StatusOK, gin.H{"data": nil, "message": "已是最后一集"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": next})
}

// Poster 获取剧集合集海报图片
func (h *SeriesHandler) Poster(c *gin.Context) {
	id := c.Param("id")
	posterPath, err := h.seriesService.GetSeriesPosterPath(id)
	if err != nil || posterPath == "" {
		serveEmptyPNG(c)
		return
	}

	// 基于文件修改时间生成 ETag
	fileInfo, statErr := os.Stat(posterPath)
	if statErr != nil {
		serveEmptyPNG(c)
		return
	}

	etag := fmt.Sprintf(`"%x-%x"`, fileInfo.ModTime().UnixNano(), fileInfo.Size())
	c.Header("ETag", etag)

	if match := c.GetHeader("If-None-Match"); match == etag {
		c.Status(http.StatusNotModified)
		return
	}

	ext := strings.ToLower(filepath.Ext(posterPath))
	switch ext {
	case ".jpg", ".jpeg":
		c.Header("Content-Type", "image/jpeg")
	case ".png":
		c.Header("Content-Type", "image/png")
	case ".webp":
		c.Header("Content-Type", "image/webp")
	default:
		c.Header("Content-Type", "application/octet-stream")
	}

	c.Header("Cache-Control", "public, max-age=86400, must-revalidate")
	c.File(posterPath)
}

// Backdrop 获取剧集合集背景图片
func (h *SeriesHandler) Backdrop(c *gin.Context) {
	id := c.Param("id")
	series, err := h.seriesService.GetSeriesDetail(id)
	if err != nil || series.BackdropPath == "" {
		serveEmptyPNG(c)
		return
	}

	fileInfo, statErr := os.Stat(series.BackdropPath)
	if statErr != nil {
		serveEmptyPNG(c)
		return
	}

	etag := fmt.Sprintf(`"%x-%x"`, fileInfo.ModTime().UnixNano(), fileInfo.Size())
	c.Header("ETag", etag)

	if match := c.GetHeader("If-None-Match"); match == etag {
		c.Status(http.StatusNotModified)
		return
	}

	ext := strings.ToLower(filepath.Ext(series.BackdropPath))
	switch ext {
	case ".jpg", ".jpeg":
		c.Header("Content-Type", "image/jpeg")
	case ".png":
		c.Header("Content-Type", "image/png")
	case ".webp":
		c.Header("Content-Type", "image/webp")
	default:
		c.Header("Content-Type", "application/octet-stream")
	}

	c.Header("Cache-Control", "public, max-age=86400, must-revalidate")
	c.File(series.BackdropPath)
}

// Logo 获取剧集合集 Logo 图片
func (h *SeriesHandler) Logo(c *gin.Context) {
	id := c.Param("id")
	series, err := h.seriesService.GetSeriesDetail(id)
	if err != nil {
		serveEmptyPNG(c)
		return
	}

	logoPath := series.LogoPath
	if logoPath == "" && series.FolderPath != "" {
		logoExts := []string{".png", ".jpg", ".jpeg", ".webp"}
		for _, ext := range logoExts {
			candidate := filepath.Join(series.FolderPath, "logo"+ext)
			if _, statErr := os.Stat(candidate); statErr == nil {
				logoPath = candidate
				break
			}
		}
	}

	if logoPath == "" {
		serveEmptyPNG(c)
		return
	}

	fileInfo, statErr := os.Stat(logoPath)
	if statErr != nil {
		serveEmptyPNG(c)
		return
	}

	etag := fmt.Sprintf(`"%x-%x"`, fileInfo.ModTime().UnixNano(), fileInfo.Size())
	c.Header("ETag", etag)

	if match := c.GetHeader("If-None-Match"); match == etag {
		c.Status(http.StatusNotModified)
		return
	}

	ext := strings.ToLower(filepath.Ext(logoPath))
	switch ext {
	case ".jpg", ".jpeg":
		c.Header("Content-Type", "image/jpeg")
	case ".png":
		c.Header("Content-Type", "image/png")
	case ".webp":
		c.Header("Content-Type", "image/webp")
	default:
		c.Header("Content-Type", "application/octet-stream")
	}

	c.Header("Cache-Control", "public, max-age=86400, must-revalidate")
	c.File(logoPath)
}

// SeasonPoster 获取季海报图片
func (h *SeriesHandler) SeasonPoster(c *gin.Context) {
	seriesID := c.Param("id")
	seasonNum, _ := strconv.Atoi(c.Param("season"))
	posterPath, err := h.seriesService.GetSeasonPosterPath(seriesID, seasonNum)
	if err != nil || posterPath == "" {
		serveEmptyPNG(c)
		return
	}

	fileInfo, statErr := os.Stat(posterPath)
	if statErr != nil {
		serveEmptyPNG(c)
		return
	}

	etag := fmt.Sprintf(`"%x-%x"`, fileInfo.ModTime().UnixNano(), fileInfo.Size())
	c.Header("ETag", etag)

	if match := c.GetHeader("If-None-Match"); match == etag {
		c.Status(http.StatusNotModified)
		return
	}

	ext := strings.ToLower(filepath.Ext(posterPath))
	switch ext {
	case ".jpg", ".jpeg":
		c.Header("Content-Type", "image/jpeg")
	case ".png":
		c.Header("Content-Type", "image/png")
	case ".webp":
		c.Header("Content-Type", "image/webp")
	default:
		c.Header("Content-Type", "application/octet-stream")
	}

	c.Header("Cache-Control", "public, max-age=86400, must-revalidate")
	c.File(posterPath)
}

// GetPersons 获取剧集合集的演职人员列表
func (h *SeriesHandler) GetPersons(c *gin.Context) {
	seriesID := c.Param("id")
	persons, err := h.mediaPersonRepo.ListBySeriesID(seriesID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
		return
	}

	// 去重：按 person_id + role 去重，同时按 Person.TMDbID + role 兜底
	seen := make(map[string]bool)
	tmdbSeen := make(map[int]map[string]bool) // tmdbID -> role -> seen
	deduped := make([]interface{}, 0, len(persons))
	for _, p := range persons {
		key := p.PersonID + ":" + p.Role
		if seen[key] {
			continue
		}
		// TMDbID 兜底：同 TMDbID + role 视为同一人
		if p.Person.TMDbID > 0 {
			if tmdbSeen[p.Person.TMDbID] == nil {
				tmdbSeen[p.Person.TMDbID] = make(map[string]bool)
			}
			if tmdbSeen[p.Person.TMDbID][p.Role] {
				continue
			}
			tmdbSeen[p.Person.TMDbID][p.Role] = true
		}
		seen[key] = true
		deduped = append(deduped, p)
	}

	c.JSON(http.StatusOK, gin.H{"data": deduped})
}
