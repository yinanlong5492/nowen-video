package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/nowen-video/nowen-video/internal/service"
	"go.uber.org/zap"
)

// MetadataHandler 元数据处理器
type MetadataHandler struct {
	metadataService *service.MetadataService
	logger          *zap.SugaredLogger
}

// ScrapeMedia 手动刮削单个媒体的元数据
func (h *MetadataHandler) ScrapeMedia(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		ReplaceImages bool   `json:"replace_images"`
		Mode          string `json:"mode"`
	}
	_ = c.ShouldBindJSON(&req)

	if err := h.metadataService.ScrapeMediaWithMode(id, req.ReplaceImages, req.Mode); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "元数据刮削失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "元数据刮削成功"})
}
