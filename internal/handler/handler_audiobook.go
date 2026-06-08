package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/nowen-video/nowen-video/internal/service"
	"go.uber.org/zap"
)

type AudioBookHandler struct {
	service *service.AudioBookService
	logger  *zap.SugaredLogger
}

func (h *AudioBookHandler) ListBooks(c *gin.Context) {
	libraryID := c.Query("library_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "30"))

	books, total, err := h.service.ListBooks(libraryID, page, size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": books, "total": total, "page": page, "size": size})
}

// ScrapeBook 刮削有声书元数据
func (h *AudioBookHandler) ScrapeBook(c *gin.Context) {
	id := c.Param("id")

	go func() {
		if _, err := h.service.ScrapeBook(id); err != nil {
			h.logger.Errorf("[AudioBook] 刮削失败: id=%s, error=%v", id, err)
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": "刮削任务已提交"})
}

// ScrapeBookByXimalayaID 通过喜马拉雅ID刮削
func (h *AudioBookHandler) ScrapeBookByXimalayaID(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		XimalayaID int64 `json:"ximalaya_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.XimalayaID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供有效的 ximalaya_id"})
		return
	}

	go func() {
		if _, err := h.service.ScrapeBookByXimalayaID(id, req.XimalayaID); err != nil {
			h.logger.Errorf("[AudioBook] 通过ID刮削失败: id=%s, ximalaya_id=%d, error=%v", id, req.XimalayaID, err)
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": "刮削任务已提交"})
}

// ScrapeAllBooks 刮削媒体库中所有有声书
func (h *AudioBookHandler) ScrapeAllBooks(c *gin.Context) {
	libraryID := c.Param("libraryId")
	if libraryID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少媒体库ID"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "批量刮削任务已提交"})

	go func() {
		if err := h.service.ScrapeAllBooks(libraryID); err != nil {
			h.logger.Errorf("[AudioBook] 批量刮削失败: libraryId=%s, error=%v", libraryID, err)
		}
	}()
}

// SearchXimalayaAlbums 搜索喜马拉雅专辑（供前端交互式选择）
func (h *AudioBookHandler) SearchXimalayaAlbums(c *gin.Context) {
	keyword := c.Query("q")
	if keyword == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "搜索关键词不能为空"})
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))

	results, total, err := h.service.SearchXimalayaAlbums(keyword, page)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": results, "total": total, "page": page})
}

func (h *AudioBookHandler) GetBook(c *gin.Context) {
	id := c.Param("id")
	book, err := h.service.GetBook(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "有声书不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": book})
}

var allowedUpdateFields = map[string]bool{
	"title": true, "author": true, "narrator": true, "publisher": true,
	"description": true, "series_name": true, "genres": true, "category": true,
	"language": true, "isbn": true, "rating": true, "year": true,
	"orig_title": true, "sub_title": true, "sort_title": true,
	"content_rating": true, "copyright": true, "tags": true,
	"release_date": true, "update_date": true,
}

func (h *AudioBookHandler) UpdateBook(c *gin.Context) {
	id := c.Param("id")
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}

	for key := range updates {
		if !allowedUpdateFields[key] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不允许更新字段: " + key})
			return
		}
	}

	book, err := h.service.UpdateBook(id, updates)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": book, "message": "有声书元数据已更新"})
}

func (h *AudioBookHandler) DeleteBook(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteBook(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "已删除"})
}

func (h *AudioBookHandler) UpdatePlayPosition(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Position float64 `json:"position"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数无效"})
		return
	}
	if err := h.service.UpdatePlayPosition(id, req.Position); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "播放进度已更新"})
}

func (h *AudioBookHandler) GetChapters(c *gin.Context) {
	id := c.Param("id")
	chapters, err := h.service.GetChapterList(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": chapters})
}

func (h *AudioBookHandler) StreamAudio(c *gin.Context) {
	id := c.Param("id")
	book, err := h.service.GetBook(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "有声书不存在"})
		return
	}

	h.logger.Debugf("[AudioBook] 请求流播放: %s - %s", book.ID, book.Title)
	h.service.UpdatePlayPosition(id, 0)

	if err := h.service.StreamAudio(id, c.Writer, c.Request); err != nil {
		h.logger.Errorf("[AudioBook] 流播放失败: id=%s, error=%v", id, err)
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("音频文件不存在: %v", err)})
	}
}

func (h *AudioBookHandler) GetCover(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.ServeCover(id, c.Writer, c.Request); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "封面不存在"})
	}
}

func (h *AudioBookHandler) SearchBooks(c *gin.Context) {
	keyword := c.Query("q")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "30"))

	books, total, err := h.service.SearchBooks(keyword, page, size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": books, "total": total, "page": page, "size": size})
}
