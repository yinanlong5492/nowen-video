package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/saintfish/chardet"
	"go.uber.org/zap"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	CoverSearchNames     = "cover,folder,album,artwork,front,art"
	CoverImageExtensions = ".jpg,.jpeg,.png,.webp,.gif,.bmp"
	LyricExtensions      = ".lrc,.LRC,.txt,.TXT"
)

// MusicServiceConfig 音乐服务配置
type MusicServiceConfig struct {
	MaxParallelWorkers int           // 最大并行解析数
	FFprobeTimeout     time.Duration // FFprobe 超时时间
	BatchSize          int           // 批量插入大小
	RequireFFprobe     bool          // 是否强制需要 FFprobe（不可用时启动失败）
}

// DefaultMusicServiceConfig 默认配置
var DefaultMusicServiceConfig = MusicServiceConfig{
	MaxParallelWorkers: 4,
	FFprobeTimeout:     10 * time.Second,
	BatchSize:          100,
	RequireFFprobe:     false,
}

// MusicService 音乐库集成服务
// 扩展为音视频一体化媒体中心，支持音乐文件管理、播放列表、歌词显示
type MusicService struct {
	db               *gorm.DB
	logger           *zap.SugaredLogger
	scanMu           sync.RWMutex // 读锁：写操作间互斥，写锁：扫描独占
	playlistMu       sync.Mutex   // 保护播放列表操作
	albumMu          sync.RWMutex // 保护专辑操作（读多写少）
	ffprobePath      string
	ffmpegPath       string
	config           MusicServiceConfig // 配置参数
	supportedFormats map[string]bool    // 支持的音频格式（并发安全，只读）
}

// MusicMetadata 解析到的音乐元数据
type MusicMetadata struct {
	Title         string
	Artist        string
	AlbumArtist   string
	Album         string
	Genre         string
	Year          int
	TrackNum      int
	DiscNum       int
	Duration      float64
	Bitrate       int
	SampleRate    int
	Channels      int
	MusicLanguage string
	Composer      string
	Lyricist      string
	Arranger      string
	Key           string
	RecordLabel   string
}

// MusicTrack 音乐曲目
type MusicTrack struct {
	ID        string `json:"id" gorm:"primaryKey;type:text"`
	LibraryID string `json:"library_id" gorm:"index;type:text;not null"`
	AlbumID   string `json:"album_id" gorm:"index;type:text"`
	// 一、核心基础
	Title       string `json:"title" gorm:"type:text;not null"`
	OrigTitle   string `json:"orig_title" gorm:"type:text"`
	Alias       string `json:"alias" gorm:"type:text"`
	FileName    string `json:"file_name" gorm:"type:text"`
	FilePath    string `json:"file_path" gorm:"type:text;uniqueIndex:idx_tracks_file_path"`
	Artist      string `json:"artist" gorm:"type:text"`
	ArtistGroup string `json:"artist_group" gorm:"type:text"`
	Band        string `json:"band" gorm:"type:text"`
	AlbumArtist string `json:"album_artist" gorm:"type:text"`
	Album       string `json:"album" gorm:"type:text"`
	CoverPath   string `json:"cover_path" gorm:"type:text"`
	FolderLevel int    `json:"folder_level"`
	// 二、创作制作
	Lyricist       string `json:"lyricist" gorm:"type:text"`
	Composer       string `json:"composer" gorm:"type:text"`
	Arranger       string `json:"arranger" gorm:"type:text"`
	OriginalSinger string `json:"original_singer" gorm:"type:text"`
	// 三、音频属性
	Duration   float64 `json:"duration"`
	Bitrate    int     `json:"bitrate"`
	SampleRate int     `json:"sample_rate"`
	Channels   int     `json:"channels"`
	Format     string  `json:"format" gorm:"type:text"`
	FileSize   int64   `json:"file_size"`
	// 四、专辑发行
	Year             int    `json:"year"`
	AlbumReleaseDate string `json:"album_release_date" gorm:"type:text"`
	RecordLabel      string `json:"record_label" gorm:"type:text"`
	AlbumType        string `json:"album_type" gorm:"type:text"`
	// 五、分类检索标签
	MusicLanguage string `json:"music_language" gorm:"type:text"`
	Genre         string `json:"genre" gorm:"type:text"`
	Tags          string `json:"tags" gorm:"type:text"`
	Key           string `json:"key" gorm:"type:text"`
	// 六、播放自用字段
	PlayCount    int        `json:"play_count" gorm:"default:0"`
	LastPlayTime *time.Time `json:"last_play_time"`
	Loved        bool       `json:"loved" gorm:"default:false"`
	Rating       float64    `json:"rating"`
	// 七、拓展实用
	ISRC       string `json:"isrc" gorm:"type:text"`
	IsOST      bool   `json:"is_ost" gorm:"default:false"`
	Notes      string `json:"notes" gorm:"type:text"`
	LyricsPath string `json:"lyrics_path" gorm:"type:text"`
	LyricsText string `json:"lyrics_text" gorm:"type:text"`
	// 八、排序索引字段
	TrackNum int `json:"track_num"`
	DiscNum  int `json:"disc_num"`
	// .cue 文件支持
	CueFilePath string  `json:"cue_file_path" gorm:"type:text"`
	StartTime   float64 `json:"start_time" gorm:"default:0"`
	EndTime     float64 `json:"end_time" gorm:"default:0"`
	IsVirtual   bool    `json:"is_virtual" gorm:"default:false"`
	// 时间戳
	FileModTime time.Time `json:"file_mod_time"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// MusicAlbum 音乐专辑
type MusicAlbum struct {
	ID            string       `json:"id" gorm:"primaryKey;type:text"`
	LibraryID     string       `json:"library_id" gorm:"index;type:text;not null"`
	Title         string       `json:"title" gorm:"type:text;not null"`
	Artist        string       `json:"artist" gorm:"type:text"`
	Year          int          `json:"year"`
	Genre         string       `json:"genre" gorm:"type:text"`
	CoverPath     string       `json:"cover_path" gorm:"type:text"`
	FolderPath    string       `json:"folder_path" gorm:"type:text"`
	TrackCount    int          `json:"track_count"`
	TotalDuration float64      `json:"total_duration"`
	CreatedAt     time.Time    `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time    `json:"updated_at" gorm:"autoUpdateTime"`
	Tracks        []MusicTrack `json:"tracks,omitempty" gorm:"foreignKey:AlbumID"`
}

// MusicPlaylist 音乐播放列表
type MusicPlaylist struct {
	ID        string              `json:"id" gorm:"primaryKey;type:text"`
	UserID    string              `json:"user_id" gorm:"index;type:text;not null"`
	Name      string              `json:"name" gorm:"type:text;not null"`
	CoverPath string              `json:"cover_path" gorm:"type:text"`
	IsPublic  bool                `json:"is_public" gorm:"default:false"`
	CreatedAt time.Time           `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time           `json:"updated_at" gorm:"autoUpdateTime"`
	Items     []MusicPlaylistItem `json:"items,omitempty" gorm:"foreignKey:PlaylistID"`
}

// MusicPlaylistItem 播放列表项
type MusicPlaylistItem struct {
	ID         string      `json:"id" gorm:"primaryKey;type:text"`
	PlaylistID string      `json:"playlist_id" gorm:"index;type:text;not null"`
	TrackID    string      `json:"track_id" gorm:"type:text;not null"`
	SortOrder  int         `json:"sort_order"`
	CreatedAt  time.Time   `json:"created_at" gorm:"autoCreateTime"`
	Track      *MusicTrack `json:"track,omitempty" gorm:"foreignKey:TrackID"`
}

// 默认支持的音频格式
var defaultSupportedAudioFormats = map[string]bool{
	".mp3": true, ".flac": true, ".aac": true, ".m4a": true,
	".wav": true, ".ogg": true, ".wma": true, ".ape": true,
	".alac": true, ".opus": true, ".aiff": true, ".m4b": true,
	".cue": true, // CUE 音轨索引文件
}

// CueTrack .cue 文件中的单个音轨
type CueTrack struct {
	TrackNum int
	Title    string
	Artist   string
	Index01  float64 // INDEX 01 的时间（秒）
	Index00  float64 // INDEX 00 的时间（秒，可选）
}

// CueSheet .cue 文件解析结果
type CueSheet struct {
	Performer string
	Title     string
	Files     []CueFile
}

// CueFile .cue 文件中的 FILE 块
type CueFile struct {
	Filename string
	FileType string
	Tracks   []CueTrack
}

func NewMusicService(db *gorm.DB, logger *zap.SugaredLogger) (*MusicService, error) {
	return NewMusicServiceWithConfig(db, logger, DefaultMusicServiceConfig)
}

// NewMusicServiceWithConfig 使用自定义配置创建音乐服务
func NewMusicServiceWithConfig(db *gorm.DB, logger *zap.SugaredLogger, config MusicServiceConfig) (*MusicService, error) {
	if db == nil {
		return nil, fmt.Errorf("db cannot be nil")
	}
	if logger == nil {
		return nil, fmt.Errorf("logger cannot be nil")
	}
	// 设置默认值
	if config.MaxParallelWorkers <= 0 {
		config.MaxParallelWorkers = DefaultMusicServiceConfig.MaxParallelWorkers
	}
	if config.FFprobeTimeout <= 0 {
		config.FFprobeTimeout = DefaultMusicServiceConfig.FFprobeTimeout
	}
	if config.BatchSize <= 0 {
		config.BatchSize = DefaultMusicServiceConfig.BatchSize
	}

	formats := make(map[string]bool, len(defaultSupportedAudioFormats))
	for k, v := range defaultSupportedAudioFormats {
		formats[k] = v
	}

	ffprobePath, err := exec.LookPath("ffprobe")
	if err != nil {
		if config.RequireFFprobe {
			return nil, fmt.Errorf("FFprobe is required but not available: %w", err)
		}
		logger.Warnf("FFprobe 未找到，音乐元数据解析将不可用: %v", err)
		ffprobePath = "ffprobe"
	} else {
		logger.Infof("FFprobe 已就绪: %s", ffprobePath)
	}

	ffmpegPath, err := exec.LookPath("ffmpeg")
	if err != nil {
		logger.Warnf("FFmpeg 未找到，音频内嵌封面提取将不可用: %v", err)
		ffmpegPath = "ffmpeg"
	} else {
		logger.Infof("FFmpeg 已就绪: %s", ffmpegPath)
	}

	return &MusicService{db: db, logger: logger, ffprobePath: ffprobePath, ffmpegPath: ffmpegPath, config: config, supportedFormats: formats}, nil
}

// Migrate 执行数据库迁移（应在服务启动时手动调用）
func (s *MusicService) Migrate() error {
	if err := s.db.AutoMigrate(&MusicTrack{}, &MusicAlbum{}, &MusicPlaylist{}, &MusicPlaylistItem{}); err != nil {
		return err
	}
	// 添加复合索引以优化查询
	if err := s.db.Exec("CREATE INDEX IF NOT EXISTS idx_lib_album ON music_tracks(library_id, album)").Error; err != nil {
		return err
	}
	// 添加文件路径唯一索引（仅对非虚拟曲目生效，虚拟曲目由 idx_tracks_cue 保证唯一性）
	s.db.Exec("DROP INDEX IF EXISTS idx_tracks_file_path")
	if err := s.db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_file_path ON music_tracks(library_id, file_path) WHERE is_virtual = false").Error; err != nil {
		return err
	}
	s.db.Exec("DROP INDEX IF EXISTS idx_tracks_cue")
	return s.db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_cue ON music_tracks(cue_file_path, track_num) WHERE cue_file_path IS NOT NULL AND cue_file_path != ''").Error
}

// SetFFprobePath 设置 FFprobe 路径并校验
func (s *MusicService) SetFFprobePath(path string) error {
	if path == "" {
		return fmt.Errorf("ffprobe path cannot be empty")
	}

	// Windows 系统检查 .exe 后缀
	if runtime.GOOS == "windows" {
		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".exe" {
			path += ".exe"
		}
	}

	// 校验路径存在且可执行
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("ffprobe not found at %s: %w", path, err)
	}
	if info.IsDir() {
		return fmt.Errorf("ffprobe path is a directory: %s", path)
	}

	// 检查文件权限（简单检查是否有执行权限）
	if runtime.GOOS != "windows" {
		if info.Mode().Perm()&0111 == 0 {
			return fmt.Errorf("ffprobe does not have execute permission: %s", path)
		}
	}

	s.ffprobePath = path
	return nil
}

// pendingMusicTrack 待处理的音乐曲目信息（用于并行 FFprobe 和批量入库）
type pendingMusicTrack struct {
	track *MusicTrack
	path  string
	dir   string
	ext   string
}

// parseResult 解析结果
type parseResult struct {
	index    int
	metadata *MusicMetadata
	album    string
	artist   string
}

// parallelParseMetadata 使用 Worker Pool 并行执行 FFprobe 解析（无锁设计）
func (s *MusicService) parallelParseMetadata(items []pendingMusicTrack) {
	s.logger.Infof("开始并行解析 %d 首曲目元数据", len(items))
	// 并发数 = min(NumCPU, MaxParallelWorkers)，限制最大并发数防止资源耗尽
	workers := runtime.NumCPU()
	if workers < 1 {
		workers = 1
	}
	if workers > s.config.MaxParallelWorkers {
		workers = s.config.MaxParallelWorkers
	}
	s.logger.Infof("使用 %d 个 Worker 并行解析音乐元数据", workers)

	jobs := make(chan int, len(items))
	results := make(chan parseResult, len(items))
	var wg sync.WaitGroup

	// 启动 Worker 协程
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					s.logger.Errorf("Worker %d panic during metadata parsing: %v", workerID, r)
				}
			}()
			for index := range jobs {
				item := items[index]
				metadata, err := s.ParseMusicMetadata(item.path)

				result := parseResult{index: index}
				if err == nil && metadata != nil {
					result.metadata = metadata
				} else {
					if err != nil {
						s.logger.Debugf("Worker %d 解析元数据失败 %s: %v", workerID, item.path, err)
					}
					// 如果元数据解析失败，尝试从目录结构推断专辑和艺术家
					albumName := filepath.Base(item.dir)
					artistName := filepath.Base(filepath.Dir(item.dir))
					if albumName != "" && albumName != "." {
						result.album = albumName
					}
					if artistName != "" && artistName != "." && artistName != filepath.Base(item.dir) {
						result.artist = artistName
					}
				}
				results <- result
			}
		}(w)
	}

	// 发送任务
	go func() {
		for i := range items {
			jobs <- i
		}
		close(jobs)
	}()

	// 收集结果并串行更新（避免数据竞争）
	go func() {
		wg.Wait()
		close(results)
	}()

	for result := range results {
		item := items[result.index]
		if result.metadata != nil {
			s.applyMetadataToTrack(item.track, result.metadata)
		} else {
			if result.album != "" {
				item.track.Album = result.album
			}
			if result.artist != "" {
				item.track.Artist = result.artist
			}
		}
	}
	s.logger.Infof("元数据并行解析完成")
}

// applyMetadataToTrack 将解析的元数据应用到曲目
func (s *MusicService) applyMetadataToTrack(track *MusicTrack, metadata *MusicMetadata) {
	if metadata.Title != "" {
		track.Title = metadata.Title
	}
	if metadata.Artist != "" {
		track.Artist = metadata.Artist
	}
	if metadata.Album != "" {
		track.Album = metadata.Album
	}
	if metadata.AlbumArtist != "" {
		track.AlbumArtist = metadata.AlbumArtist
	}
	if metadata.Genre != "" {
		track.Genre = metadata.Genre
	}
	if metadata.Year > 0 {
		track.Year = metadata.Year
	}
	track.TrackNum = metadata.TrackNum
	track.DiscNum = metadata.DiscNum
	track.Duration = metadata.Duration
	track.Bitrate = metadata.Bitrate
	track.SampleRate = metadata.SampleRate
	track.Channels = metadata.Channels
	track.MusicLanguage = metadata.MusicLanguage
	track.Composer = metadata.Composer
	track.Lyricist = metadata.Lyricist
	track.Arranger = metadata.Arranger
	track.Key = metadata.Key
	track.RecordLabel = metadata.RecordLabel
}

// ParseMusicMetadata 使用 FFprobe 解析音乐文件元数据（带超时保护）
func (s *MusicService) ParseMusicMetadata(filePath string) (*MusicMetadata, error) {
	ctx, cancel := context.WithTimeout(context.Background(), s.config.FFprobeTimeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, s.ffprobePath,
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		"--", filePath,
	)

	output, err := cmd.Output()
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			s.logger.Warnf("FFprobe 解析音乐元数据超时: %s", filePath)
			return nil, fmt.Errorf("FFprobe timeout: %s", filePath)
		} else {
			s.logger.Debugf("FFprobe 解析音乐元数据失败: %s, 错误: %v", filePath, err)
			return nil, fmt.Errorf("FFprobe failed for %s: %w", filePath, err)
		}
	}

	var probeResult struct {
		Streams []struct {
			CodecType  string            `json:"codec_type"`
			BitRate    string            `json:"bit_rate"`
			SampleRate string            `json:"sample_rate"`
			Channels   int               `json:"channels"`
			Duration   string            `json:"duration"`
			Tags       map[string]string `json:"tags"`
		} `json:"streams"`
		Format struct {
			Duration string            `json:"duration"`
			BitRate  string            `json:"bit_rate"`
			Tags     map[string]string `json:"tags"`
		} `json:"format"`
	}

	if err := json.Unmarshal(output, &probeResult); err != nil {
		s.logger.Debugf("解析 FFprobe 输出失败: %s, 错误: %v", filePath, err)
		return nil, err
	}

	metadata := &MusicMetadata{}

	// 解析时长
	if probeResult.Format.Duration != "" {
		if d, err := strconv.ParseFloat(probeResult.Format.Duration, 64); err == nil {
			metadata.Duration = d
		}
	}

	// 解析比特率
	if probeResult.Format.BitRate != "" {
		if br, err := strconv.Atoi(probeResult.Format.BitRate); err == nil {
			metadata.Bitrate = br / 1000 // 转换为 kbps
		}
	}

	// 查找音频流并解析采样率、声道数
	for _, stream := range probeResult.Streams {
		if stream.CodecType == "audio" {
			if stream.SampleRate != "" {
				if sr, err := strconv.Atoi(stream.SampleRate); err == nil {
					metadata.SampleRate = sr
				}
			}
			if stream.Channels > 0 {
				metadata.Channels = stream.Channels
			}
			break
		}
	}

	// 解析标签信息（从 format.tags 或 stream.tags）
	tags := probeResult.Format.Tags
	if tags == nil {
		for _, stream := range probeResult.Streams {
			if stream.Tags != nil {
				tags = stream.Tags
				break
			}
		}
	}

	if tags != nil {
		// 支持多种标签命名约定
		metadata.Title = getTagValue(tags, []string{"title", "TITLE", "Title"})
		metadata.Artist = getTagValue(tags, []string{"artist", "ARTIST", "Artist"})
		metadata.AlbumArtist = getTagValue(tags, []string{"album_artist", "ALBUM_ARTIST", "AlbumArtist"})
		metadata.Album = getTagValue(tags, []string{"album", "ALBUM", "Album"})
		metadata.Genre = getTagValue(tags, []string{"genre", "GENRE", "Genre"})

		// 解析年份
		yearStr := getTagValue(tags, []string{"year", "YEAR", "Year", "date", "DATE", "Date"})
		if yearStr != "" {
			if y, err := strconv.Atoi(yearStr[:4]); err == nil {
				metadata.Year = y
			}
		}

		// 解析曲目号
		trackStr := getTagValue(tags, []string{"track", "TRACK", "Track", "track_number", "TRACK_NUMBER"})
		if trackStr != "" {
			metadata.TrackNum = parseNumberPart(trackStr)
		}

		// 解析碟片号
		discStr := getTagValue(tags, []string{"disc", "DISC", "Disc", "disc_number", "DISC_NUMBER"})
		if discStr != "" {
			metadata.DiscNum = parseNumberPart(discStr)
		}

		// 解析新增的音乐元数据
		metadata.MusicLanguage = getTagValue(tags, []string{"language", "LANGUAGE", "Language", "music_language", "MUSIC_LANGUAGE", "MusicLanguage"})
		metadata.Composer = getTagValue(tags, []string{"composer", "COMPOSER", "Composer"})
		metadata.Lyricist = getTagValue(tags, []string{"lyricist", "LYRICIST", "Lyricist", "lyrics", "LYRICS"})
		metadata.Arranger = getTagValue(tags, []string{"arranger", "ARRANGER", "Arranger"})
		metadata.Key = getTagValue(tags, []string{"key", "KEY", "Key", "initial_key", "INITIAL_KEY"})
		metadata.RecordLabel = getTagValue(tags, []string{"label", "LABEL", "Label", "record_label", "RECORD_LABEL", "RecordLabel"})
	}

	return metadata, nil
}

// getTagValue 从标签中获取值，支持多个键
func getTagValue(tags map[string]string, keys []string) string {
	for _, key := range keys {
		if val, ok := tags[key]; ok && val != "" {
			return val
		}
	}
	return ""
}

// parseNumberPart 从字符串中解析数字部分（如 "1/10" -> 1）
func parseNumberPart(s string) int {
	parts := strings.SplitN(s, "/", 2)
	parts = strings.SplitN(parts[0], "-", 2)
	parts = strings.SplitN(parts[0], " ", 2)
	if num, err := strconv.Atoi(strings.TrimSpace(parts[0])); err == nil {
		return num
	}
	return 0
}

// GetDB 获取数据库连接
func (s *MusicService) GetDB() *gorm.DB {
	return s.db
}

// ScanMusicLibrary 扫描音乐库目录（支持多路径）
// 优化点：增量扫描、并行FFprobe、批量入库、事务保护
func (s *MusicService) ScanMusicLibrary(libraryID string, dirPaths []string) (int, error) {
	s.scanMu.Lock()
	defer s.scanMu.Unlock()

	startTime := time.Now()

	// 预加载所有已存在的文件路径到 map（用于后续清理失效记录）
	existingPaths := make(map[string]bool)
	originalPaths := make(map[string]string)       // 标准化路径 -> 原始数据库路径
	existingModTimes := make(map[string]time.Time) // 记录已有文件的修改时间（增量扫描用）
	// 预加载虚拟曲目引用的音频文件路径（避免重复处理）
	virtualAudioPaths := make(map[string]bool)

	// 分页加载已有曲目路径，避免内存溢出
	pageSize := 1000
	var lastID string
	for {
		var tracks []MusicTrack
		query := s.db.Where("library_id = ?", libraryID).
			Select("id, file_path, is_virtual, file_mod_time")
		if lastID != "" {
			query = query.Where("id > ?", lastID)
		}
		err := query.Order("id ASC").Limit(pageSize).Find(&tracks).Error
		if err != nil {
			s.logger.Warnf("预加载已有音乐文件路径失败: %v", err)
			return 0, err
		}
		if len(tracks) == 0 {
			break
		}
		for _, t := range tracks {
			normalized := normalizePath(t.FilePath)
			if t.IsVirtual {
				virtualAudioPaths[normalized] = true
			} else {
				existingPaths[normalized] = true
				originalPaths[normalized] = t.FilePath
				existingModTimes[normalized] = t.FileModTime
			}
		}
		lastID = tracks[len(tracks)-1].ID
	}
	s.logger.Infof("预加载 %d 个已有音乐文件路径和 %d 个虚拟曲目路径到内存", len(existingPaths), len(virtualAudioPaths))

	// 收集所有待处理的新文件
	var pendingItems []pendingMusicTrack
	var cueCount int

	for _, dirPath := range dirPaths {
		// 安全检查：确保路径不包含遍历字符
		if !isPathSafe("", dirPath) {
			s.logger.Warnf("不安全的扫描路径: %s", dirPath)
			continue
		}
		items, count, err := s.collectNewFiles(libraryID, dirPath, existingPaths, existingModTimes, virtualAudioPaths, originalPaths)
		if err != nil {
			s.logger.Warnf("扫描路径 %s 失败: %v", dirPath, err)
			continue
		}
		pendingItems = append(pendingItems, items...)
		cueCount += count
	}

	s.logger.Infof("发现 %d 首新曲目待处理，%d 个 .cue 文件已处理", len(pendingItems), cueCount)

	// 并行解析元数据
	if len(pendingItems) > 0 {
		s.parallelParseMetadata(pendingItems)
	}

	// 准备批量入库的数据
	newTracks := make([]MusicTrack, 0, len(pendingItems))
	for _, item := range pendingItems {
		// 查找同目录下的歌词文件
		lrcPath := strings.TrimSuffix(item.path, item.ext) + ".lrc"
		if _, err := os.Lstat(lrcPath); err == nil {
			item.track.LyricsPath = normalizePath(lrcPath)
		}

		// 查找封面图
		if coverPath := findCoverImage(item.dir); coverPath != "" {
			item.track.CoverPath = coverPath
		} else if extractedPath := s.ExtractEmbeddedCover(item.path, item.dir); extractedPath != "" {
			item.track.CoverPath = extractedPath
		}

		newTracks = append(newTracks, *item.track)
	}

	// 启动事务
	tx := s.db.Begin()
	if tx.Error != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", tx.Error)
	}

	var txPanic error
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			txPanic = fmt.Errorf("panic during scan: %v", r)
			s.logger.Errorf("Panic during music library scan: %v", r)
		}
	}()

	totalCount := len(newTracks)
	s.logger.Infof("准备入库: 新曲目=%d, 批大小=%d", totalCount, s.config.BatchSize)
	if totalCount > 0 {
		batchSize := s.config.BatchSize
		insertedCount := 0
		for i := 0; i < len(newTracks); i += batchSize {
			end := i + batchSize
			if end > len(newTracks) {
				end = len(newTracks)
			}
			if err := tx.Clauses(clause.OnConflict{
				DoNothing: true,
			}).Create(newTracks[i:end]).Error; err != nil {
				tx.Rollback()
				s.logger.Errorf("批量插入音乐曲目失败(第%d批, 范围%d-%d, 共%d条): %v", i/batchSize, i, end, end-i, err)
				return insertedCount, err
			}
			insertedCount += end - i
		}
		totalCount = insertedCount
		s.logger.Infof("批量插入 %d 首新曲目", totalCount)
	} else {
		s.logger.Warnf("没有新曲目需要入库（newTracks 为空）")
	}

	// 清理失效记录：数据库中有但磁盘上已不存在的文件
	staleRemoved := 0
	for normalizedPath := range existingPaths {
		originalPath, ok := originalPaths[normalizedPath]
		if !ok {
			originalPath = normalizedPath
		}
		if err := tx.Where("file_path = ? AND library_id = ?", originalPath, libraryID).Delete(&MusicTrack{}).Error; err != nil {
			tx.Rollback()
			s.logger.Warnf("删除失效音乐记录失败: %s, 错误: %v", originalPath, err)
			return totalCount, err
		}
		staleRemoved++
	}
	if staleRemoved > 0 {
		s.logger.Infof("清理 %d 条失效记录", staleRemoved)
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		s.logger.Warnf("提交事务失败: %v", err)
		return totalCount, err
	}

	// 清理重复数据（在事务外执行，因为这是独立的清理操作）
	if _, err := s.removeDuplicateTracks(libraryID); err != nil {
		s.logger.Warnf("清理重复曲目失败: %v", err)
	}
	if _, err := s.RemoveDuplicateAlbums(libraryID); err != nil {
		s.logger.Warnf("清理重复专辑失败: %v", err)
	}

	// 清理失效的虚拟曲目（CUE 文件已删除但虚拟曲目残留）
	s.cleanStaleVirtualTracks(libraryID)

	// 自动创建专辑（始终执行，确保专辑关联正确）
	s.autoCreateAlbums(libraryID)

	// 检查是否发生 panic
	if txPanic != nil {
		return totalCount, txPanic
	}

	duration := time.Since(startTime)
	s.logger.Infof("音乐库扫描完成: 发现 %d 首新曲目, 清理 %d 条失效记录, 耗时 %v", totalCount, staleRemoved, duration)
	return totalCount, nil
}

// isPathSafe 检查路径是否安全（防止路径遍历攻击）
// baseDir: 允许访问的基础目录（为空时仅检查路径遍历字符）
// targetPath: 要检查的目标路径
func isPathSafe(baseDir, targetPath string) bool {
	cleanTarget := filepath.Clean(targetPath)

	// 检查是否包含路径遍历字符
	if strings.Contains(cleanTarget, "..") {
		return false
	}

	// 如果提供了基础目录，确保目标路径是基础目录的子目录
	if baseDir != "" {
		cleanBase := filepath.Clean(baseDir)
		if !strings.HasPrefix(cleanTarget, cleanBase+string(filepath.Separator)) && cleanTarget != cleanBase {
			return false
		}
	}

	return true
}

// findFileCaseInsensitive 在目录中查找文件（大小写不敏感）
// 返回找到的文件路径，未找到返回空字符串
func findFileCaseInsensitive(dir, filename string) string {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return ""
	}

	targetLower := strings.ToLower(filename)
	targetBase := strings.ToLower(strings.TrimSuffix(filename, filepath.Ext(filename)))

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		entryLower := strings.ToLower(entry.Name())
		if entryLower == targetLower {
			return filepath.Join(dir, entry.Name())
		}

		// 尝试匹配相同基础名但不同扩展名
		entryBase := strings.ToLower(strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name())))
		if entryBase == targetBase {
			return filepath.Join(dir, entry.Name())
		}
	}

	return ""
}

// collectNewFiles 收集所有新文件（增量扫描）
func (s *MusicService) collectNewFiles(libraryID, dirPath string, existingPaths map[string]bool, existingModTimes map[string]time.Time, virtualAudioPaths map[string]bool, originalPaths map[string]string) ([]pendingMusicTrack, int, error) {
	const maxPendingItems = 10000

	var pendingItems []pendingMusicTrack
	var cueCount int
	var totalFiles, skippedExt, skippedExisting, skippedVirtual, skippedModified int

	s.logger.Infof("开始遍历音乐目录: %s", dirPath)

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			s.logger.Warnf("遍历文件失败: %s, %v", path, err)
			return nil
		}
		if info.IsDir() {
			return nil
		}

		totalFiles++

		if len(pendingItems) >= maxPendingItems {
			s.logger.Warnf("达到待处理文件上限 %d，停止收集", maxPendingItems)
			return filepath.SkipAll
		}

		ext := strings.ToLower(filepath.Ext(path))
		if !s.supportedFormats[ext] {
			skippedExt++
			return nil
		}

		// 处理 .cue 文件
		if ext == ".cue" {
			s.logger.Infof("扫描发现 CUE 文件: %s, 开始解析", path)
			cueResult, audioPaths, err := s.ProcessCueFile(libraryID, path)
			if err != nil {
				s.logger.Warnf("处理 .cue 文件失败: %s, %v", path, err)
			} else {
				cueCount += cueResult
				// 将 CUE 引用的音频路径加入虚拟路径集合，避免后续被重复扫描为普通曲目
				for _, ap := range audioPaths {
					virtualAudioPaths[ap] = true
					s.logger.Infof("已将音频路径标记为虚拟: %s", ap)
				}
			}
			return nil
		}

		// 标准化路径
		normalizedPath := normalizePath(path)

		// 检查此音频文件是否已被 .cue 文件处理
		if virtualAudioPaths[normalizedPath] {
			skippedVirtual++
			delete(existingPaths, normalizedPath) // 防止后续清理阶段误删虚拟曲目
			return nil
		}

		// 检查是否已存在
		if existingPaths[normalizedPath] {
			if modTime, ok := existingModTimes[normalizedPath]; ok && !info.ModTime().After(modTime) {
				delete(existingPaths, normalizedPath)
				skippedExisting++
				return nil
			}
			// 文件已修改：参照视频扫描策略，复用已有DB记录，仅更新技术字段
			// 保留用户手动编辑的元数据（标题、艺术家、专辑等）
			skippedModified++
			s.logger.Debugf("文件已修改，仅更新技术字段: %s", path)

			// 查找已存在的 DB 记录
			dbPath := normalizedPath
			if orig, ok := originalPaths[normalizedPath]; ok {
				dbPath = orig
			}
			var existingTrack MusicTrack
			if err := s.db.Where("file_path = ? AND library_id = ?", dbPath, libraryID).First(&existingTrack).Error; err == nil {
				metadata, parseErr := s.ParseMusicMetadata(path)
				if parseErr == nil && metadata != nil {
					existingTrack.Duration = metadata.Duration
					existingTrack.Bitrate = metadata.Bitrate
					existingTrack.SampleRate = metadata.SampleRate
					existingTrack.Channels = metadata.Channels
				}
				existingTrack.FileSize = info.Size()
				existingTrack.FileModTime = info.ModTime()
				existingTrack.Format = strings.TrimPrefix(ext, ".")

				// 更新歌词路径
				lrcPath := strings.TrimSuffix(path, ext) + ".lrc"
				if _, lrcErr := os.Lstat(lrcPath); lrcErr == nil {
					existingTrack.LyricsPath = normalizePath(lrcPath)
				}

				// 更新封面路径
				if coverPath := findCoverImage(filepath.Dir(path)); coverPath != "" {
					existingTrack.CoverPath = coverPath
				}

				s.db.Save(&existingTrack)
				delete(existingPaths, normalizedPath)
				return nil
			}
			// 无法找到已有DB记录（边界情况），降级为新建
			s.logger.Warnf("文件已修改但DB记录丢失，重新创建: %s", path)
		}
		delete(existingPaths, normalizedPath)

		// 创建基础记录
		track := &MusicTrack{
			ID:          uuid.NewString(),
			LibraryID:   libraryID,
			Title:       strings.TrimSuffix(info.Name(), ext),
			FilePath:    normalizedPath,
			FileSize:    info.Size(),
			FileModTime: info.ModTime(),
			Format:      strings.TrimPrefix(ext, "."),
		}

		pendingItems = append(pendingItems, pendingMusicTrack{
			track: track,
			path:  path,
			dir:   filepath.Dir(path),
			ext:   ext,
		})

		return nil
	})

	s.logger.Infof("目录遍历完成: %s, 总文件=%d, 跳过-扩展名=%d, 跳过-已存在=%d, 跳过-虚拟=%d, 重新扫描=%d, 新增待处理=%d, cue=%d",
		dirPath, totalFiles, skippedExt, skippedExisting, skippedVirtual, skippedModified, len(pendingItems), cueCount)

	return pendingItems, cueCount, err
}

// normalizePath 标准化路径
func normalizePath(path string) string {
	path = filepath.Clean(path)
	path = filepath.ToSlash(path)
	if runtime.GOOS == "windows" {
		path = strings.ToLower(path)
	}
	return path
}

// findCoverImage 在指定目录中查找封面图
func findCoverImage(dir string) string {
	coverNames := strings.Split(CoverSearchNames, ",")
	coverExts := strings.Split(CoverImageExtensions, ",")
	for _, name := range coverNames {
		for _, ext := range coverExts {
			path := filepath.Join(dir, name+ext)
			if _, err := os.Stat(path); err == nil {
				return normalizePath(path)
			}
			// 尝试大写扩展名
			path = filepath.Join(dir, name+strings.ToUpper(ext))
			if _, err := os.Stat(path); err == nil {
				return normalizePath(path)
			}
		}
	}
	return ""
}

// ExtractEmbeddedCover 从音频文件中提取内嵌封面图（ID3v2 APIC / Vorbis METADATA_BLOCK_PICTURE）
// 保存到同目录的 cover.jpg，返回标准化路径；提取失败返回空字符串
func (s *MusicService) ExtractEmbeddedCover(audioPath, dir string) string {
	coverPath := filepath.Join(dir, "cover.jpg")
	if _, err := os.Stat(coverPath); err == nil {
		return normalizePath(coverPath)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx,
		s.ffmpegPath,
		"-y",
		"-i", audioPath,
		"-an",
		"-vcodec", "copy",
		coverPath,
	)

	if err := cmd.Run(); err != nil {
		s.logger.Debugf("提取内嵌封面失败（可能无内嵌封面）: %s, 错误: %v", audioPath, err)
		return ""
	}

	if _, err := os.Stat(coverPath); err == nil {
		s.logger.Debugf("成功提取内嵌封面: %s -> %s", audioPath, coverPath)
		return normalizePath(coverPath)
	}
	return ""
}

// RemoveDuplicateTracks 移除重复的音乐曲目
func (s *MusicService) RemoveDuplicateTracks(libraryID string) (int, error) {
	s.scanMu.Lock()
	defer s.scanMu.Unlock()
	return s.removeDuplicateTracks(libraryID)
}

func (s *MusicService) removeDuplicateTracks(libraryID string) (int, error) {
	// 用单条 SQL 删除重复：保留每个 file_path 中创建时间最早的记录
	result := s.db.Exec(
		`DELETE FROM music_tracks WHERE id IN (
			SELECT id FROM music_tracks t1 WHERE library_id = ? AND is_virtual = ? AND id NOT IN (
				SELECT MIN(id) FROM music_tracks t2 WHERE t2.library_id = ? AND t2.is_virtual = ? GROUP BY t2.file_path
			)
		)`, libraryID, false, libraryID, false,
	)
	if result.Error != nil {
		return 0, result.Error
	}

	removed := int(result.RowsAffected)
	s.logger.Infof("清理完成，删除了 %d 个重复曲目（跳过虚拟曲目）", removed)
	return removed, nil
}

// cleanStaleVirtualTracks 清理失去 CUE 文件引用的虚拟曲目
func (s *MusicService) cleanStaleVirtualTracks(libraryID string) int {
	var virtualTracks []MusicTrack
	s.db.Where("library_id = ? AND is_virtual = ?", libraryID, true).Find(&virtualTracks)

	if len(virtualTracks) == 0 {
		return 0
	}

	cueExists := make(map[string]bool, len(virtualTracks))
	var deleteIDs []string
	for _, track := range virtualTracks {
		exists, checked := cueExists[track.CueFilePath]
		if !checked {
			_, err := os.Lstat(track.CueFilePath)
			exists = !os.IsNotExist(err)
			cueExists[track.CueFilePath] = exists
		}
		if !exists {
			deleteIDs = append(deleteIDs, track.ID)
		}
	}

	if len(deleteIDs) > 0 {
		s.db.Where("id IN ?", deleteIDs).Delete(&MusicTrack{})
		s.logger.Infof("清理了 %d 条失效虚拟曲目", len(deleteIDs))
	}
	return len(deleteIDs)
}

// DeleteLibraryTracks 删除指定媒体库的所有音乐曲目
func (s *MusicService) DeleteLibraryTracks(libraryID string) error {
	s.scanMu.Lock()
	defer s.scanMu.Unlock()

	// 先清理引用该库所有曲目的播放列表项
	s.db.Where("track_id IN (SELECT id FROM music_tracks WHERE library_id = ?)", libraryID).Delete(&MusicPlaylistItem{})

	// 再删除专辑
	if err := s.db.Where("library_id = ?", libraryID).Delete(&MusicAlbum{}).Error; err != nil {
		return err
	}
	// 最后删除曲目
	return s.db.Where("library_id = ?", libraryID).Delete(&MusicTrack{}).Error
}

// DeleteTrackByFilePath 根据文件路径删除音乐曲目
func (s *MusicService) DeleteTrackByFilePath(filePath, libraryID string) error {
	s.scanMu.Lock()
	defer s.scanMu.Unlock()

	normalized := normalizePath(filePath)
	var track MusicTrack
	err := s.db.Where("file_path = ? AND library_id = ?", normalized, libraryID).First(&track).Error
	if err != nil {
		err = s.db.Where("file_path = ? AND library_id = ?", filePath, libraryID).First(&track).Error
		if err != nil {
			return err
		}
	}

	albumID := track.AlbumID

	// 先清理引用该曲目的播放列表项
	s.db.Where("track_id = ?", track.ID).Delete(&MusicPlaylistItem{})

	// 再删除曲目
	if err := s.db.Delete(&track).Error; err != nil {
		return err
	}

	// 检查该专辑是否还有其他曲目，如果没有则删除专辑
	if albumID != "" {
		var remainingTracks int64
		s.db.Model(&MusicTrack{}).Where("album_id = ? AND library_id = ?", albumID, libraryID).Count(&remainingTracks)

		if remainingTracks == 0 {
			s.db.Where("id = ? AND library_id = ?", albumID, libraryID).Delete(&MusicAlbum{})
		}
	}

	return nil
}

// deleteEmptyAlbums 删除空专辑（内部方法，调用方负责加锁）
func (s *MusicService) deleteEmptyAlbums(libraryID string) int {
	result := s.db.Exec(
		"DELETE FROM music_albums WHERE library_id = ? AND id NOT IN (SELECT DISTINCT album_id FROM music_tracks WHERE library_id = ? AND album_id != '')",
		libraryID, libraryID,
	)
	if result.Error != nil {
		s.logger.Warnf("清理空专辑失败: %v", result.Error)
		return 0
	}
	return int(result.RowsAffected)
}

// CleanEmptyAlbums 清理没有曲目的空专辑
func (s *MusicService) CleanEmptyAlbums(libraryID string) {
	s.albumMu.Lock()
	defer s.albumMu.Unlock()

	removedAlbums := s.deleteEmptyAlbums(libraryID)
	if removedAlbums > 0 {
		s.logger.Infof("清理完成，删除了 %d 个空专辑", removedAlbums)
	}
}

// autoCreateAlbums 自动根据曲目信息创建专辑
func (s *MusicService) autoCreateAlbums(libraryID string) {
	s.albumMu.Lock()
	defer s.albumMu.Unlock()

	s.deleteEmptyAlbums(libraryID)

	// 再创建或更新专辑
	type albumGroup struct {
		Album  string
		Artist string
	}

	var groups []albumGroup
	s.db.Model(&MusicTrack{}).
		Where("library_id = ? AND album != '' AND album_id = ''", libraryID).
		Select("DISTINCT album, artist").
		Scan(&groups)

	for _, g := range groups {
		// 检查专辑是否已存在
		var existingAlbum MusicAlbum
		err := s.db.Where("library_id = ? AND title = ? AND artist = ?", libraryID, g.Album, g.Artist).First(&existingAlbum).Error

		var albumID string
		// 统计曲目数和总时长
		var stats struct {
			Count    int
			Duration float64
		}
		s.db.Model(&MusicTrack{}).
			Where("library_id = ? AND album = ? AND artist = ?", libraryID, g.Album, g.Artist).
			Select("COUNT(*) as count, COALESCE(SUM(duration), 0) as duration").
			Scan(&stats)

		// 获取第一首曲目的信息
		var firstTrack MusicTrack
		s.db.Where("library_id = ? AND album = ? AND artist = ?", libraryID, g.Album, g.Artist).
			Order("track_num ASC").First(&firstTrack)

		if err == nil {
			// 专辑已存在，更新专辑信息
			albumID = existingAlbum.ID
			s.logger.Infof("专辑已存在，更新信息: %s - %s", g.Artist, g.Album)

			// 更新专辑信息（包含标题和艺术家，确保编辑后的元数据能正确更新）
			updates := map[string]interface{}{
				"title":          g.Album,
				"artist":         g.Artist,
				"track_count":    stats.Count,
				"total_duration": stats.Duration,
				"folder_path":    filepath.Dir(firstTrack.FilePath),
			}
			if firstTrack.Year > 0 {
				updates["year"] = firstTrack.Year
			}
			if firstTrack.Genre != "" {
				updates["genre"] = firstTrack.Genre
			}
			if firstTrack.CoverPath != "" {
				updates["cover_path"] = firstTrack.CoverPath
			}
			s.db.Model(&existingAlbum).Updates(updates)
		} else {
			// 专辑不存在，创建新专辑
			albumID = uuid.NewString()
			album := &MusicAlbum{
				ID:            albumID,
				LibraryID:     libraryID,
				Title:         g.Album,
				Artist:        g.Artist,
				Year:          firstTrack.Year,
				Genre:         firstTrack.Genre,
				TrackCount:    stats.Count,
				TotalDuration: stats.Duration,
				CoverPath:     firstTrack.CoverPath,
				FolderPath:    filepath.Dir(firstTrack.FilePath),
			}

			if err := s.db.Create(album).Error; err != nil {
				s.logger.Warnf("创建专辑失败: %s - %s, error: %v", g.Artist, g.Album, err)
				continue
			}
		}

		// 更新曲目的 album_id
		s.db.Model(&MusicTrack{}).
			Where("library_id = ? AND album = ? AND artist = ?", libraryID, g.Album, g.Artist).
			Update("album_id", albumID)
	}
}

// RemoveDuplicateAlbums 移除重复的专辑
func (s *MusicService) RemoveDuplicateAlbums(libraryID string) (int, error) {
	s.albumMu.Lock()
	defer s.albumMu.Unlock()
	var removed int

	// 查找所有重复的专辑
	type duplicate struct {
		Title  string
		Artist string
		Count  int
	}

	var duplicates []duplicate
	s.db.Model(&MusicAlbum{}).
		Select("title, artist, COUNT(*) as count").
		Where("library_id = ?", libraryID).
		Group("title, artist").
		Having("count > 1").
		Scan(&duplicates)

	for _, d := range duplicates {
		var albums []MusicAlbum
		s.db.Where("library_id = ? AND title = ? AND artist = ?", libraryID, d.Title, d.Artist).
			Order("created_at DESC").
			Find(&albums)

		// 保留第一个，删除其他的
		keepAlbumID := albums[0].ID
		for i := 1; i < len(albums); i++ {
			// 先更新引用了待删除专辑的曲目，将它们的 album_id 指向保留的专辑
			s.db.Model(&MusicTrack{}).
				Where("album_id = ?", albums[i].ID).
				Update("album_id", keepAlbumID)

			// 删除专辑
			if err := s.db.Delete(&albums[i]).Error; err == nil {
				removed++
			}
		}
	}

	s.logger.Infof("清理完成，删除了 %d 个重复专辑", removed)
	return removed, nil
}

// Recent 获取最近添加的曲目
func (s *MusicService) Recent(limit int) ([]MusicTrack, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var tracks []MusicTrack
	err := s.db.Order("created_at DESC").Limit(limit).Find(&tracks).Error
	return tracks, err
}

// ListTracks 获取曲目列表
func (s *MusicService) ListTracks(libraryID string, page, size int, sort string) ([]MusicTrack, int64, error) {
	var tracks []MusicTrack
	var total int64

	query := s.db.Model(&MusicTrack{})
	if libraryID != "" {
		query = query.Where("library_id = ?", libraryID)
	}

	query.Count(&total)

	switch sort {
	case "title":
		query = query.Order("title ASC")
	case "artist":
		query = query.Order("artist ASC, album ASC, track_num ASC")
	case "recent":
		query = query.Order("created_at DESC")
	case "popular":
		query = query.Order("play_count DESC")
	default:
		query = query.Order("artist ASC, album ASC, track_num ASC")
	}

	err := query.Offset((page - 1) * size).Limit(size).Find(&tracks).Error
	return tracks, total, err
}

// ListTracksWithKeyword 带关键词搜索的曲目列表
func (s *MusicService) ListTracksWithKeyword(libraryID string, page, size int, keyword, sort string) ([]MusicTrack, int64, error) {
	var tracks []MusicTrack
	var total int64

	query := s.db.Model(&MusicTrack{})
	if libraryID != "" {
		query = query.Where("library_id = ?", libraryID)
	}

	// 关键词搜索
	if keyword != "" {
		query = query.Where("title LIKE ? OR artist LIKE ? OR album LIKE ?",
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	query.Count(&total)

	switch sort {
	case "title":
		query = query.Order("title ASC")
	case "artist":
		query = query.Order("artist ASC, album ASC, track_num ASC")
	case "recent":
		query = query.Order("created_at DESC")
	case "popular":
		query = query.Order("play_count DESC")
	default:
		query = query.Order("artist ASC, album ASC, track_num ASC")
	}

	err := query.Offset((page - 1) * size).Limit(size).Find(&tracks).Error
	return tracks, total, err
}

// CountTracks 统计音乐曲目数量
func (s *MusicService) CountTracks(libraryID string) (int64, error) {
	var total int64
	query := s.db.Model(&MusicTrack{})
	if libraryID != "" {
		query = query.Where("library_id = ?", libraryID)
	}
	err := query.Count(&total).Error
	return total, err
}

// DeleteTrack 删除指定曲目
func (s *MusicService) DeleteTrack(trackID, libraryID string) error {
	s.scanMu.Lock()
	defer s.scanMu.Unlock()
	var track MusicTrack
	if err := s.db.Where("id = ? AND library_id = ?", trackID, libraryID).First(&track).Error; err != nil {
		return err
	}

	// 先清理引用该曲目的播放列表项
	s.db.Where("track_id = ?", track.ID).Delete(&MusicPlaylistItem{})

	// 再删除曲目
	if err := s.db.Delete(&track).Error; err != nil {
		return err
	}

	// 检查该专辑是否还有其他曲目，如果没有则删除专辑
	if track.AlbumID != "" {
		var remainingTracks int64
		s.db.Model(&MusicTrack{}).Where("album_id = ? AND library_id = ?", track.AlbumID, libraryID).Count(&remainingTracks)

		if remainingTracks == 0 {
			s.db.Where("id = ? AND library_id = ?", track.AlbumID, libraryID).Delete(&MusicAlbum{})
		}
	}

	return nil
}

// GetAllTrackFilePaths 获取所有音乐曲目的文件路径
func (s *MusicService) GetAllTrackFilePaths(libraryID string) ([]string, error) {
	var paths []string
	query := s.db.Model(&MusicTrack{}).Select("file_path")
	if libraryID != "" {
		query = query.Where("library_id = ?", libraryID)
	}
	err := query.Find(&paths).Error
	return paths, err
}

// ListTracksByFolder 按文件夹路径查询音乐曲目
func (s *MusicService) ListTracksByFolder(folderPath string, page, size int, libraryID, keyword, sort string) ([]MusicTrack, int64, error) {
	var tracks []MusicTrack
	var total int64

	query := s.db.Model(&MusicTrack{})
	if libraryID != "" {
		query = query.Where("library_id = ?", libraryID)
	}

	// 按文件夹路径过滤（兼容 Windows 反斜杠和 Unix 正斜杠）
	if folderPath != "" {
		normalizedPath := strings.ReplaceAll(folderPath, "\\", "/")
		if !strings.HasSuffix(normalizedPath, "/") {
			normalizedPath += "/"
		}
		query = query.Where("REPLACE(file_path, '\\', '/') LIKE ?", normalizedPath+"%")
	}

	// 关键词搜索
	if keyword != "" {
		query = query.Where("title LIKE ? OR artist LIKE ? OR album LIKE ?",
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	query.Count(&total)

	switch sort {
	case "title":
		query = query.Order("title ASC")
	case "artist":
		query = query.Order("artist ASC, album ASC, track_num ASC")
	case "recent":
		query = query.Order("created_at DESC")
	case "popular":
		query = query.Order("play_count DESC")
	default:
		query = query.Order("artist ASC, album ASC, track_num ASC")
	}

	if page < 1 {
		page = 1
	}
	if size < 1 || size > 200 {
		size = 20
	}

	err := query.Offset((page - 1) * size).Limit(size).Find(&tracks).Error
	return tracks, total, err
}

// ListAlbums 获取专辑列表（只返回有曲目的专辑）
func (s *MusicService) ListAlbums(libraryID string, page, size int, sort string) ([]MusicAlbum, int64, error) {
	var albums []MusicAlbum
	var total int64

	// 先清理空专辑，确保数据一致性
	s.CleanEmptyAlbums(libraryID)

	query := s.db.Model(&MusicAlbum{})
	if libraryID != "" {
		query = query.Where("library_id = ?", libraryID)
	}

	// 只返回有曲目的专辑
	query = query.Where("id IN (SELECT DISTINCT album_id FROM music_tracks WHERE album_id IS NOT NULL AND album_id != '')")

	query.Count(&total)

	var orderClause string
	switch sort {
	case "recent":
		orderClause = "created_at DESC"
	case "artist":
		orderClause = "artist ASC, year DESC"
	default:
		orderClause = "artist ASC, year DESC"
	}

	err := query.Order(orderClause).
		Offset((page - 1) * size).Limit(size).Find(&albums).Error
	return albums, total, err
}

// GetAlbumWithTracks 获取专辑详情（含曲目）
func (s *MusicService) GetAlbumWithTracks(albumID string) (*MusicAlbum, error) {
	var album MusicAlbum
	err := s.db.Preload("Tracks", func(db *gorm.DB) *gorm.DB {
		return db.Order("disc_num ASC, track_num ASC")
	}).First(&album, "id = ?", albumID).Error
	return &album, err
}

// UpdateAlbum 更新专辑元数据
func (s *MusicService) UpdateAlbum(albumID string, updates map[string]interface{}) (*MusicAlbum, error) {
	var album MusicAlbum
	if err := s.db.First(&album, "id = ?", albumID).Error; err != nil {
		return nil, fmt.Errorf("专辑不存在: %w", err)
	}

	if err := s.db.Model(&album).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("更新专辑失败: %w", err)
	}

	// 如果更新了标题或艺术家，同步更新关联曲目的 album/artist 字段
	if title, ok := updates["title"].(string); ok && title != "" {
		s.db.Model(&MusicTrack{}).Where("album_id = ?", albumID).Update("album", title)
	}
	if artist, ok := updates["artist"].(string); ok {
		s.db.Model(&MusicTrack{}).Where("album_id = ?", albumID).Update("artist", artist)
	}

	// 重新加载更新后的专辑
	s.db.First(&album, "id = ?", albumID)
	return &album, nil
}

// UpdateArtistTracks 批量更新艺术家的所有曲目
func (s *MusicService) UpdateArtistTracks(libraryID, oldArtistName string, updates map[string]interface{}) (int64, error) {
	// 如果更新了艺术家名称，需要更新所有关联曲目
	if newName, ok := updates["artist"].(string); ok && newName != "" && newName != oldArtistName {
		result := s.db.Model(&MusicTrack{}).
			Where("library_id = ? AND artist = ?", libraryID, oldArtistName).
			Updates(map[string]interface{}{"artist": newName, "album_id": ""})
		return result.RowsAffected, result.Error
	}

	// 其他字段（如 genre）更新到所有艺术家曲目
	result := s.db.Model(&MusicTrack{}).
		Where("library_id = ? AND artist = ?", libraryID, oldArtistName).
		Updates(updates)
	return result.RowsAffected, result.Error
}

// SearchMusic 搜索音乐
func (s *MusicService) SearchMusic(query string, limit int) ([]MusicTrack, error) {
	var tracks []MusicTrack
	searchQuery := "%" + query + "%"
	err := s.db.Where("title LIKE ? OR artist LIKE ? OR album LIKE ?",
		searchQuery, searchQuery, searchQuery).
		Limit(limit).Find(&tracks).Error
	return tracks, err
}

// GetTrack 获取单个曲目
func (s *MusicService) GetTrack(id string, track *MusicTrack) error {
	return s.db.First(track, "id = ?", id).Error
}

// GetLyrics 获取歌词
func (s *MusicService) GetLyrics(trackID string) (string, error) {
	var track MusicTrack
	if err := s.db.First(&track, "id = ?", trackID).Error; err != nil {
		return "", err
	}

	s.logger.Debugf("[Music] Track info: ID=%s, Title=%s, Artist=%s, LyricsTextExists=%t, LyricsPath=%s, FilePath=%s",
		trackID, track.Title, track.Artist, track.LyricsText != "", track.LyricsPath, track.FilePath)

	// 优先返回内嵌歌词
	if track.LyricsText != "" {
		s.logger.Debugf("[Music] Using embedded lyrics for track: %s", trackID)
		return processLyrics(track.LyricsText), nil
	}

	// 读取外部歌词文件
	if track.LyricsPath != "" {
		s.logger.Debugf("[Music] Reading external lyrics file: %s", track.LyricsPath)

		// 解析歌词文件路径
		lyricsPath, err := resolveLyricsPath(track.LyricsPath, track.FilePath)
		if err != nil {
			s.logger.Errorf("[Music] Failed to resolve lyrics path: %s, error: %v", track.LyricsPath, err)
			return "", err
		}

		s.logger.Debugf("[Music] Resolved lyrics path: %s", lyricsPath)

		data, err := os.ReadFile(lyricsPath)
		if err != nil {
			s.logger.Warnf("[Music] Failed to read lyrics file: %s, error: %v", lyricsPath, err)
			// 尝试自动搜索歌词文件（使用元数据）
			if autoPath := findLyricsFile(track.FilePath, track.Artist, track.Title); autoPath != "" {
				s.logger.Debugf("[Music] Found lyrics file automatically using metadata: %s", autoPath)
				data, err = os.ReadFile(autoPath)
			}
			if err != nil {
				return "", err
			}
		}

		s.logger.Debugf("[Music] Read lyrics file successfully, size: %d bytes", len(data))

		// 处理歌词文件：可能是 Base64 编码、GBK 编码的 LRC 等
		lyrics, err := processLyricsFile(data, trackID, s.logger)
		if err != nil {
			s.logger.Warnf("[Music] 歌词文件解析失败: %v", err)
			return "", err
		}

		s.logger.Debugf("[Music] Parsed lyrics successfully, length: %d chars", len(lyrics))

		return lyrics, nil
	}

	// 如果没有配置歌词路径，尝试自动搜索（使用元数据）
	if track.FilePath != "" {
		if autoPath := findLyricsFile(track.FilePath, track.Artist, track.Title); autoPath != "" {
			s.logger.Debugf("[Music] Auto-found lyrics file using metadata: %s", autoPath)
			data, err := os.ReadFile(autoPath)
			if err != nil {
				s.logger.Errorf("[Music] Failed to read auto-found lyrics file: %s, error: %v", autoPath, err)
				return "", err
			}
			s.logger.Debugf("[Music] Read lyrics file successfully, size: %d bytes", len(data))
			lyrics, err := processLyricsFile(data, trackID, s.logger)
			if err != nil {
				s.logger.Warnf("[Music] 自动找到的歌词文件解析失败: %v", err)
				return "", err
			}
			s.logger.Debugf("[Music] Parsed lyrics successfully, length: %d chars", len(lyrics))
			return lyrics, nil
		}
	}

	return "", fmt.Errorf("未找到歌词")
}

// findLyricsFile 根据音乐文件路径和元数据自动查找 LRC 歌词文件
func findLyricsFile(musicFilePath, artist, title string) string {
	if musicFilePath == "" {
		return ""
	}

	// 获取音乐文件所在目录和文件名（不含扩展名）
	dir := filepath.Dir(musicFilePath)
	baseName := strings.TrimSuffix(filepath.Base(musicFilePath), filepath.Ext(musicFilePath))

	// 常见的歌词文件扩展名
	extensions := strings.Split(LyricExtensions, ",")

	// 生成可能的歌词文件名模式（按匹配优先级排序）
	var candidates []string

	// 1. 完全匹配：原文件名 + 扩展名
	for _, ext := range extensions {
		candidates = append(candidates, filepath.Join(dir, baseName+ext))
	}

	// 2. 基于元数据的匹配（如果有歌手和歌名信息）
	if artist != "" && title != "" {
		// 歌手-歌名.lrc
		for _, ext := range extensions {
			candidates = append(candidates, filepath.Join(dir, artist+"-"+title+ext))
			candidates = append(candidates, filepath.Join(dir, title+"-"+artist+ext))
			// 移除空格和特殊字符的变体
			artistClean := cleanFileName(artist)
			titleClean := cleanFileName(title)
			candidates = append(candidates, filepath.Join(dir, artistClean+"-"+titleClean+ext))
			candidates = append(candidates, filepath.Join(dir, titleClean+"-"+artistClean+ext))
		}
	} else if title != "" {
		// 只有歌名
		titleClean := cleanFileName(title)
		for _, ext := range extensions {
			candidates = append(candidates, filepath.Join(dir, title+ext))
			candidates = append(candidates, filepath.Join(dir, titleClean+ext))
		}
	}

	// 3. 尝试音乐文件名的不同变体（移除空格、特殊字符）
	baseNameClean := cleanFileName(baseName)
	for _, ext := range extensions {
		if baseNameClean != baseName {
			candidates = append(candidates, filepath.Join(dir, baseNameClean+ext))
		}
	}

	// 4. 尝试其他常见的歌词文件名
	variants := []string{"lyrics", "Lyrics", "LYRICS", "歌词"}

	for _, variant := range variants {
		for _, ext := range extensions {
			candidates = append(candidates, filepath.Join(dir, variant+ext))
		}
	}

	// 5. 尝试在子目录中查找
	subDirs := []string{"lyrics", "Lyrics", "歌词", "lrc", "LRC"}
	for _, subDir := range subDirs {
		subDirPath := filepath.Join(dir, subDir)
		if info, err := os.Stat(subDirPath); err == nil && info.IsDir() {
			for _, ext := range extensions {
				candidates = append(candidates, filepath.Join(subDirPath, baseName+ext))
				if title != "" {
					candidates = append(candidates, filepath.Join(subDirPath, title+ext))
					if artist != "" {
						candidates = append(candidates, filepath.Join(subDirPath, artist+"-"+title+ext))
					}
				}
			}
		}
	}

	// 6. 尝试专辑级别目录查找（向上一级目录）
	parentDir := filepath.Dir(dir)
	if parentDir != dir { // 不是根目录
		for _, ext := range extensions {
			candidates = append(candidates, filepath.Join(parentDir, baseName+ext))
			if title != "" {
				candidates = append(candidates, filepath.Join(parentDir, title+ext))
				if artist != "" {
					candidates = append(candidates, filepath.Join(parentDir, artist+"-"+title+ext))
				}
			}
		}
	}

	// 去重并检查每个候选路径
	seen := make(map[string]bool)
	for _, candidate := range candidates {
		if seen[candidate] {
			continue
		}
		seen[candidate] = true

		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}

	return ""
}

// cleanFileName 清理文件名，移除空格和特殊字符
func cleanFileName(name string) string {
	// 移除常见的文件名非法字符和空格
	cleaned := strings.ReplaceAll(name, " ", "")
	cleaned = strings.ReplaceAll(cleaned, "　", "") // 全角空格
	cleaned = strings.ReplaceAll(cleaned, "_", "")
	cleaned = strings.ReplaceAll(cleaned, "-", "")
	cleaned = strings.ReplaceAll(cleaned, ".", "")
	cleaned = strings.ReplaceAll(cleaned, "【", "")
	cleaned = strings.ReplaceAll(cleaned, "】", "")
	cleaned = strings.ReplaceAll(cleaned, "《", "")
	cleaned = strings.ReplaceAll(cleaned, "》", "")
	cleaned = strings.ReplaceAll(cleaned, "(", "")
	cleaned = strings.ReplaceAll(cleaned, ")", "")
	cleaned = strings.ReplaceAll(cleaned, "[", "")
	cleaned = strings.ReplaceAll(cleaned, "]", "")
	cleaned = strings.ReplaceAll(cleaned, "{", "")
	cleaned = strings.ReplaceAll(cleaned, "}", "")
	return cleaned
}

// resolveLyricsPath 解析歌词文件路径
// lyricsPath: 数据库中存储的歌词路径（可能是绝对路径或相对路径）
// filePath: 对应的音乐文件路径，用于解析相对路径
func resolveLyricsPath(lyricsPath, filePath string) (string, error) {
	// 如果已经是绝对路径，直接返回
	if filepath.IsAbs(lyricsPath) {
		return lyricsPath, nil
	}

	// 如果提供了音乐文件路径，相对路径相对于音乐文件所在目录
	if filePath != "" {
		musicDir := filepath.Dir(filePath)
		absPath := filepath.Join(musicDir, lyricsPath)
		if _, err := os.Stat(absPath); err == nil {
			return absPath, nil
		}
		// 兜底：返回音乐文件同名 .lrc
		fallback := strings.TrimSuffix(filePath, filepath.Ext(filePath)) + ".lrc"
		return fallback, nil
	}

	execPath, err := os.Executable()
	if err != nil {
		if filePath != "" {
			fallback := strings.TrimSuffix(filePath, filepath.Ext(filePath)) + ".lrc"
			return fallback, nil
		}
		return "", fmt.Errorf("无法获取可执行文件路径: %w", err)
	}
	return filepath.Join(filepath.Dir(execPath), lyricsPath), nil
}

// processLyrics 处理内嵌歌词
func processLyrics(lyricsText string) string {
	// 只做安全转换，不做破坏性乱码修复
	return parseLyricsFile([]byte(lyricsText))
}

// processLyricsFile 处理歌词文件，带有 panic 恢复
func processLyricsFile(data []byte, trackID string, logger *zap.SugaredLogger) (lyrics string, err error) {
	defer func() {
		if r := recover(); r != nil {
			logger.Errorf("[Music] Panic occurred while processing lyrics file for track %s: %v", trackID, r)
			lyrics = ""
			err = fmt.Errorf("panic processing lyrics: %v", r)
		}
	}()

	lyrics = parseLyricsFile(data)
	if lyrics == "" {
		return "", fmt.Errorf("解析歌词文件失败或内容为空")
	}
	return lyrics, nil
}

// parseLyricsFile 解析歌词文件内容
// 支持多种格式：
// 1. 普通 LRC 文件（UTF-8 或 GBK）
// 2. Base64 编码的 LRC 文件
func parseLyricsFile(data []byte) string {
	if len(data) == 0 {
		return ""
	}

	// 1. 优先检查是否是 LRC 格式（包含时间戳标记）
	content := string(data)
	if looksLikeLRC(content) {
		return convertLyricsEncoding(data)
	}

	// 2. 尝试 Base64 解码（增加严格验证，避免误判普通 ASCII 歌词）
	if isPureASCII(data) && looksLikeBase64(content) {
		decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(content))
		if err == nil && len(decoded) > 0 {
			// 验证解码结果：必须是有效的 UTF-8 且包含中文字符或 LRC 时间戳
			decodedStr := string(decoded)
			if utf8.Valid(decoded) && (containsChinese(decodedStr) || looksLikeLRC(decodedStr)) {
				data = decoded
			}
		}
	}

	// 3. 自动编码转换（GBK/UTF-8/UTF-16 全支持）
	return convertLyricsEncoding(data)
}

// isPureASCII 检查数据是否只包含 ASCII 字符（0-127）
func isPureASCII(data []byte) bool {
	for _, b := range data {
		if b > 127 {
			return false
		}
	}
	return true
}

// looksLikeBase64 简单检查字符串是否可能是 Base64 编码
func looksLikeBase64(s string) bool {
	s = strings.TrimSpace(s)
	if len(s) == 0 {
		return false
	}
	// Base64 只包含字母、数字、+、/、=
	for _, c := range s {
		if !((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
			(c >= '0' && c <= '9') || c == '+' || c == '/' || c == '=' || c == '\n' || c == '\r') {
			return false
		}
	}
	// Base64 长度通常是 4 的倍数（允许有换行符）
	cleanLen := len(strings.ReplaceAll(strings.ReplaceAll(s, "\n", ""), "\r", ""))
	return cleanLen%4 == 0 || (cleanLen+1)%4 == 0 || (cleanLen+2)%4 == 0
}

// looksLikeLRC 检查字符串是否看起来像 LRC 歌词格式
// LRC 文件通常包含时间戳标记，如 [mm:ss] 或 [mm:ss.xx]
func looksLikeLRC(s string) bool {
	if len(s) == 0 {
		return false
	}
	// 检查是否包含 LRC 时间戳格式 [mm:ss] 或 [mm:ss.xx]
	for i := 0; i < len(s)-5; i++ {
		if s[i] == '[' && i+5 < len(s) {
			// 匹配 [mm:ss 格式
			if isDigit(s[i+1]) && isDigit(s[i+2]) && s[i+3] == ':' && isDigit(s[i+4]) && isDigit(s[i+5]) {
				return true
			}
		}
	}
	return false
}

// isDigit 检查字符是否是数字
func isDigit(c byte) bool {
	return c >= '0' && c <= '9'
}

// convertLyricsEncoding 转换歌词文件的字符编码
// 本地 LRC 文件可能是 GBK、GB18030、UTF-8、UTF-16 等编码
func convertLyricsEncoding(data []byte) string {
	if len(data) == 0 {
		return ""
	}

	// 1. 检查是否有 BOM
	if hasUTF8BOM(data) {
		return string(data[3:])
	}
	if hasUTF16LEBOM(data) {
		return convertUTF16LEToUTF8(data[2:])
	}
	if hasUTF16BEBOM(data) {
		return convertUTF16BEToUTF8(data[2:])
	}

	// 2. 检查是否是有效的 UTF-8（只检查基本的 UTF-8 有效性）
	if utf8.Valid(data) {
		content := string(data)
		// 如果看起来像有效的文本，直接返回
		if looksLikeValidText(data) {
			return content
		}
		// 即使 UTF-8 有效但看起来像乱码，也尝试其他编码（可能是错误解码的结果）
	}

	// 3. 使用 chardet 自动检测编码（提高准确性）
	detector := chardet.NewTextDetector()
	result, err := detector.DetectBest(data)
	if err == nil && result.Confidence > 30 {
		if decoded, ok := decodeByCharset(data, result.Charset); ok {
			if utf8.Valid([]byte(decoded)) && looksLikeValidText([]byte(decoded)) {
				return decoded
			}
		}
	}

	// 4. 尝试常见编码转换作为回退（按优先级排序）
	// GBK 和 GB18030 是中文最常见的编码
	encodings := []string{"gb18030", "gbk", "gb2312", "big5", "utf-16le", "utf-16be", "shift_jis", "euc-jp"}
	for _, enc := range encodings {
		converted, ok := decodeByCharset(data, enc)
		if ok && len(converted) > 0 {
			// 检查转换结果是否有效
			if utf8.Valid([]byte(converted)) && looksLikeValidText([]byte(converted)) {
				// 额外检查：确保转换后的内容包含中文字符（如果原始数据有高位字节）
				hasHighBytes := false
				for _, b := range data {
					if b > 127 {
						hasHighBytes = true
						break
					}
				}
				if !hasHighBytes || containsChinese(converted) {
					return converted
				}
			}
		}
	}

	// 5. 尝试暴力转换：假设是 GBK 编码（中文 Windows 系统最常见）
	if gbkResult, ok := decodeByCharset(data, "gbk"); ok && len(gbkResult) > 0 {
		return gbkResult
	}

	// 6. 返回原始内容（作为最后的回退）
	return string(data)
}

// containsChinese 检查字符串是否包含中文字符
func containsChinese(s string) bool {
	for _, r := range s {
		// 中文字符范围：基本多文种平面的汉字
		if r >= '\u4e00' && r <= '\u9fff' {
			return true
		}
	}
	return false
}

// hasUTF8BOM 检查是否有 UTF-8 BOM
func hasUTF8BOM(data []byte) bool {
	return len(data) >= 3 && data[0] == 0xEF && data[1] == 0xBB && data[2] == 0xBF
}

// hasUTF16LEBOM 检查是否有 UTF-16 LE BOM
func hasUTF16LEBOM(data []byte) bool {
	return len(data) >= 2 && data[0] == 0xFF && data[1] == 0xFE
}

// hasUTF16BEBOM 检查是否有 UTF-16 BE BOM
func hasUTF16BEBOM(data []byte) bool {
	return len(data) >= 2 && data[0] == 0xFE && data[1] == 0xFF
}

// convertUTF16LEToUTF8 将 UTF-16 LE 转换为 UTF-8
func convertUTF16LEToUTF8(data []byte) string {
	var result []rune
	for i := 0; i+1 < len(data); i += 2 {
		c := uint16(data[i]) | uint16(data[i+1])<<8
		result = append(result, rune(c))
	}
	return string(result)
}

// convertUTF16BEToUTF8 将 UTF-16 BE 转换为 UTF-8
func convertUTF16BEToUTF8(data []byte) string {
	var result []rune
	for i := 0; i+1 < len(data); i += 2 {
		c := uint16(data[i])<<8 | uint16(data[i+1])
		result = append(result, rune(c))
	}
	return string(result)
}

// looksLikeValidText 检查数据是否看起来像有效的文本
func looksLikeValidText(data []byte) bool {
	if len(data) == 0 {
		return true
	}

	// 检查是否包含大量不可打印字符
	invalidCount := 0
	for _, b := range data {
		// 检查是否是控制字符（除了常见的换行符）
		if b < 32 && b != '\n' && b != '\r' && b != '\t' {
			invalidCount++
		}
		// 检查是否是高位字节但不是有效的 UTF-8 起始字节
		// UTF-8 起始字节范围：
		// - 双字节: 0xC2-0xDF (110xxxxx)
		// - 三字节: 0xE0-0xEF (1110xxxx)
		// - 四字节: 0xF0-0xF7 (11110xxx)
		// 注意：GBK 编码的字节范围是 0x81-0xFE，与 UTF-8 有重叠
		// 所以这里放宽检测，只检查明显无效的字节
		if b > 127 {
			isValidUTF8Start :=
				(b >= 0xC2 && b <= 0xDF) || // 双字节
					(b >= 0xE0 && b <= 0xEF) || // 三字节
					(b >= 0xF0 && b <= 0xF7) // 四字节
			isValidGBK := (b >= 0x81 && b <= 0xFE) // GBK 范围
			if !isValidUTF8Start && !isValidGBK {
				invalidCount++
			}
		}
	}
	// 如果无效字符超过 15%，则认为不是有效文本（放宽阈值）
	return float64(invalidCount)/float64(len(data)) < 0.15
}

// IncrementPlayCount 增加播放次数（数据库自身保证原子性，无需锁）
func (s *MusicService) IncrementPlayCount(trackID string) error {
	result := s.db.Model(&MusicTrack{}).Where("id = ?", trackID).
		UpdateColumn("play_count", gorm.Expr("play_count + 1"))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("曲目不存在: %s", trackID)
	}
	return nil
}

// ToggleLove 切换喜爱状态（数据库自身保证原子性，无需锁）
func (s *MusicService) ToggleLove(trackID string) (bool, error) {
	var track MusicTrack
	if err := s.db.First(&track, "id = ?", trackID).Error; err != nil {
		return false, err
	}
	newLoved := !track.Loved
	if err := s.db.Model(&track).UpdateColumn("loved", newLoved).Error; err != nil {
		return false, err
	}
	return newLoved, nil
}

// ==================== 播放列表管理 ====================

// CreatePlaylist 创建音乐播放列表
func (s *MusicService) CreatePlaylist(userID, name string) (*MusicPlaylist, error) {
	s.playlistMu.Lock()
	defer s.playlistMu.Unlock()
	playlist := &MusicPlaylist{
		ID:     uuid.NewString(),
		UserID: userID,
		Name:   name,
	}
	return playlist, s.db.Create(playlist).Error
}

// ListPlaylists 获取用户的播放列表
func (s *MusicService) ListPlaylists(userID string) ([]MusicPlaylist, error) {
	var playlists []MusicPlaylist
	err := s.db.Where("user_id = ? OR is_public = ?", userID, true).
		Order("updated_at DESC").Find(&playlists).Error
	return playlists, err
}

// AddToPlaylist 添加曲目到播放列表（批量插入优化）
func (s *MusicService) AddToPlaylist(playlistID string, trackIDs []string) error {
	s.playlistMu.Lock()
	defer s.playlistMu.Unlock()

	var maxOrder int
	if err := s.db.Model(&MusicPlaylistItem{}).Where("playlist_id = ?", playlistID).
		Select("COALESCE(MAX(sort_order), 0)").Scan(&maxOrder).Error; err != nil {
		return err
	}

	// 批量创建播放列表项
	items := make([]MusicPlaylistItem, 0, len(trackIDs))
	for i, trackID := range trackIDs {
		items = append(items, MusicPlaylistItem{
			ID:         uuid.NewString(),
			PlaylistID: playlistID,
			TrackID:    trackID,
			SortOrder:  maxOrder + i + 1,
		})
	}

	if len(items) > 0 {
		if err := s.db.Create(items).Error; err != nil {
			return err
		}
	}

	return s.db.Model(&MusicPlaylist{}).Where("id = ?", playlistID).Update("updated_at", time.Now()).Error
}

// RemoveFromPlaylist 从播放列表移除曲目
func (s *MusicService) RemoveFromPlaylist(playlistID, itemID string) error {
	s.playlistMu.Lock()
	defer s.playlistMu.Unlock()
	return s.db.Where("id = ? AND playlist_id = ?", itemID, playlistID).
		Delete(&MusicPlaylistItem{}).Error
}

// GetPlaylistWithTracks 获取播放列表详情（含曲目）
func (s *MusicService) GetPlaylistWithTracks(playlistID string) (*MusicPlaylist, error) {
	var playlist MusicPlaylist
	err := s.db.Preload("Items", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Preload("Items.Track").First(&playlist, "id = ?", playlistID).Error
	return &playlist, err
}

// DeletePlaylist 删除播放列表
func (s *MusicService) DeletePlaylist(playlistID, userID string) error {
	s.playlistMu.Lock()
	defer s.playlistMu.Unlock()
	s.db.Where("playlist_id = ?", playlistID).Delete(&MusicPlaylistItem{})
	return s.db.Where("id = ? AND user_id = ?", playlistID, userID).Delete(&MusicPlaylist{}).Error
}

// ==================== .cue 文件解析器 ====================

// ParseCueFile 解析 .cue 文件
func (s *MusicService) ParseCueFile(cueFilePath string) (*CueSheet, error) {
	data, err := os.ReadFile(cueFilePath)
	if err != nil {
		return nil, fmt.Errorf("读取 .cue 文件失败: %w", err)
	}

	// 修复：自动转码 GBK → UTF-8（Windows 下的 CUE 几乎全是 GBK）
	content := convertLyricsEncoding(data)
	lines := strings.Split(content, "\n")

	cueSheet := &CueSheet{}
	var currentFile *CueFile
	var currentTrack *CueTrack

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// 处理全局标签
		if strings.HasPrefix(strings.ToUpper(line), "PERFORMER") {
			if currentTrack != nil {
				currentTrack.Artist = parseQuotedValue(line)
			} else {
				cueSheet.Performer = parseQuotedValue(line)
			}
			continue
		}
		if strings.HasPrefix(strings.ToUpper(line), "TITLE") && currentTrack == nil && currentFile == nil {
			cueSheet.Title = parseQuotedValue(line)
			continue
		}

		// 处理 FILE 块
		if strings.HasPrefix(strings.ToUpper(line), "FILE") {
			if currentFile != nil && len(currentFile.Tracks) > 0 {
				cueSheet.Files = append(cueSheet.Files, *currentFile)
			}
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				filename := parseQuotedValue(line)
				filetype := parts[len(parts)-1]
				currentFile = &CueFile{
					Filename: filename,
					FileType: filetype,
				}
			}
			currentTrack = nil
			continue
		}

		// 处理 TRACK
		if strings.HasPrefix(strings.ToUpper(line), "TRACK") {
			if currentTrack != nil && currentFile != nil {
				currentFile.Tracks = append(currentFile.Tracks, *currentTrack)
			}
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				trackNum, _ := strconv.Atoi(parts[1])
				currentTrack = &CueTrack{
					TrackNum: trackNum,
				}
			}
			continue
		}

		// 处理 TRACK 标签
		if currentTrack != nil {
			if strings.HasPrefix(strings.ToUpper(line), "TITLE") {
				currentTrack.Title = parseQuotedValue(line)
				continue
			}
			if strings.HasPrefix(strings.ToUpper(line), "PERFORMER") {
				currentTrack.Artist = parseQuotedValue(line)
				continue
			}
			if strings.HasPrefix(strings.ToUpper(line), "INDEX") {
				parts := strings.Fields(line)
				if len(parts) >= 3 {
					indexType, _ := strconv.Atoi(parts[1])
					timeSec, err := parseCueTime(parts[2])
					if err != nil {
						s.logger.Warnf("解析 CUE INDEX 时间失败: %s, %v", parts[2], err)
						continue
					}
					switch indexType {
					case 0:
						currentTrack.Index00 = timeSec
					case 1:
						currentTrack.Index01 = timeSec
					}
				}
				continue
			}
		}
	}

	// 添加最后一个 FILE
	if currentFile != nil {
		if currentTrack != nil {
			currentFile.Tracks = append(currentFile.Tracks, *currentTrack)
		}
		cueSheet.Files = append(cueSheet.Files, *currentFile)
	}

	return cueSheet, nil
}

// parseQuotedValue 从 .cue 行中解析引号包裹的值
func parseQuotedValue(line string) string {
	quoteChar := byte('"')
	if !strings.Contains(line, "\"") && strings.Contains(line, "'") {
		quoteChar = byte('\'')
	}

	start := strings.IndexByte(line, quoteChar)
	if start == -1 {
		// 没有引号，尝试取第一个空格后的内容
		parts := strings.Fields(line)
		if len(parts) > 1 {
			return strings.Join(parts[1:], " ")
		}
		return ""
	}

	end := strings.IndexByte(line[start+1:], quoteChar)
	if end == -1 {
		return line[start+1:]
	}
	return line[start+1 : start+1+end]
}

// parseCueTime 解析 .cue 时间格式 (MM:SS:FF) 为秒
// FF 是帧，每秒 75 帧
func parseCueTime(timeStr string) (float64, error) {
	parts := strings.Split(timeStr, ":")
	if len(parts) < 2 {
		return 0, fmt.Errorf("invalid CUE time format: %s", timeStr)
	}

	minutes, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, fmt.Errorf("invalid CUE minutes in %s: %w", timeStr, err)
	}
	seconds, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, fmt.Errorf("invalid CUE seconds in %s: %w", timeStr, err)
	}
	frames := 0
	if len(parts) > 2 {
		frames, err = strconv.Atoi(parts[2])
		if err != nil {
			return 0, fmt.Errorf("invalid CUE frames in %s: %w", timeStr, err)
		}
	}

	total := float64(minutes*60 + seconds)
	total += float64(frames) / 75.0
	return total, nil
}

// ProcessCueFile 处理 .cue 文件，创建虚拟曲目（带事务保护和唯一约束）
func (s *MusicService) ProcessCueFile(libraryID, cueFilePath string) (int, []string, error) {
	s.logger.Infof("开始处理 CUE 文件: %s", cueFilePath)

	cueSheet, err := s.ParseCueFile(cueFilePath)
	if err != nil {
		s.logger.Warnf("解析 CUE 文件失败: %s, %v", cueFilePath, err)
		return 0, nil, err
	}

	cueDir := filepath.Dir(cueFilePath)
	normalizedCuePath := normalizePath(cueFilePath)

	// 统计 FILE 和 TRACK 数量
	totalFileCount := len(cueSheet.Files)
	totalTrackCount := 0
	for _, f := range cueSheet.Files {
		totalTrackCount += len(f.Tracks)
	}
	s.logger.Infof("CUE 解析结果: 标题=%s, 演奏者=%s, FILE数=%d, TRACK总数=%d",
		cueSheet.Title, cueSheet.Performer, totalFileCount, totalTrackCount)

	// 启动事务
	tx := s.db.Begin()
	if tx.Error != nil {
		return 0, nil, fmt.Errorf("failed to begin transaction for CUE: %w", tx.Error)
	}

	var txPanic error
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			txPanic = fmt.Errorf("panic during CUE processing: %v", r)
			s.logger.Errorf("Panic during CUE file processing: %v", r)
		}
	}()

	count := 0
	var processedAudioPaths []string

	for _, file := range cueSheet.Files {
		// 查找对应的音频文件（大小写不敏感）
		audioPath := filepath.Join(cueDir, file.Filename)
		if _, err := os.Lstat(audioPath); os.IsNotExist(err) {
			// 尝试大小写不敏感查找
			if foundPath := findFileCaseInsensitive(cueDir, file.Filename); foundPath != "" {
				audioPath = foundPath
			} else {
				// 尝试不同的扩展名
				baseName := strings.TrimSuffix(file.Filename, filepath.Ext(file.Filename))
				for ext := range s.supportedFormats {
					if ext == ".cue" {
						continue
					}
					tryPath := filepath.Join(cueDir, baseName+ext)
					if _, err := os.Lstat(tryPath); err == nil {
						audioPath = tryPath
						break
					}
					// 尝试大小写不敏感查找
					if foundPath := findFileCaseInsensitive(cueDir, baseName+ext); foundPath != "" {
						audioPath = foundPath
						break
					}
				}
			}
		}

		if _, err := os.Lstat(audioPath); os.IsNotExist(err) {
			s.logger.Warnf("找不到 .cue 对应的音频文件: %s (尝试了多种扩展名)", file.Filename)
			continue
		}

		s.logger.Infof("CUE 找到对应音频文件: %s (原始引用: %s)", audioPath, file.Filename)

		// 获取音频文件信息
		fileInfo, err := os.Lstat(audioPath)
		if err != nil {
			s.logger.Warnf("读取音频文件信息失败: %s, %v", audioPath, err)
			continue
		}

		// 获取音频元数据（用于总时长）
		metadata, metaErr := s.ParseMusicMetadata(audioPath)
		totalDuration := 0.0
		if metaErr == nil && metadata != nil {
			totalDuration = metadata.Duration
		} else if metaErr != nil {
			s.logger.Warnf("CUE 音频元数据解析失败: %s, %v", audioPath, metaErr)
			// 用文件大小按 320kbps 标准估算总时长
			totalDuration = float64(fileInfo.Size()) * 8 / 320000
		}
		s.logger.Infof("CUE 音频总时长: %.2f 秒 (文件大小: %d 字节)", totalDuration, fileInfo.Size())

		// 记录已处理的音频路径，避免后续被重复扫描为普通曲目
		processedAudioPaths = append(processedAudioPaths, normalizePath(audioPath))

		// 删除已被普通扫描入库的对应音频曲目（由 CUE 虚拟曲目替代）
		if err := tx.Where("library_id = ? AND file_path = ? AND is_virtual = ?",
			libraryID, normalizePath(audioPath), false).
			Delete(&MusicTrack{}).Error; err != nil {
			tx.Rollback()
			s.logger.Warnf("删除 CUE 音频对应的普通曲目失败: %s, %v", audioPath, err)
			return count, nil, err
		}

		// 为每个音轨创建记录
		for i, track := range file.Tracks {
			// 计算音轨的开始和结束时间
			startTime := track.Index01
			if startTime == 0 && track.Index00 > 0 {
				startTime = track.Index00
			}

			endTime := totalDuration
			if i < len(file.Tracks)-1 {
				nextTrack := file.Tracks[i+1]
				endTime = nextTrack.Index01
				if endTime == 0 && nextTrack.Index00 > 0 {
					endTime = nextTrack.Index00
				}
			}

			duration := endTime - startTime
			if duration <= 0 {
				s.logger.Warnf("CUE 曲目 %s 无法计算时长 (trackNum=%d, startTime=%.2f, endTime=%.2f, totalDuration=%.2f)，跳过",
					track.Title, track.TrackNum, startTime, endTime, totalDuration)
				continue
			}

			// 构造曲目名称
			trackTitle := track.Title
			if trackTitle == "" {
				trackTitle = fmt.Sprintf("Track %02d", track.TrackNum)
			}

			// 构造艺术家
			trackArtist := track.Artist
			if trackArtist == "" {
				trackArtist = cueSheet.Performer
			}

			// 检查是否已存在（通过 .cue 文件路径 + 曲目号）
			var existing int64
			if err := tx.Model(&MusicTrack{}).
				Where("library_id = ? AND cue_file_path = ? AND track_num = ?",
					libraryID, normalizedCuePath, track.TrackNum).
				Count(&existing).Error; err != nil {
				tx.Rollback()
				return count, nil, err
			}
			if existing > 0 {
				continue
			}

			// 创建虚拟曲目
			musicTrack := &MusicTrack{
				ID:          uuid.NewString(),
				LibraryID:   libraryID,
				Title:       trackTitle,
				Artist:      trackArtist,
				Album:       cueSheet.Title,
				TrackNum:    track.TrackNum,
				Duration:    duration,
				FilePath:    normalizePath(audioPath),
				FileSize:    fileInfo.Size(),
				Format:      strings.TrimPrefix(filepath.Ext(audioPath), "."),
				CueFilePath: normalizedCuePath,
				StartTime:   startTime,
				EndTime:     endTime,
				IsVirtual:   true,
			}

			// 填充元数据（如果有）
			if metadata != nil {
				musicTrack.Bitrate = metadata.Bitrate
				musicTrack.SampleRate = metadata.SampleRate
				musicTrack.Channels = metadata.Channels
				if metadata.Year > 0 {
					musicTrack.Year = metadata.Year
				}
			}

			// 查找同目录下的封面图
			if coverPath := findCoverImage(cueDir); coverPath != "" {
				musicTrack.CoverPath = coverPath
			}

			if err := tx.Create(musicTrack).Error; err != nil {
				tx.Rollback()
				s.logger.Warnf("创建虚拟曲目失败: %s, track %d, %v", cueFilePath, track.TrackNum, err)
				return count, nil, err
			}
			count++
			s.logger.Infof("CUE 虚拟曲目已创建: #%d %s - %s (%.2f-%.2f, 时长=%.2f秒)",
				track.TrackNum, trackArtist, trackTitle, startTime, endTime, duration)
		}
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		s.logger.Warnf("提交 CUE 文件处理事务失败: %v", err)
		return count, nil, err
	}

	// 检查是否发生 panic
	if txPanic != nil {
		return count, nil, txPanic
	}

	s.logger.Infof("CUE 文件处理完成: %s, 共创建 %d 条虚拟曲目, 关联音频路径 %d 个",
		cueFilePath, count, len(processedAudioPaths))
	return count, processedAudioPaths, nil
}
