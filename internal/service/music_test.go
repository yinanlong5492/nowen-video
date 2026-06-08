package service

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// setupMusicTestDB 创建内存 SQLite 数据库并迁移 MusicTrack 表
func setupMusicTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("连接数据库失败: %v", err)
	}

	// 手动建表（模拟实际 schema）
	if err := db.AutoMigrate(&MusicTrack{}); err != nil {
		t.Fatalf("迁移 MusicTrack 表失败: %v", err)
	}

	// 创建必要的复合索引
	db.Exec("DROP INDEX IF EXISTS idx_tracks_file_path")
	if err := db.Exec(
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_file_path ON music_tracks(library_id, file_path) WHERE is_virtual = false",
	).Error; err != nil {
		t.Fatalf("创建索引失败: %v", err)
	}

	return db
}

// createTempAudioDir 创建临时目录和一个伪装的音频文件
func createTempAudioDir(t *testing.T) (dir, filePath string) {
	t.Helper()
	dir, err := os.MkdirTemp("", "music-scan-test-*")
	if err != nil {
		t.Fatalf("创建临时目录失败: %v", err)
	}
	t.Cleanup(func() {
		os.RemoveAll(dir)
	})

	// 创建一个伪装的 .mp3 文件（只有几个字节，不是真实音频）
	filePath = filepath.Join(dir, "test-song.mp3")
	if err := os.WriteFile(filePath, []byte("fake-mp3-data"), 0644); err != nil {
		t.Fatalf("创建测试文件失败: %v", err)
	}

	return dir, filePath
}

// getFileModTime 获取文件修改时间
func getFileModTime(t *testing.T, path string) time.Time {
	t.Helper()
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("获取文件信息失败: %v", err)
	}
	return info.ModTime()
}

func testGetFileSize(t *testing.T, path string) int64 {
	t.Helper()
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("获取文件信息失败: %v", err)
	}
	return info.Size()
}

// TestScanMusicLibrary_PreserveUserMetadata 测试：
// 用户通过文件管理器修改音乐元数据后，刷新媒体库时元数据不会被还原
func TestScanMusicLibrary_PreserveUserMetadata(t *testing.T) {
	normalize := func(p string) string {
		return strings.ReplaceAll(strings.ToLower(filepath.ToSlash(filepath.Clean(p))), "\\\\", "/")
	}

	db := setupMusicTestDB(t)
	dir, filePath := createTempAudioDir(t)
	normPath := normalize(filePath)
	fileModTime := getFileModTime(t, filePath)
	fileSize := testGetFileSize(t, filePath)
	libraryID := "test-lib-001"

	svc, err := NewMusicService(db, testLogger())
	if err != nil {
		t.Fatalf("创建 MusicService 失败: %v", err)
	}

	// 修正 scan 过程中使用的路径格式（降斜杠 + 小写 — 跟 normalizePath 一致）
	_ = normPath

	// ============================================================
	// 步骤 1：模拟已有场景 — 直接插入一条用户已编辑过的记录
	// ============================================================
	track := MusicTrack{
		ID:          "track-001",
		LibraryID:   libraryID,
		Title:       "用户修改后的标题",
		Artist:      "用户修改后的艺术家",
		Album:       "用户修改后的专辑",
		AlbumArtist: "用户修改后的专辑艺术家",
		Genre:       "Pop",
		Year:        2024,
		TrackNum:    5,
		DiscNum:     1,
		Duration:    200.0,
		Bitrate:     320000,
		SampleRate:  44100,
		Channels:    2,
		Format:      "mp3",
		FilePath:    normPath,
		FileSize:    fileSize,
		FileModTime: fileModTime,
		MusicLanguage: "简体中文",
		Composer:    "用户自定义的作曲者",
		Lyricist:    "用户自定义的作词者",
		Arranger:    "用户自定义的编曲者",
		IsVirtual:   false,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// 打印写入时的 FileModTime，方便排查
	t.Logf("写入 DB 的 FileModTime: %v", track.FileModTime)

	if err := db.Create(&track).Error; err != nil {
		t.Fatalf("插入已有曲目失败: %v", err)
	}

	// ============================================================
	// 步骤 2：刷新音乐库（模拟用户在系统管理中点击"扫描"）
	// ============================================================
	count, err := svc.ScanMusicLibrary(libraryID, []string{dir})
	if err != nil {
		t.Fatalf("扫描音乐库失败: %v", err)
	}
	t.Logf("扫描完成，新增曲目数: %d", count)

	// ============================================================
	// 步骤 3：验证 —— 用户修改的元数据是否被保留
	// ============================================================
	var result MusicTrack
	if err := db.Where("file_path = ? AND library_id = ?", normPath, libraryID).First(&result).Error; err != nil {
		t.Fatalf("扫描后找不到曲目记录（可能被清理逻辑删除了！） ❌: %v", err)
	}

	// 打印结果，方便比照
	t.Logf("Scan 后 DB 中 FileModTime: %v", result.FileModTime)

	checks := []struct {
		label string
		got   interface{}
		want  interface{}
	}{
		{"标题 (Title)", result.Title, "用户修改后的标题"},
		{"艺术家 (Artist)", result.Artist, "用户修改后的艺术家"},
		{"专辑 (Album)", result.Album, "用户修改后的专辑"},
		{"专辑艺术家 (AlbumArtist)", result.AlbumArtist, "用户修改后的专辑艺术家"},
		{"风格 (Genre)", result.Genre, "Pop"},
		{"年份 (Year)", result.Year, 2024},
		{"曲目号 (TrackNum)", result.TrackNum, 5},
		{"碟片号 (DiscNum)", result.DiscNum, 1},
		{"语言 (MusicLanguage)", result.MusicLanguage, "简体中文"},
		{"作曲者 (Composer)", result.Composer, "用户自定义的作曲者"},
		{"作词者 (Lyricist)", result.Lyricist, "用户自定义的作词者"},
		{"编曲者 (Arranger)", result.Arranger, "用户自定义的编曲者"},
		{"文件大小 (FileSize)", result.FileSize, fileSize},
	}

	for _, c := range checks {
		if c.got != c.want {
			t.Errorf("用户元数据被还原：%s = %v，期望 %v ❌", c.label, c.got, c.want)
		} else {
			t.Logf("%s 保留正确: %v ✓", c.label, c.got)
		}
	}
}

// TestScanMusicLibrary_FileModTimeZero 测试：
// 旧数据 FileModTime 为 NULL/零值时，刷新媒体库不会删除记录且保留用户元数据
func TestScanMusicLibrary_FileModTimeZero(t *testing.T) {
	normalize := func(p string) string {
		return strings.ReplaceAll(strings.ToLower(filepath.ToSlash(filepath.Clean(p))), "\\\\", "/")
	}

	db := setupMusicTestDB(t)
	dir, filePath := createTempAudioDir(t)
	normPath := normalize(filePath)
	fileSize := testGetFileSize(t, filePath)
	libraryID := "test-lib-002"

	svc, err := NewMusicService(db, testLogger())
	if err != nil {
		t.Fatalf("创建 MusicService 失败: %v", err)
	}

	// ============================================================
	// 模拟"旧记录"：FileModTime 为零值（如早期版本未记录 modtime）
	// ============================================================
	track := MusicTrack{
		ID:            "track-002",
		LibraryID:     libraryID,
		Title:         "用户修改的歌曲名",
		Artist:        "用户修改的歌手",
		Album:         "自定义专辑名",
		Genre:         "Rock",
		Year:          1999,
		TrackNum:      3,
		Format:        "mp3",
		FilePath:      normPath,
		FileSize:      fileSize,
		FileModTime:   time.Time{}, // <-- 零值！模拟旧数据没有 modtime
		MusicLanguage: "日语",
		Composer:      "Z",
		IsVirtual:     false,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	t.Logf("FileModTime 零值: %v", track.FileModTime)

	if err := db.Create(&track).Error; err != nil {
		t.Fatalf("插入零值 FileModTime 曲目失败: %v", err)
	}

	// ============================================================
	// 刷新音乐库
	// ============================================================
	count, err := svc.ScanMusicLibrary(libraryID, []string{dir})
	if err != nil {
		t.Fatalf("扫描音乐库失败: %v", err)
	}
	t.Logf("扫描完成，新增曲目数: %d", count)

	// ============================================================
	// 验证记录仍然存在且用户元数据保留
	// ============================================================
	var result MusicTrack
	if err := db.Where("file_path = ? AND library_id = ?", normPath, libraryID).First(&result).Error; err != nil {
		t.Fatalf("FileModTime 为零值时，扫描后记录被删除了 ❌: %v", err)
	}

	// 零值 case 必定走入"已修改"分支，应更新技术字段 + 保留用户元数据
	t.Logf("Scan 后 DB 中 FileModTime: %v", result.FileModTime)

	checks := []struct {
		label string
		got   interface{}
		want  interface{}
	}{
		{"标题 (Title)", result.Title, "用户修改的歌曲名"},
		{"艺术家 (Artist)", result.Artist, "用户修改的歌手"},
		{"专辑 (Album)", result.Album, "自定义专辑名"},
		{"风格 (Genre)", result.Genre, "Rock"},
		{"年份 (Year)", result.Year, 1999},
		{"语言 (MusicLanguage)", result.MusicLanguage, "日语"},
		{"作曲者 (Composer)", result.Composer, "Z"},
	}

	for _, c := range checks {
		if c.got != c.want {
			t.Errorf("用户元数据被还原：%s = %v，期望 %v ❌", c.label, c.got, c.want)
		} else {
			t.Logf("%s 保留正确: %v ✓", c.label, c.got)
		}
	}

	// 额外确认：技术字段应当被更新（FileModTime 从零值变为实际值）
	if result.FileModTime.IsZero() {
		t.Error("扫描后 FileModTime 仍为零值，技术字段未被更新 ❌")
	} else {
		t.Logf("技术字段已更新：FileModTime = %v ✓", result.FileModTime)
	}
	if result.FileSize != fileSize {
		t.Errorf("FileSize 未更新: got=%d, want=%d ❌", result.FileSize, fileSize)
	} else {
		t.Logf("FileSize 保留正确: %d ✓", result.FileSize)
	}
}