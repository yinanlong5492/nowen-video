package service

import (
	"net/http"
	"sync"
	"time"

	"github.com/nowen-video/nowen-video/internal/config"
	"github.com/nowen-video/nowen-video/internal/model"
	"github.com/nowen-video/nowen-video/internal/repository"
	"go.uber.org/zap"
)

// MetadataService 元数据刮削服务
type MetadataService struct {
	mediaRepo       *repository.MediaRepo
	seriesRepo      *repository.SeriesRepo
	personRepo      *repository.PersonRepo      // 演员信息仓储
	mediaPersonRepo *repository.MediaPersonRepo // 媒体-演员关联仓储
	logRepo         *repository.SystemLogRepo   // 系统日志仓储
	cfg             *config.Config
	logger          *zap.SugaredLogger
	client          *http.Client
	wsHub           *WSHub          // WebSocket事件广播
	douban          *DoubanService  // 豆瓣刮削服务（补充源）
	bangumi         *BangumiService // Bangumi刮削服务（补充源）
	ai              *AIService      // AI 元数据增强（第四层 Fallback）
	providerChain   *ProviderChain  // 多数据源调度链（第三阶段）
	thetvdb         *TheTVDBService // TheTVDB 剧集增强源
	nfoService      *NFOService     // 刮削成功后自动生成同名 NFO
	// 并发安全锁
	mediaLocks    map[string]*sync.Mutex
	mediaLocksMu  sync.Mutex
	seriesLocks   map[string]*sync.Mutex
	seriesLocksMu sync.Mutex
	personLocks   map[string]*sync.Mutex
	personLocksMu sync.Mutex
}

// NewMetadataService 创建元数据刮削服务
func NewMetadataService(mediaRepo *repository.MediaRepo, seriesRepo *repository.SeriesRepo, personRepo *repository.PersonRepo, mediaPersonRepo *repository.MediaPersonRepo, logRepo *repository.SystemLogRepo, cfg *config.Config, logger *zap.SugaredLogger) *MetadataService {
	s := &MetadataService{
		mediaRepo:       mediaRepo,
		seriesRepo:      seriesRepo,
		personRepo:      personRepo,
		mediaPersonRepo: mediaPersonRepo,
		logRepo:         logRepo,
		cfg:             cfg,
		logger:          logger,
		client:          buildTMDbHTTPClient(cfg, logger),
		douban:          NewDoubanService(mediaRepo, cfg, logger),
		bangumi:         NewBangumiService(mediaRepo, seriesRepo, cfg, logger),
	}
	return s
}

// SetWSHub 设置WebSocket Hub（延迟注入）
func (s *MetadataService) SetWSHub(hub *WSHub) {
	s.wsHub = hub
}

// SetAIService 设置 AI 服务（延迟注入）
func (s *MetadataService) SetAIService(ai *AIService) {
	s.ai = ai
}

// SetProviderChain 设置多数据源调度链（延迟注入）
func (s *MetadataService) SetProviderChain(chain *ProviderChain) {
	s.providerChain = chain
}

// SetTheTVDBService 设置 TheTVDB 服务（延迟注入）
func (s *MetadataService) SetTheTVDBService(thetvdb *TheTVDBService) {
	s.thetvdb = thetvdb
}

// SetNFOService 设置 NFO 写入服务（延迟注入）
func (s *MetadataService) SetNFOService(nfo *NFOService) {
	s.nfoService = nfo
}

func (s *MetadataService) logScrapeEvent(level, mediaID, mediaTitle, message, detail string) {
	if s.logRepo == nil {
		return
	}
	go func() {
		_ = s.logRepo.Create(&model.SystemLog{
			Type:       model.LogTypeScrape,
			Level:      level,
			Message:    message,
			Detail:     detail,
			MediaID:    mediaID,
			MediaTitle: mediaTitle,
			Source:     "metadata",
			CreatedAt:  time.Now(),
		})
	}()
}
