package handler

import (
	"fmt"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/nowen-video/nowen-video/internal/service"
	"go.uber.org/zap"
)

// ==================== 多用户配置文件 Handler ====================

type UserProfileHandler struct {
	profileService *service.UserProfileService
	logger         *zap.SugaredLogger
}

func (h *UserProfileHandler) ListProfiles(c *gin.Context) {
	userID := c.GetString("user_id")
	profiles, err := h.profileService.ListProfiles(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": profiles})
}

func (h *UserProfileHandler) CreateProfile(c *gin.Context) {
	userID := c.GetString("user_id")
	var profile service.UserProfile
	if err := c.ShouldBindJSON(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}
	if err := h.profileService.CreateProfile(userID, &profile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "配置文件已创建", "data": profile})
}

func (h *UserProfileHandler) GetProfile(c *gin.Context) {
	profileID := c.Param("id")
	profile, err := h.profileService.GetProfile(profileID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "配置文件不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": profile})
}

func (h *UserProfileHandler) UpdateProfile(c *gin.Context) {
	profileID := c.Param("id")
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}
	if err := h.profileService.UpdateProfile(profileID, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "配置文件已更新"})
}

func (h *UserProfileHandler) DeleteProfile(c *gin.Context) {
	profileID := c.Param("id")
	if err := h.profileService.DeleteProfile(profileID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "配置文件已删除"})
}

func (h *UserProfileHandler) SwitchProfile(c *gin.Context) {
	profileID := c.Param("id")
	var req struct {
		PIN string `json:"pin"`
	}
	c.ShouldBindJSON(&req)
	profile, err := h.profileService.SwitchProfile(profileID, req.PIN)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": profile})
}

func (h *UserProfileHandler) GetWatchLogs(c *gin.Context) {
	profileID := c.Param("id")
	days, _ := strconv.Atoi(c.DefaultQuery("days", "7"))
	logs, err := h.profileService.GetWatchLogs(profileID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": logs})
}

func (h *UserProfileHandler) GetDailyUsage(c *gin.Context) {
	profileID := c.Param("id")
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	usage, err := h.profileService.GetDailyUsage(profileID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": usage})
}

func (h *UserProfileHandler) GetProfileStats(c *gin.Context) {
	profileID := c.Param("id")
	stats := h.profileService.GetProfileStats(profileID)
	c.JSON(http.StatusOK, gin.H{"data": stats})
}

// ==================== 离线下载 Handler ====================

type OfflineDownloadHandler struct {
	downloadService *service.OfflineDownloadService
	logger          *zap.SugaredLogger
}

func (h *OfflineDownloadHandler) CreateDownload(c *gin.Context) {
	userID := c.GetString("user_id")
	var req struct {
		MediaID  string `json:"media_id"`
		Title    string `json:"title"`
		FileSize int64  `json:"file_size"`
		FilePath string `json:"file_path"`
		Quality  string `json:"quality"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}
	task, err := h.downloadService.CreateDownload(userID, req.MediaID, req.Title, req.FileSize, req.FilePath, req.Quality)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "下载任务已创建", "data": task})
}

func (h *OfflineDownloadHandler) BatchDownload(c *gin.Context) {
	userID := c.GetString("user_id")
	var req service.BatchDownloadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}
	tasks, errors := h.downloadService.BatchCreateDownloads(userID, req)
	c.JSON(http.StatusOK, gin.H{"data": tasks, "errors": errors})
}

func (h *OfflineDownloadHandler) ListDownloads(c *gin.Context) {
	userID := c.GetString("user_id")
	status := c.Query("status")
	tasks, err := h.downloadService.GetUserDownloads(userID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": tasks})
}

func (h *OfflineDownloadHandler) GetQueueInfo(c *gin.Context) {
	userID := c.GetString("user_id")
	info, err := h.downloadService.GetQueueInfo(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": info})
}

func (h *OfflineDownloadHandler) CancelDownload(c *gin.Context) {
	userID := c.GetString("user_id")
	taskID := c.Param("id")
	if err := h.downloadService.CancelDownload(taskID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "下载已取消"})
}

func (h *OfflineDownloadHandler) PauseDownload(c *gin.Context) {
	userID := c.GetString("user_id")
	taskID := c.Param("id")
	if err := h.downloadService.PauseDownload(taskID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "下载已暂停"})
}

func (h *OfflineDownloadHandler) ResumeDownload(c *gin.Context) {
	userID := c.GetString("user_id")
	taskID := c.Param("id")
	if err := h.downloadService.ResumeDownload(taskID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "下载已恢复"})
}

func (h *OfflineDownloadHandler) DeleteDownload(c *gin.Context) {
	userID := c.GetString("user_id")
	taskID := c.Param("id")
	if err := h.downloadService.DeleteDownload(taskID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "下载已删除"})
}

// ==================== 插件系统 Handler ====================

type PluginHandler struct {
	pluginService *service.PluginService
	logger        *zap.SugaredLogger
}

func (h *PluginHandler) ListPlugins(c *gin.Context) {
	plugins, err := h.pluginService.ListPlugins()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": plugins})
}

func (h *PluginHandler) GetPlugin(c *gin.Context) {
	pluginID := c.Param("id")
	info, manifest, err := h.pluginService.GetPlugin(pluginID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "插件不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": info, "manifest": manifest})
}

func (h *PluginHandler) EnablePlugin(c *gin.Context) {
	pluginID := c.Param("id")
	if err := h.pluginService.EnablePlugin(pluginID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "插件已启用"})
}

func (h *PluginHandler) DisablePlugin(c *gin.Context) {
	pluginID := c.Param("id")
	if err := h.pluginService.DisablePlugin(pluginID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "插件已禁用"})
}

func (h *PluginHandler) UninstallPlugin(c *gin.Context) {
	pluginID := c.Param("id")
	if err := h.pluginService.UninstallPlugin(pluginID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "插件已卸载"})
}

func (h *PluginHandler) UpdatePluginConfig(c *gin.Context) {
	pluginID := c.Param("id")
	var config map[string]interface{}
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的配置"})
		return
	}
	if err := h.pluginService.UpdatePluginConfig(pluginID, config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "插件配置已更新"})
}

func (h *PluginHandler) ScanPlugins(c *gin.Context) {
	discovered, err := h.pluginService.ScanPluginDir()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": discovered})
}

// ==================== 音乐库 Handler ====================

// musicCoverPlaceholderSVG 音乐封面占位图 SVG
const musicCoverPlaceholderSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <defs>
    <linearGradient id="musicBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1b2e"/>
      <stop offset="100%" stop-color="#0f1019"/>
    </linearGradient>
    <linearGradient id="musicIcon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ec4899" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.25"/>
    </linearGradient>
  </defs>
  <rect fill="url(#musicBg)" width="300" height="300" rx="0"/>
  <rect x="0" y="0" width="300" height="300" fill="url(#musicIcon)" opacity="0.08"/>
  <!-- 音乐图标 -->
  <g transform="translate(150,140)" fill="none" stroke="#4a5568" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">
    <path d="M-30,-30 L-30,20 Q-30,25 -25,25 L-5,25 Q0,25 0,20 L0,-30"/>
    <circle cx="15" cy="20" r="10"/>
    <circle cx="-15" cy="20" r="10"/>
    <path d="M0,-30 L0,-20 Q0,-25 5,-25 L35,-25"/>
    <line x1="20" y1="-25" x2="20" y2="10"/>
  </g>
  <text fill="#4a5568" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="12" font-weight="500" text-anchor="middle" x="150" y="195">暂无封面</text>
</svg>`

type MusicHandler struct {
	musicService *service.MusicService
	logger       *zap.SugaredLogger
}

func (h *MusicHandler) ListTracks(c *gin.Context) {
	libraryID := c.Query("library_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "50"))
	sort := c.DefaultQuery("sort", "artist")

	tracks, total, err := h.musicService.ListTracks(libraryID, page, size, sort)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": tracks, "total": total, "page": page, "size": size})
}

func (h *MusicHandler) ListAlbums(c *gin.Context) {
	libraryID := c.Query("library_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "30"))
	sort := c.DefaultQuery("sort", "artist")

	albums, total, err := h.musicService.ListAlbums(libraryID, page, size, sort)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": albums, "total": total, "page": page, "size": size})
}

func (h *MusicHandler) GetAlbum(c *gin.Context) {
	albumID := c.Param("id")
	album, err := h.musicService.GetAlbumWithTracks(albumID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "专辑不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": album})
}

// UpdateAlbum 更新专辑元数据
func (h *MusicHandler) UpdateAlbum(c *gin.Context) {
	albumID := c.Param("id")
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	album, err := h.musicService.UpdateAlbum(albumID, updates)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": album, "message": "专辑元数据已更新"})
}

// UpdateArtist 更新艺术家元数据
func (h *MusicHandler) UpdateArtist(c *gin.Context) {
	var req struct {
		LibraryID  string                 `json:"library_id" binding:"required"`
		ArtistName string                 `json:"artist_name" binding:"required"`
		Updates    map[string]interface{} `json:"updates" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	count, err := h.musicService.UpdateArtistTracks(req.LibraryID, req.ArtistName, req.Updates)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"updated_count": count}, "message": "艺术家元数据已更新"})
}

func (h *MusicHandler) SearchMusic(c *gin.Context) {
	query := c.Query("q")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	tracks, err := h.musicService.SearchMusic(query, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": tracks})
}

func (h *MusicHandler) GetLyrics(c *gin.Context) {
	trackID := c.Param("id")

	lyrics, err := h.musicService.GetLyrics(trackID)
	if err != nil {
		h.logger.Errorf("[GetLyrics] 获取歌词失败: trackID=%s, error=%v", trackID, err)
		errMsg := err.Error()
		// 区分不同类型的错误
		if strings.Contains(errMsg, "record not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "歌曲不存在"})
		} else if strings.Contains(errMsg, "未找到歌词") ||
			strings.Contains(errMsg, "cannot find the file") ||
			strings.Contains(errMsg, "no such file or directory") {
			c.JSON(http.StatusNotFound, gin.H{"error": "未找到歌词"})
		} else if strings.Contains(errMsg, "permission denied") {
			c.JSON(http.StatusForbidden, gin.H{"error": "无法读取歌词文件（权限不足）"})
		} else {
			// 其他未知错误
			c.JSON(http.StatusInternalServerError, gin.H{"error": "服务器内部错误: " + errMsg})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": lyrics})
}

func (h *MusicHandler) ToggleLove(c *gin.Context) {
	trackID := c.Param("id")
	loved, err := h.musicService.ToggleLove(trackID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"loved": loved})
}

func (h *MusicHandler) ScanLibrary(c *gin.Context) {
	var req struct {
		LibraryID string   `json:"library_id"`
		Path      string   `json:"path"`
		Paths     []string `json:"paths"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}
	// 支持旧的单个路径和新的多个路径
	var paths []string
	if len(req.Paths) > 0 {
		paths = req.Paths
	} else if req.Path != "" {
		paths = []string{req.Path}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供路径"})
		return
	}
	count, err := h.musicService.ScanMusicLibrary(req.LibraryID, paths)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "扫描完成", "count": count})
}

func (h *MusicHandler) RemoveDuplicates(c *gin.Context) {
	libraryID := c.Query("library_id")
	if libraryID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供library_id"})
		return
	}
	removedTracks, err := h.musicService.RemoveDuplicateTracks(libraryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	removedAlbums, err := h.musicService.RemoveDuplicateAlbums(libraryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":        "清理完成",
		"removed_tracks": removedTracks,
		"removed_albums": removedAlbums,
	})
}

func (h *MusicHandler) ListPlaylists(c *gin.Context) {
	userID := c.GetString("user_id")
	playlists, err := h.musicService.ListPlaylists(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": playlists})
}

func (h *MusicHandler) CreatePlaylist(c *gin.Context) {
	userID := c.GetString("user_id")
	var req struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}
	playlist, err := h.musicService.CreatePlaylist(userID, req.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": playlist})
}

func (h *MusicHandler) GetPlaylist(c *gin.Context) {
	playlistID := c.Param("id")
	playlist, err := h.musicService.GetPlaylistWithTracks(playlistID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "播放列表不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": playlist})
}

func (h *MusicHandler) AddToPlaylist(c *gin.Context) {
	playlistID := c.Param("id")
	var req struct {
		TrackIDs []string `json:"track_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}
	if err := h.musicService.AddToPlaylist(playlistID, req.TrackIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "已添加到播放列表"})
}

// StreamTrack 音频流播放
func (h *MusicHandler) StreamTrack(c *gin.Context) {
	trackID := c.Param("id")

	var track service.MusicTrack
	if err := h.musicService.GetTrack(trackID, &track); err != nil {
		h.logger.Errorf("[StreamTrack] 曲目不存在: trackID=%s, error=%v", trackID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "曲目不存在"})
		return
	}

	h.musicService.IncrementPlayCount(trackID)

	var filePath string
	candidates := []string{
		track.FilePath,
		filepath.FromSlash(track.FilePath),
	}

	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			filePath = candidate
			break
		}
	}

	if filePath == "" {
		h.logger.Errorf("[StreamTrack] 所有路径都不存在: %v", candidates)
		c.JSON(http.StatusNotFound, gin.H{"error": "音频文件不存在"})
		return
	}

	ext := filepath.Ext(filePath)
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "audio/mpeg"
	}

	c.Header("Content-Type", contentType)
	c.Header("Accept-Ranges", "bytes")
	c.Header("Cache-Control", "public, max-age=86400")

	// 使用 http.ServeFile 自动处理 Range 请求（断点续播、拖动进度条）
	http.ServeFile(c.Writer, c.Request, filePath)
}

// GetTrackCover 曲目封面
func (h *MusicHandler) GetTrackCover(c *gin.Context) {
	trackID := c.Param("id")

	var track service.MusicTrack
	if err := h.musicService.GetTrack(trackID, &track); err != nil {
		h.serveMusicCoverPlaceholder(c)
		return
	}

	var coverPath string
	var baseName string
	if track.FilePath != "" {
		baseName = strings.TrimSuffix(filepath.Base(track.FilePath), filepath.Ext(track.FilePath))
	}

	if track.CoverPath != "" {
		coverPath = h.resolvePath(track.CoverPath)
	} else if track.Album != "" {
		var siblingTrack service.MusicTrack
		err := h.musicService.GetDB().Where("library_id = ? AND album = ? AND cover_path != ?", track.LibraryID, track.Album, "").First(&siblingTrack).Error
		if err == nil {
			coverPath = h.resolvePath(siblingTrack.CoverPath)
		}
	}

	if coverPath == "" && track.FilePath != "" {
		coverPath = h.findCoverFromFileSystem(track.FilePath, baseName)
	}

	if coverPath == "" && track.FilePath != "" {
		dir := filepath.Dir(track.FilePath)
		if extractedPath := h.musicService.ExtractEmbeddedCover(track.FilePath, dir); extractedPath != "" {
			coverPath = h.resolvePath(extractedPath)
			if coverPath != "" {
				h.musicService.GetDB().Model(&track).Update("cover_path", extractedPath)
			}
		}
	}

	if coverPath == "" {
		h.serveMusicCoverPlaceholder(c)
		return
	}

	if _, err := os.Stat(coverPath); os.IsNotExist(err) {
		h.serveMusicCoverPlaceholder(c)
		return
	}

	h.serveMusicCoverFile(c, coverPath)
}

// GetAlbumCover 专辑封面
func (h *MusicHandler) GetAlbumCover(c *gin.Context) {
	albumID := c.Param("id")

	album, err := h.musicService.GetAlbumWithTracks(albumID)
	if err != nil {
		h.serveMusicCoverPlaceholder(c)
		return
	}

	var coverPath string
	var baseName string
	var trackFilePath string
	if len(album.Tracks) > 0 && album.Tracks[0].FilePath != "" {
		baseName = strings.TrimSuffix(filepath.Base(album.Tracks[0].FilePath), filepath.Ext(album.Tracks[0].FilePath))
		trackFilePath = album.Tracks[0].FilePath
	}

	if album.CoverPath != "" {
		coverPath = h.resolvePath(album.CoverPath)
	} else {
		for _, t := range album.Tracks {
			if t.CoverPath != "" {
				coverPath = h.resolvePath(t.CoverPath)
				break
			}
		}
	}

	if coverPath == "" && trackFilePath != "" {
		coverPath = h.findCoverFromFileSystem(trackFilePath, baseName)
	}

	if coverPath == "" && trackFilePath != "" {
		dir := filepath.Dir(trackFilePath)
		if extractedPath := h.musicService.ExtractEmbeddedCover(trackFilePath, dir); extractedPath != "" {
			coverPath = h.resolvePath(extractedPath)
		}
	}

	if coverPath == "" {
		h.serveMusicCoverPlaceholder(c)
		return
	}

	if _, err := os.Stat(coverPath); os.IsNotExist(err) {
		h.serveMusicCoverPlaceholder(c)
		return
	}

	h.serveMusicCoverFile(c, coverPath)
}

// serveMusicCoverPlaceholder 提供音乐封面占位图
func (h *MusicHandler) serveMusicCoverPlaceholder(c *gin.Context) {
	c.Header("Content-Type", "image/svg+xml")
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Header("Pragma", "no-cache")
	c.Header("X-Cover-Placeholder", "true")
	c.String(http.StatusOK, musicCoverPlaceholderSVG)
}

// serveMusicCoverFile 提供音乐封面文件
func (h *MusicHandler) serveMusicCoverFile(c *gin.Context, coverPath string) {
	fileInfo, statErr := os.Stat(coverPath)
	if statErr != nil {
		h.logger.Warnf("[serveMusicCoverFile] 无法获取文件信息: %v", statErr)
		h.serveMusicCoverPlaceholder(c)
		return
	}

	etag := fmt.Sprintf(`"%x-%x"`, fileInfo.ModTime().UnixNano(), fileInfo.Size())
	c.Header("ETag", etag)
	if match := c.GetHeader("If-None-Match"); match == etag {
		c.Status(http.StatusNotModified)
		return
	}

	setMusicCoverContentType(c, coverPath)
	c.Header("Cache-Control", "public, max-age=86400, must-revalidate")
	c.File(coverPath)
}

// setMusicCoverContentType 根据扩展名设置音乐封面 Content-Type
func setMusicCoverContentType(c *gin.Context, coverPath string) {
	ext := strings.ToLower(filepath.Ext(coverPath))
	switch ext {
	case ".jpg", ".jpeg":
		c.Header("Content-Type", "image/jpeg")
	case ".png":
		c.Header("Content-Type", "image/png")
	case ".webp":
		c.Header("Content-Type", "image/webp")
	case ".gif":
		c.Header("Content-Type", "image/gif")
	case ".bmp":
		c.Header("Content-Type", "image/bmp")
	default:
		c.Header("Content-Type", "application/octet-stream")
	}
}

// findCoverFromFileSystem 从文件系统查找封面
func (h *MusicHandler) findCoverFromFileSystem(trackFilePath string, baseName string) string {
	if trackFilePath == "" {
		return ""
	}

	// 获取目录并确保是有效目录
	dir := h.resolvePath(filepath.Dir(trackFilePath))

	if _, err := os.Stat(dir); os.IsNotExist(err) {
		// 尝试另一种方式解析目录
		altDir := h.resolvePath(trackFilePath)
		altDir = filepath.Dir(altDir)
		if _, err := os.Stat(altDir); !os.IsNotExist(err) {
			dir = altDir
		} else {
			return ""
		}
	}

	coverExts := []string{".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
	coverNames := []string{}
	if baseName != "" {
		coverNames = append(coverNames, baseName)
	}
	coverNames = append(coverNames, "cover", "folder", "album", "artwork", "front", "art", "poster")

	for _, coverName := range coverNames {
		for _, ext := range coverExts {
			coverPath := filepath.Join(dir, coverName+ext)
			if _, err := os.Stat(coverPath); err == nil {
				return coverPath
			}
		}
	}

	return ""
}

// resolvePath 尝试多种方式解析路径为有效文件路径
func (h *MusicHandler) resolvePath(path string) string {
	candidates := []string{
		path,
		filepath.FromSlash(path),
	}

	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}

	return filepath.FromSlash(path)
}

// ==================== 图片库 Handler ====================

type PhotoHandler struct {
	photoService *service.PhotoService
	logger       *zap.SugaredLogger
}

func (h *PhotoHandler) ListPhotos(c *gin.Context) {
	libraryID := c.Query("library_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "50"))
	sort := c.DefaultQuery("sort", "date_desc")

	filters := map[string]string{
		"album_id": c.Query("album_id"),
		"tag":      c.Query("tag"),
		"scene":    c.Query("scene"),
		"favorite": c.Query("favorite"),
	}

	photos, total, err := h.photoService.ListPhotos(libraryID, page, size, sort, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": photos, "total": total, "page": page, "size": size})
}

func (h *PhotoHandler) GetPhoto(c *gin.Context) {
	photoID := c.Param("id")
	photo, err := h.photoService.GetPhoto(photoID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "照片不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": photo})
}

func (h *PhotoHandler) ListAlbums(c *gin.Context) {
	userID := c.GetString("user_id")
	albums, err := h.photoService.ListAlbums(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": albums})
}

func (h *PhotoHandler) CreateAlbum(c *gin.Context) {
	userID := c.GetString("user_id")
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}
	album, err := h.photoService.CreateAlbum(userID, req.Name, req.Description)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": album})
}

func (h *PhotoHandler) AddPhotosToAlbum(c *gin.Context) {
	albumID := c.Param("id")
	var req struct {
		PhotoIDs []string `json:"photo_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}
	if err := h.photoService.AddPhotosToAlbum(albumID, req.PhotoIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "照片已添加到相册"})
}

func (h *PhotoHandler) ToggleFavorite(c *gin.Context) {
	photoID := c.Param("id")
	fav, err := h.photoService.ToggleFavorite(photoID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"is_favorite": fav})
}

func (h *PhotoHandler) SetRating(c *gin.Context) {
	photoID := c.Param("id")
	var req struct {
		Rating int `json:"rating"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}
	if err := h.photoService.SetRating(photoID, req.Rating); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "评分已更新"})
}

func (h *PhotoHandler) SearchPhotos(c *gin.Context) {
	query := c.Query("q")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	photos, err := h.photoService.SearchPhotos(query, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": photos})
}

func (h *PhotoHandler) GetStats(c *gin.Context) {
	libraryID := c.Query("library_id")
	stats := h.photoService.GetPhotoStats(libraryID)
	c.JSON(http.StatusOK, gin.H{"data": stats})
}

func (h *PhotoHandler) ScanLibrary(c *gin.Context) {
	var req struct {
		LibraryID string `json:"library_id"`
		Path      string `json:"path"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}
	count, err := h.photoService.ScanPhotoLibrary(req.LibraryID, req.Path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "扫描完成", "count": count})
}

// ==================== 联邦架构 Handler ====================

type FederationHandler struct {
	federationService *service.FederationService
	logger            *zap.SugaredLogger
}

func (h *FederationHandler) ListNodes(c *gin.Context) {
	nodes, err := h.federationService.ListNodes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": nodes})
}

func (h *FederationHandler) RegisterNode(c *gin.Context) {
	var req struct {
		Name   string `json:"name"`
		URL    string `json:"url"`
		APIKey string `json:"api_key"`
		Role   string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求参数"})
		return
	}
	node, err := h.federationService.RegisterNode(req.Name, req.URL, req.APIKey, req.Role)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "节点已注册", "data": node})
}

func (h *FederationHandler) RemoveNode(c *gin.Context) {
	nodeID := c.Param("id")
	if err := h.federationService.RemoveNode(nodeID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "节点已移除"})
}

func (h *FederationHandler) SyncNode(c *gin.Context) {
	nodeID := c.Param("id")
	syncType := c.DefaultQuery("type", "full")
	task, err := h.federationService.SyncFromNode(nodeID, syncType)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "同步已开始", "data": task})
}

func (h *FederationHandler) SearchSharedMedia(c *gin.Context) {
	query := c.Query("q")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	media, total, err := h.federationService.SearchSharedMedia(query, page, size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": media, "total": total})
}

func (h *FederationHandler) GetSharedMediaStream(c *gin.Context) {
	mediaID := c.Param("id")
	streamURL, err := h.federationService.GetSharedMediaStream(mediaID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"stream_url": streamURL})
}

func (h *FederationHandler) GetStats(c *gin.Context) {
	stats, err := h.federationService.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stats})
}

func (h *FederationHandler) GetSyncTasks(c *gin.Context) {
	nodeID := c.Query("node_id")
	tasks, err := h.federationService.GetSyncTasks(nodeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": tasks})
}

// 联邦 API 端点（供其他节点调用）
func (h *FederationHandler) Health(c *gin.Context) {
	health := h.federationService.GetLocalHealth()
	c.JSON(http.StatusOK, health)
}

func (h *FederationHandler) MediaList(c *gin.Context) {
	media, err := h.federationService.GetLocalMediaList()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": media})
}

// ==================== ABR Handler ====================

type ABRHandler struct {
	abrService *service.ABRService
	logger     *zap.SugaredLogger
}

func (h *ABRHandler) GetStatus(c *gin.Context) {
	status := h.abrService.GetABRStatus()
	c.JSON(http.StatusOK, gin.H{"data": status})
}

func (h *ABRHandler) GetGPUInfo(c *gin.Context) {
	info := h.abrService.GetGPUInfo()
	c.JSON(http.StatusOK, gin.H{"data": info})
}

func (h *ABRHandler) CleanCache(c *gin.Context) {
	mediaID := c.Query("media_id")
	if mediaID != "" {
		h.abrService.CleanABRCache(mediaID)
		c.JSON(http.StatusOK, gin.H{"message": "ABR 缓存已清理"})
	} else {
		size, err := h.abrService.CleanAllABRCache()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "所有 ABR 缓存已清理", "freed_bytes": size})
	}
}
