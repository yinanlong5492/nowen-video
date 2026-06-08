package service

import (
	"fmt"
	"path/filepath"
	"strconv"
	"sync"

	"github.com/google/uuid"
	"github.com/nowen-video/nowen-video/internal/model"
)

// ErrInvalidParameter 无效参数错误
var ErrInvalidParameter = fmt.Errorf("无效参数")

// ErrServiceNotConfigured 服务未配置错误
var ErrServiceNotConfigured = fmt.Errorf("服务未配置")

// ErrNilPointer 空指针错误
var ErrNilPointer = fmt.Errorf("空指针错误")

// 刮削超时常量（秒）
const ScrapeTimeout = 30

// SearchDouban 搜索豆瓣
func (s *MetadataService) SearchDouban(query string, year int) ([]DoubanSearchResult, error) {
	if err := s.ensureDependencies(s.douban, true); err != nil {
		return nil, err
	}

	if query == "" {
		return nil, fmt.Errorf("%w: 搜索关键词不能为空", ErrInvalidParameter)
	}

	s.logger.Debugf("搜索豆瓣: query=%s, year=%d", query, year)
	return s.douban.searchDouban(query, year)
}

// ValidateDoubanCookie 验证豆瓣 Cookie
func (s *MetadataService) ValidateDoubanCookie() (bool, string, error) {
	if s.douban == nil {
		return false, "", ErrServiceNotConfigured
	}
	// 尝试调用实际的验证方法，若不存在则返回默认实现
	if validator, ok := interface{}(s.douban).(interface{ ValidateCookie() error }); ok {
		if err := validator.ValidateCookie(); err != nil {
			return false, "", fmt.Errorf("Cookie 验证失败: %w", err)
		}
		return true, "Cookie 验证成功", nil
	}
	// 默认实现
	return true, "Cookie validation not implemented", nil
}

// MatchMediaWithDouban 手动匹配媒体到豆瓣
func (s *MetadataService) MatchMediaWithDouban(mediaID string, doubanID string) error {
	// 参数校验
	if err := validateMediaID(mediaID); err != nil {
		return err
	}
	if err := validateDoubanID(doubanID); err != nil {
		return err
	}

	// 依赖检查
	if err := s.ensureDependencies(s.mediaRepo, true); err != nil {
		return err
	}
	if s.douban == nil {
		return ErrServiceNotConfigured
	}

	// 获取媒体信息
	media, err := s.mediaRepo.FindByID(mediaID)
	if err != nil {
		return fmt.Errorf("数据库查询失败: %w", err)
	}
	if media == nil {
		return ErrMediaNotFound
	}

	// 并发安全 - 使用实例级锁，按 mediaID 细粒度加锁
	s.getMediaLock(mediaID).Lock()
	defer s.getMediaLock(mediaID).Unlock()

	// 重复匹配校验
	if media.DoubanID == doubanID {
		s.logger.Infof("媒体已匹配到相同的豆瓣 ID: %s -> %s", media.Title, doubanID)
		return nil
	}

	s.logger.Infof("开始手动匹配媒体到豆瓣: mediaID=%s, title=%s, doubanID=%s", mediaID, media.Title, doubanID)

	// 使用原生值拷贝备份原始数据（最优性能）
	originalMedia := *media

	// 执行刮削（带超时保护）
	if err := s.douban.ScrapeMedia(media, doubanID, ScrapeTimeout); err != nil {
		// 刮削失败，恢复原始数据
		*media = originalMedia
		s.logger.Errorf("豆瓣刮削失败，已恢复原始数据: %s - %v", media.Title, err)
		return fmt.Errorf("豆瓣刮削失败: %w", err)
	}

	// 保存到数据库
	if err := s.mediaRepo.Update(media); err != nil {
		*media = originalMedia
		s.logger.Errorf("保存媒体失败，已恢复原始数据: %s - %v", media.Title, err)
		return fmt.Errorf("保存媒体失败: %w", err)
	}

	// 生成 NFO 文件
	s.writeNFOAfterScrape(media)

	s.logger.Infof("媒体匹配成功: %s -> 豆瓣 ID %s", media.Title, doubanID)
	return nil
}

// MatchSeriesWithDouban 手动匹配剧集到豆瓣
func (s *MetadataService) MatchSeriesWithDouban(seriesID string, doubanID string) error {
	// 参数校验
	if err := validateSeriesID(seriesID); err != nil {
		return err
	}
	if err := validateDoubanID(doubanID); err != nil {
		return err
	}

	// 依赖检查
	if err := s.ensureDependencies(s.seriesRepo, true); err != nil {
		return err
	}

	// 获取剧集信息
	series, err := s.seriesRepo.FindByID(seriesID)
	if err != nil {
		return fmt.Errorf("数据库查询失败: %w", err)
	}
	if series == nil {
		return fmt.Errorf("剧集不存在")
	}

	// 并发安全 - 使用实例级锁，按 seriesID 细粒度加锁
	s.getSeriesLock(seriesID).Lock()
	defer s.getSeriesLock(seriesID).Unlock()

	// 重复匹配校验
	if series.DoubanID == doubanID {
		s.logger.Infof("剧集已匹配到相同的豆瓣 ID: %s -> %s", series.Title, doubanID)
		return nil
	}

	s.logger.Infof("开始手动匹配剧集到豆瓣: seriesID=%s, title=%s, doubanID=%s", seriesID, series.Title, doubanID)

	// 设置豆瓣ID并保存
	series.DoubanID = doubanID
	if err := s.seriesRepo.Update(series); err != nil {
		return fmt.Errorf("保存剧集失败: %w", err)
	}

	s.logger.Infof("剧集匹配成功: %s -> 豆瓣 ID %s", series.Title, doubanID)
	return nil
}

// SearchTheTVDB 搜索 TheTVDB
func (s *MetadataService) SearchTheTVDB(query string, year int) ([]TheTVDBSeries, error) {
	if query == "" {
		return nil, fmt.Errorf("%w: 搜索关键词不能为空", ErrInvalidParameter)
	}
	return nil, fmt.Errorf("TheTVDB 服务未配置")
}

// MatchSeriesWithTheTVDB 手动匹配剧集到 TheTVDB
func (s *MetadataService) MatchSeriesWithTheTVDB(seriesID string, tvdbID int) error {
	// 参数校验
	if err := validateSeriesID(seriesID); err != nil {
		return err
	}
	if tvdbID <= 0 {
		return fmt.Errorf("%w: TVDB ID 必须大于 0", ErrInvalidParameter)
	}

	// 依赖检查
	if err := s.ensureDependencies(s.seriesRepo, true); err != nil {
		return err
	}

	// 获取剧集信息
	series, err := s.seriesRepo.FindByID(seriesID)
	if err != nil {
		return fmt.Errorf("数据库查询失败: %w", err)
	}
	if series == nil {
		return fmt.Errorf("剧集不存在")
	}

	// 并发安全 - 使用实例级锁，按 seriesID 细粒度加锁
	s.getSeriesLock(seriesID).Lock()
	defer s.getSeriesLock(seriesID).Unlock()

	s.logger.Warnf("TheTVDB 剧集匹配功能尚未完全支持，仅记录匹配日志: seriesID=%s, title=%s, tvdbID=%d", seriesID, series.Title, tvdbID)

	// TVDB ID 字段尚未在 model.Series 中定义，暂时仅记录日志
	// 提示：如需完整支持，需在 model.Series 中添加 TVDBID 字段

	s.logger.Infof("剧集匹配记录成功: %s -> TheTVDB ID %d (功能待完善)", series.Title, tvdbID)
	return nil
}

// SearchBangumi 搜索 Bangumi
func (s *MetadataService) SearchBangumi(query string, subjectType int, year int) ([]BangumiSubject, error) {
	if err := s.ensureDependencies(s.bangumi, true); err != nil {
		return nil, err
	}

	if query == "" {
		return nil, fmt.Errorf("%w: 搜索关键词不能为空", ErrInvalidParameter)
	}

	s.logger.Debugf("搜索 Bangumi: query=%s, subjectType=%d, year=%d", query, subjectType, year)
	return s.bangumi.SearchSubjects(query, subjectType, year)
}

// GetBangumiSubjectDetail 获取 Bangumi 详情
func (s *MetadataService) GetBangumiSubjectDetail(subjectID int) (*BangumiSubject, error) {
	if s.bangumi == nil {
		return nil, ErrServiceNotConfigured
	}
	if subjectID <= 0 {
		return nil, fmt.Errorf("%w: subjectID 必须大于 0", ErrInvalidParameter)
	}
	return s.bangumi.GetSubjectDetail(subjectID)
}

// MatchMediaWithBangumi 手动匹配媒体到 Bangumi
func (s *MetadataService) MatchMediaWithBangumi(mediaID string, bangumiID int) error {
	// 参数校验
	if err := validateMediaID(mediaID); err != nil {
		return err
	}
	if bangumiID <= 0 {
		return fmt.Errorf("%w: Bangumi ID 必须大于 0", ErrInvalidParameter)
	}

	// 依赖检查
	if err := s.ensureDependencies(s.mediaRepo, true); err != nil {
		return err
	}
	if s.bangumi == nil {
		return ErrServiceNotConfigured
	}

	// 获取媒体信息
	media, err := s.mediaRepo.FindByID(mediaID)
	if err != nil {
		return fmt.Errorf("数据库查询失败: %w", err)
	}
	if media == nil {
		return ErrMediaNotFound
	}

	// 并发安全 - 使用实例级锁，按 mediaID 细粒度加锁
	s.getMediaLock(mediaID).Lock()
	defer s.getMediaLock(mediaID).Unlock()

	// 重复匹配校验
	if media.BangumiID == bangumiID {
		s.logger.Infof("媒体已匹配到相同的 Bangumi ID: %s -> %d", media.Title, bangumiID)
		return nil
	}

	s.logger.Infof("开始手动匹配媒体到 Bangumi: mediaID=%s, title=%s, bangumiID=%d", mediaID, media.Title, bangumiID)

	// 使用原生值拷贝备份原始数据（最优性能）
	originalMedia := *media

	// 执行刮削
	if err := s.bangumi.ScrapeMedia(media, fmt.Sprintf("%d", bangumiID), ScrapeTimeout); err != nil {
		*media = originalMedia
		s.logger.Errorf("Bangumi 刮削失败，已恢复原始数据: %s - %v", media.Title, err)
		return fmt.Errorf("Bangumi 刮削失败: %w", err)
	}

	// 保存到数据库
	if err := s.mediaRepo.Update(media); err != nil {
		*media = originalMedia
		s.logger.Errorf("保存媒体失败，已恢复原始数据: %s - %v", media.Title, err)
		return fmt.Errorf("保存媒体失败: %w", err)
	}

	// 生成 NFO 文件
	s.writeNFOAfterScrape(media)

	s.logger.Infof("媒体匹配成功: %s -> Bangumi ID %d", media.Title, bangumiID)
	return nil
}

// MatchSeriesWithBangumi 手动匹配剧集到 Bangumi
func (s *MetadataService) MatchSeriesWithBangumi(seriesID string, bangumiID int) error {
	// 参数校验
	if err := validateSeriesID(seriesID); err != nil {
		return err
	}
	if bangumiID <= 0 {
		return fmt.Errorf("%w: Bangumi ID 必须大于 0", ErrInvalidParameter)
	}

	// 依赖检查
	if err := s.ensureDependencies(s.seriesRepo, true); err != nil {
		return err
	}

	// 获取剧集信息
	series, err := s.seriesRepo.FindByID(seriesID)
	if err != nil {
		return fmt.Errorf("数据库查询失败: %w", err)
	}
	if series == nil {
		return fmt.Errorf("剧集不存在")
	}

	// 并发安全 - 使用实例级锁，按 seriesID 细粒度加锁
	s.getSeriesLock(seriesID).Lock()
	defer s.getSeriesLock(seriesID).Unlock()

	// 重复匹配校验
	if series.BangumiID == bangumiID {
		s.logger.Infof("剧集已匹配到相同的 Bangumi ID: %s -> %d", series.Title, bangumiID)
		return nil
	}

	s.logger.Infof("开始手动匹配剧集到 Bangumi: seriesID=%s, title=%s, bangumiID=%d", seriesID, series.Title, bangumiID)

	// 设置 Bangumi ID 并保存
	series.BangumiID = bangumiID
	if err := s.seriesRepo.Update(series); err != nil {
		return fmt.Errorf("保存剧集失败: %w", err)
	}

	s.logger.Infof("剧集匹配成功: %s -> Bangumi ID %d", series.Title, bangumiID)
	return nil
}

// writeNFOAfterScrape 刮削成功后写入 NFO 文件
func (s *MetadataService) writeNFOAfterScrape(media *model.Media) {
	if s.nfoService == nil || media == nil || s.logger == nil {
		return
	}

	if media.ScrapeStatus == ScrapeStatusFailed {
		return
	}

	if !hasNFOReadyMetadata(media) {
		s.logger.Debugf("媒体元数据不足，跳过 NFO 生成: %s", media.Title)
		return
	}

	// 电影类型生成 movie.nfo（Emby/Jellyfin/Kodi 标准命名）
	if media.MediaType == "movie" {
		nfoPath := filepath.Join(filepath.Dir(media.FilePath), "movie.nfo")
		if _, err := s.nfoService.WriteMediaNFO(nfoPath, media, nil, NFOWriteOptions{ExistingPolicy: NFOExistingOverwrite}); err != nil {
			s.logger.Warnf("NFO 自动生成失败（不影响刮削结果）: %s - %v", media.Title, err)
			return
		}
		s.logger.Debugf("movie.nfo 自动生成完成: %s", nfoPath)
		return
	}

	nfoPath, err := s.nfoService.WriteMediaNFO(media.FilePath, media, nil, NFOWriteOptions{ExistingPolicy: NFOExistingOverwrite})
	if err != nil {
		s.logger.Warnf("NFO 自动生成失败（不影响刮削结果）: %s - %v", media.Title, err)
		return
	}
	s.logger.Debugf("NFO 自动生成完成 (%s): %s -> %s", media.MediaType, media.Title, nfoPath)
}

// hasNFOReadyMetadata 检查媒体是否有足够的元数据生成 NFO
func hasNFOReadyMetadata(media *model.Media) bool {
	if media == nil {
		return false
	}
	return media.Title != "" && (media.Overview != "" || media.TMDbID > 0 || media.IMDbID != "")
}

// validateMediaID 校验媒体ID格式
func validateMediaID(mediaID string) error {
	if mediaID == "" {
		return fmt.Errorf("%w: mediaID 不能为空", ErrInvalidParameter)
	}
	if _, err := uuid.Parse(mediaID); err != nil {
		return fmt.Errorf("%w: mediaID 格式无效", ErrInvalidParameter)
	}
	return nil
}

// validateSeriesID 校验剧集ID格式
func validateSeriesID(seriesID string) error {
	if seriesID == "" {
		return fmt.Errorf("%w: seriesID 不能为空", ErrInvalidParameter)
	}
	if _, err := uuid.Parse(seriesID); err != nil {
		return fmt.Errorf("%w: seriesID 格式无效", ErrInvalidParameter)
	}
	return nil
}

// validateDoubanID 校验豆瓣ID格式
func validateDoubanID(doubanID string) error {
	if doubanID == "" {
		return fmt.Errorf("%w: doubanID 不能为空", ErrInvalidParameter)
	}
	if _, err := strconv.Atoi(doubanID); err != nil {
		return fmt.Errorf("%w: doubanID 格式无效", ErrInvalidParameter)
	}
	return nil
}

// getMediaLock 获取媒体级别的细粒度锁
func (s *MetadataService) getMediaLock(mediaID string) *sync.Mutex {
	s.mediaLocksMu.Lock()
	defer s.mediaLocksMu.Unlock()

	if s.mediaLocks == nil {
		s.mediaLocks = make(map[string]*sync.Mutex)
	}

	if lock, exists := s.mediaLocks[mediaID]; exists {
		return lock
	}

	lock := &sync.Mutex{}
	s.mediaLocks[mediaID] = lock
	return lock
}

// getSeriesLock 获取剧集级别的细粒度锁
func (s *MetadataService) getSeriesLock(seriesID string) *sync.Mutex {
	s.seriesLocksMu.Lock()
	defer s.seriesLocksMu.Unlock()

	if s.seriesLocks == nil {
		s.seriesLocks = make(map[string]*sync.Mutex)
	}

	if lock, exists := s.seriesLocks[seriesID]; exists {
		return lock
	}

	lock := &sync.Mutex{}
	s.seriesLocks[seriesID] = lock
	return lock
}

// ensureDependencies 检查必需依赖是否已初始化
func (s *MetadataService) ensureDependencies(repo interface{}, loggerRequired bool) error {
	if repo == nil {
		return fmt.Errorf("仓储未初始化")
	}
	if loggerRequired && s.logger == nil {
		return fmt.Errorf("logger 未初始化")
	}
	return nil
}
