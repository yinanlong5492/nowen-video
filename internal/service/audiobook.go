package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/nowen-video/nowen-video/internal/model"
	"github.com/nowen-video/nowen-video/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

var supportedAudioBookExts = map[string]bool{
	".m4b":  true,
	".m4a":  true,
	".mp3":  true,
	".flac": true,
	".aac":  true,
	".ogg":  true,
	".wma":  true,
	".opus": true,
}

var discLikePattern = regexp.MustCompile(`^(?i)(cd|disc|disk)[\s_-]*\d+$`)

const (
	maxScrapeConcurrency = 5
	ffprobeTimeout       = 30 * time.Second
	probeWorkerTimeout   = 2 * time.Minute
)

type AudioBookService struct {
	db          *gorm.DB
	repo        *repository.AudioBookRepo
	libraryRepo *repository.LibraryRepo
	logger      *zap.SugaredLogger
	scanMu      sync.RWMutex
	mu          sync.Mutex
	ximalaya    *XimalayaService
	wsHub       *WSHub
}

func NewAudioBookService(db *gorm.DB, repo *repository.AudioBookRepo, libraryRepo *repository.LibraryRepo, logger *zap.SugaredLogger) *AudioBookService {
	return &AudioBookService{
		db:          db,
		repo:        repo,
		libraryRepo: libraryRepo,
		logger:      logger,
	}
}

func (s *AudioBookService) SetXimalayaService(xs *XimalayaService) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ximalaya = xs
}

func (s *AudioBookService) SetWSHub(hub *WSHub) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.wsHub = hub
}

func (s *AudioBookService) Migrate() error {
	return s.db.AutoMigrate(&model.AudioBook{})
}

func (s *AudioBookService) GetBook(id string) (*model.AudioBook, error) {
	return s.repo.FindByID(id)
}

func (s *AudioBookService) ListBooks(libraryID string, page, size int) ([]model.AudioBook, int64, error) {
	return s.repo.ListByLibraryIDPaginated(libraryID, page, size)
}

func (s *AudioBookService) SearchBooks(keyword string, page, size int) ([]model.AudioBook, int64, error) {
	return s.repo.Search(keyword, page, size)
}

func (s *AudioBookService) UpdatePlayPosition(id string, position float64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	book, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	book.PlayPosition = position
	now := time.Now()
	book.LastPlayTime = &now
	book.PlayCount++
	return s.repo.Update(book)
}

func (s *AudioBookService) ListBooksByFolder(folderPath string, page, size int, libraryID, keyword string) ([]model.AudioBook, int64, error) {
	return s.repo.ListByFolderPath(folderPath, page, size, libraryID, keyword)
}

func (s *AudioBookService) UpdateBook(id string, updates map[string]interface{}) (*model.AudioBook, error) {
	book, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if v, ok := updates["title"].(string); ok {
		book.Title = v
	}
	if v, ok := updates["author"].(string); ok {
		book.Author = v
	}
	if v, ok := updates["narrator"].(string); ok {
		book.Narrator = v
	}
	if v, ok := updates["description"].(string); ok {
		book.Description = v
	}
	if v, ok := updates["series_name"].(string); ok {
		book.SeriesName = v
	}
	if v, ok := updates["genres"].(string); ok {
		book.Genres = v
	}
	if v, ok := updates["category"].(string); ok {
		book.Category = v
	}
	if v, ok := updates["rating"]; ok {
		switch val := v.(type) {
		case float64:
			book.Rating = val
		case int:
			book.Rating = float64(val)
		case json.Number:
			if f, err := val.Float64(); err == nil {
				book.Rating = f
			}
		}
	}

	return book, s.repo.Update(book)
}

func (s *AudioBookService) DeleteBook(id string) error {
	return s.repo.Delete(id)
}

func (s *AudioBookService) DeleteBookByLibraryID(libraryID string) error {
	return s.repo.DeleteByLibraryID(libraryID)
}

func (s *AudioBookService) DeleteBookByFilePath(filePath, libraryID string) error {
	if libraryID == "" {
		return fmt.Errorf("libraryID is required")
	}
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		return err
	}
	if strings.Contains(absPath, "..") {
		return fmt.Errorf("invalid file path")
	}

	ab, err := s.repo.FindByFilePathOrFolder(filePath)
	if err != nil {
		return err
	}
	if ab.LibraryID != libraryID {
		return fmt.Errorf("audiobook library mismatch")
	}
	return s.repo.Delete(ab.ID)
}

func (s *AudioBookService) GetAllBookFolderPaths(libraryID string) ([]string, error) {
	return s.repo.GetAllFolderPaths(libraryID)
}

func (s *AudioBookService) GetAllBookFolderPathCounts(libraryID string) (map[string]int, error) {
	return s.repo.GetAllFolderPathCounts(libraryID)
}

func (s *AudioBookService) GetChapterList(id string) ([]AudioBookChapter, error) {
	book, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if book.ChapterList == "" {
		return nil, nil
	}
	var chapters []AudioBookChapter
	if err := json.Unmarshal([]byte(book.ChapterList), &chapters); err != nil {
		return nil, err
	}
	return chapters, nil
}

type AudioBookChapter struct {
	Index    int     `json:"index"`
	Title    string  `json:"title"`
	Start    float64 `json:"start"`
	End      float64 `json:"end"`
	Duration float64 `json:"duration"`
	File     string  `json:"file,omitempty"`
}

func (s *AudioBookService) ScanLibrary(libraryID string, dirPaths []string) (int, error) {
	s.scanMu.Lock()
	defer s.scanMu.Unlock()

	existingPaths, err := s.repo.GetAllFilePathsByLibrary(libraryID)
	if err != nil {
		existingPaths = make(map[string]int64)
	}

	folderCache := make(map[string]*scanCacheEntry)

	for _, dirPath := range dirPaths {
		s.collectBooksForScan(libraryID, dirPath, existingPaths, folderCache)
	}

	newBooks := make(map[string]*folderBook)
	modifiedFolders := make(map[string]*folderBook)
	allValidFolders := make(map[string]*folderBook)
	for path, entry := range folderCache {
		allValidFolders[path] = entry.book
		if entry.isNew {
			newBooks[path] = entry.book
		} else if entry.isModified {
			modifiedFolders[path] = entry.book
		}
	}

	existingBooks, listErr := s.repo.ListByLibraryID(libraryID)
	if listErr == nil {
		var removedCount int
		for _, book := range existingBooks {
			if _, exists := allValidFolders[book.FolderPath]; !exists {
				if err := s.repo.Delete(book.ID); err != nil {
					s.logger.Warnf("清理失效有声书失败: %s (%s), 错误: %v", book.Title, book.FolderPath, err)
				} else {
					removedCount++
					s.logger.Infof("清理失效有声书: %s (%s)", book.Title, book.FolderPath)
				}
			}
		}
		if removedCount > 0 {
			s.logger.Infof("清理了 %d 本失效有声书", removedCount)
		}

		existingFolderSet := make(map[string]bool)
		for _, book := range existingBooks {
			existingFolderSet[book.FolderPath] = true
		}
		for path, fb := range newBooks {
			if existingFolderSet[path] {
				modifiedFolders[path] = fb
				delete(newBooks, path)
			}
		}
	}

	var updatedCount int
	for folderPath, fb := range modifiedFolders {
		existing, findErr := s.repo.FindByFolderPath(folderPath)
		if findErr != nil || existing == nil {
			continue
		}

		var newTotalSize int64
		for _, af := range fb.audioFiles {
			newTotalSize += af.size
		}

		hasChanges := false
		if existing.FileSize != newTotalSize {
			existing.FileSize = newTotalSize
			hasChanges = true
		}

		audioFilesChanged := len(fb.audioFiles) > 0 && (existing.FilePath != fb.audioFiles[0].path || existing.FileSize != newTotalSize)
		chapterCountChanged := len(fb.audioFiles) != existing.ChapterCount

		if audioFilesChanged || chapterCountChanged {
			if len(fb.audioFiles) > 1 {
				chapters := make([]AudioBookChapter, len(fb.audioFiles))
				for i, af := range fb.audioFiles {
					chapters[i] = AudioBookChapter{
						Index: i + 1,
						Title: strings.TrimSuffix(af.name, af.ext),
						File:  af.path,
					}
				}
				s.probeChapterDurations(chapters)
				var totalDuration float64
				for i := range chapters {
					totalDuration += chapters[i].Duration
				}
				existing.Duration = totalDuration
				existing.ChapterCount = len(fb.audioFiles)
				existing.IsSingleFile = false
				if chapterJSON, err2 := json.Marshal(chapters); err2 == nil {
					existing.ChapterList = string(chapterJSON)
				}
				hasChanges = true
			} else if len(fb.audioFiles) == 1 {
				existing.IsSingleFile = true
				if dur := s.probeAudioDuration(fb.audioFiles[0].path); dur > 0 && existing.Duration != dur {
					existing.Duration = dur
					hasChanges = true
				}
			}
		}

		if hasChanges {
			if err := s.repo.Update(existing); err != nil {
				s.logger.Warnf("更新有声书技术字段失败: %s (%s), 错误: %v", existing.Title, folderPath, err)
			} else {
				updatedCount++
				s.logger.Infof("更新有声书技术字段: %s (%s), 文件大小=%d", existing.Title, folderPath, newTotalSize)
			}
		}
	}
	if updatedCount > 0 {
		s.logger.Infof("更新了 %d 本有声书的技术字段", updatedCount)
	}

	if len(newBooks) == 0 && updatedCount == 0 {
		s.logger.Infof("有声书库扫描完成，无变更 (libraryID=%s)", libraryID)
		return 0, nil
	}

	var newCount int
	for folderPath, fb := range newBooks {
		book, err := s.buildBook(libraryID, folderPath, fb)
		if err != nil {
			s.logger.Warnf("构建有声书记录失败: %s, 错误: %v", folderPath, err)
			continue
		}

		if err := s.repo.Create(book); err != nil {
			s.logger.Warnf("保存有声书失败: %s, 错误: %v", book.Title, err)
			continue
		}
		newCount++
	}

	s.logger.Infof("有声书库扫描完成: %s, 新增 %d 本, 更新 %d 本", libraryID, newCount, updatedCount)
	return newCount + updatedCount, nil
}

type folderBook struct {
	audioFiles []audioFileInfo
	folderName string
	parentName string
	grandName  string
}

type audioFileInfo struct {
	path    string
	name    string
	size    int64
	ext     string
	modTime time.Time
}

type scanCacheEntry struct {
	book       *folderBook
	isNew      bool
	isModified bool
}

func (s *AudioBookService) collectBooksForScan(libraryID, dirPath string, existingPaths map[string]int64, cache map[string]*scanCacheEntry) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return
	}

	currentFolder := &folderBook{folderName: filepath.Base(dirPath)}
	hasDirectAudio := false
	hasNewFile := false
	hasModifiedFile := false
	var subDirs []string

	for _, entry := range entries {
		name := entry.Name()
		fullPath := filepath.Join(dirPath, name)

		if entry.IsDir() {
			if strings.HasPrefix(name, ".") {
				continue
			}
			if info, err := entry.Info(); err == nil && (info.Mode()&os.ModeSymlink != 0) {
				continue
			}
			subDirs = append(subDirs, fullPath)
			continue
		}

		if info, err := entry.Info(); err == nil && (info.Mode()&os.ModeSymlink != 0) {
			continue
		}

		ext := strings.ToLower(filepath.Ext(name))
		if supportedAudioBookExts[ext] {
			hasDirectAudio = true
			info, err := entry.Info()
			if err != nil {
				continue
			}
			if oldSize, exists := existingPaths[fullPath]; exists {
				if info.Size() != oldSize {
					hasModifiedFile = true
				}
			} else {
				hasNewFile = true
			}
			currentFolder.audioFiles = append(currentFolder.audioFiles, audioFileInfo{
				path:    fullPath,
				name:    name,
				size:    info.Size(),
				ext:     ext,
				modTime: info.ModTime(),
			})
		}
	}

	if hasDirectAudio && len(currentFolder.audioFiles) > 0 {
		for _, subDir := range subDirs {
			s.collectAudioFilesRecursive(subDir, currentFolder, existingPaths, &hasNewFile, &hasModifiedFile)
		}
		sort.Slice(currentFolder.audioFiles, func(i, j int) bool {
			return currentFolder.audioFiles[i].path < currentFolder.audioFiles[j].path
		})
		cache[dirPath] = &scanCacheEntry{
			book:       currentFolder,
			isNew:      hasNewFile,
			isModified: !hasNewFile && hasModifiedFile,
		}
		return
	}

	for _, subDir := range subDirs {
		s.collectBooksForScan(libraryID, subDir, existingPaths, cache)
	}
	s.tryMergeDiscSubdirs(dirPath, subDirs, cache)
}

func (s *AudioBookService) collectAudioFilesRecursive(dirPath string, folder *folderBook, existingPaths map[string]int64, hasNewFile, hasModifiedFile *bool) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return
	}

	for _, entry := range entries {
		name := entry.Name()
		fullPath := filepath.Join(dirPath, name)

		if entry.IsDir() {
			if strings.HasPrefix(name, ".") {
				continue
			}
			if info, err := entry.Info(); err == nil && (info.Mode()&os.ModeSymlink != 0) {
				continue
			}
			s.collectAudioFilesRecursive(fullPath, folder, existingPaths, hasNewFile, hasModifiedFile)
			continue
		}

		if info, err := entry.Info(); err == nil && (info.Mode()&os.ModeSymlink != 0) {
			continue
		}

		ext := strings.ToLower(filepath.Ext(name))
		if supportedAudioBookExts[ext] {
			info, err := entry.Info()
			if err != nil {
				continue
			}
			if oldSize, exists := existingPaths[fullPath]; exists {
				if info.Size() != oldSize {
					*hasModifiedFile = true
				}
			} else {
				*hasNewFile = true
			}
			folder.audioFiles = append(folder.audioFiles, audioFileInfo{
				path:    fullPath,
				name:    name,
				size:    info.Size(),
				ext:     ext,
				modTime: info.ModTime(),
			})
		}
	}
}

func (s *AudioBookService) tryMergeDiscSubdirs(parentPath string, subDirs []string, cache map[string]*scanCacheEntry) {
	if len(subDirs) == 0 {
		return
	}

	childEntries := make([]*scanCacheEntry, 0, len(subDirs))
	for _, subDir := range subDirs {
		entry, ok := cache[subDir]
		if !ok {
			return
		}
		name := filepath.Base(subDir)
		if !discLikePattern.MatchString(name) {
			return
		}
		childEntries = append(childEntries, entry)
	}

	merged := &folderBook{folderName: filepath.Base(parentPath)}
	var hasNew, hasModified bool
	for _, child := range childEntries {
		merged.audioFiles = append(merged.audioFiles, child.book.audioFiles...)
		if child.isNew {
			hasNew = true
		}
		if child.isModified {
			hasModified = true
		}
	}

	for _, subDir := range subDirs {
		delete(cache, subDir)
	}

	sort.Slice(merged.audioFiles, func(i, j int) bool {
		return merged.audioFiles[i].path < merged.audioFiles[j].path
	})

	cache[parentPath] = &scanCacheEntry{
		book:       merged,
		isNew:      hasNew,
		isModified: !hasNew && hasModified,
	}
}

func (s *AudioBookService) buildBook(libraryID, folderPath string, fb *folderBook) (*model.AudioBook, error) {
	title := fb.folderName
	book := &model.AudioBook{
		LibraryID:    libraryID,
		Title:        title,
		FolderPath:   folderPath,
		ScrapeStatus: "pending",
	}

	if parentName := filepath.Base(filepath.Dir(folderPath)); parentName != "" && parentName != "." {
		book.SeriesName = parentName
		parentParent := filepath.Base(filepath.Dir(filepath.Dir(folderPath)))
		if parentParent != "" && parentParent != "." {
			book.Author = parentParent
		}
	}

	if len(fb.audioFiles) == 1 {
		book.FilePath = fb.audioFiles[0].path
		book.Format = strings.TrimPrefix(fb.audioFiles[0].ext, ".")
		book.FileSize = fb.audioFiles[0].size
		book.IsSingleFile = true

		if dur := s.probeAudioDuration(fb.audioFiles[0].path); dur > 0 {
			book.Duration = dur
		}
	} else {
		if len(fb.audioFiles) > 0 {
			book.FilePath = fb.audioFiles[0].path
		}
		book.IsSingleFile = false

		var totalSize int64
		for _, af := range fb.audioFiles {
			totalSize += af.size
		}
		book.FileSize = totalSize

		chapters := make([]AudioBookChapter, len(fb.audioFiles))
		for i, af := range fb.audioFiles {
			chapters[i] = AudioBookChapter{
				Index: i + 1,
				Title: strings.TrimSuffix(af.name, af.ext),
				File:  af.path,
			}
		}

		s.probeChapterDurations(chapters)

		var totalDuration float64
		for i := range chapters {
			totalDuration += chapters[i].Duration
		}
		book.Duration = totalDuration

		chapterJSON, err := json.Marshal(chapters)
		if err != nil {
			s.logger.Warnf("章节列表序列化失败: %s, 错误: %v", folderPath, err)
		} else {
			book.ChapterList = string(chapterJSON)
		}
		book.ChapterCount = len(fb.audioFiles)
	}

	book.CoverPath = s.findCover(folderPath)

	if book.FilePath != "" {
		ext := strings.ToLower(filepath.Ext(book.FilePath))
		book.Format = strings.TrimPrefix(ext, ".")
	}

	return book, nil
}

func (s *AudioBookService) findCover(folderPath string) string {
	coverLower := map[string]string{
		"cover.jpg":  "cover.jpg",
		"cover.png":  "cover.png",
		"cover.webp": "cover.webp",
		"folder.jpg": "folder.jpg",
		"folder.png": "folder.png",
		"poster.jpg": "poster.jpg",
		"poster.png": "poster.png",
	}

	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return ""
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		lower := strings.ToLower(entry.Name())
		if target, ok := coverLower[lower]; ok && target != "" {
			coverLower[lower] = ""
			return filepath.Join(folderPath, entry.Name())
		}
	}
	return ""
}

func (s *AudioBookService) CheckDependencies() error {
	if _, err := exec.LookPath("ffprobe"); err != nil {
		return fmt.Errorf("ffprobe 未安装或不在 PATH 中: %w", err)
	}
	return nil
}

func (s *AudioBookService) validateFileInLibrary(filePath string, book *model.AudioBook) error {
	if !isPathInDir(filePath, book.FolderPath) {
		return fmt.Errorf("file outside book folder")
	}
	if s.libraryRepo == nil {
		return nil
	}
	lib, err := s.libraryRepo.FindByID(book.LibraryID)
	if err != nil {
		return fmt.Errorf("library not found: %w", err)
	}
	for _, rootPath := range lib.AllPaths() {
		if isPathInDir(filePath, rootPath) {
			return nil
		}
	}
	return fmt.Errorf("file outside library root")
}

func isPathInDir(filePath, rootDir string) bool {
	absFile, err := filepath.Abs(filePath)
	if err != nil {
		return false
	}
	absRoot, err := filepath.Abs(rootDir)
	if err != nil {
		return false
	}
	sep := string(filepath.Separator)
	if !strings.HasSuffix(absRoot, sep) {
		absRoot += sep
	}
	return strings.HasPrefix(absFile, absRoot)
}

func (s *AudioBookService) probeAudioDuration(filePath string) float64 {
	ctx, cancel := context.WithTimeout(context.Background(), ffprobeTimeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, "ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		filePath,
	)

	output, err := cmd.Output()
	if err != nil {
		return 0
	}

	var result struct {
		Format struct {
			Duration string `json:"duration"`
		} `json:"format"`
	}

	if err := json.Unmarshal(output, &result); err != nil {
		return 0
	}

	dur, err := strconv.ParseFloat(result.Format.Duration, 64)
	if err != nil {
		s.logger.Debugf("解析时长失败: %v", err)
		return 0
	}
	return dur
}

func (s *AudioBookService) probeChapterDurations(chapters []AudioBookChapter) {
	if len(chapters) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), probeWorkerTimeout)
	defer cancel()

	workers := runtime.NumCPU()
	if workers < 1 {
		workers = 1
	}
	if workers > 16 {
		workers = 16
	}
	if len(chapters) < workers {
		workers = len(chapters)
	}

	type job struct {
		index int
	}

	jobs := make(chan job, len(chapters))
	var wg sync.WaitGroup

	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobs {
				select {
				case <-ctx.Done():
					return
				default:
				}
				chapters[j.index].Duration = s.probeAudioDuration(chapters[j.index].File)
			}
		}()
	}

	for i := range chapters {
		jobs <- job{index: i}
	}
	close(jobs)
	wg.Wait()
}

func (s *AudioBookService) GetCoverPath(id string) (string, error) {
	book, err := s.repo.FindByID(id)
	if err != nil {
		return "", err
	}
	if book.CoverPath == "" {
		return "", fmt.Errorf("no cover available")
	}
	return book.CoverPath, nil
}

func (s *AudioBookService) StreamAudio(id string, w http.ResponseWriter, r *http.Request) error {
	book, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}

	var filePath string
	if book.IsSingleFile && book.FilePath != "" {
		filePath = book.FilePath
	} else {
		chapter := r.URL.Query().Get("chapter")
		if chapter != "" && book.ChapterList != "" {
			var chapters []AudioBookChapter
			if err := json.Unmarshal([]byte(book.ChapterList), &chapters); err == nil {
				chapterIdx, convErr := strconv.Atoi(chapter)
				for _, ch := range chapters {
					if convErr == nil && ch.Index == chapterIdx {
						filePath = ch.File
						break
					}
					if ch.File != "" && filepath.Base(ch.File) == chapter {
						filePath = ch.File
						break
					}
				}
			}
		}
		if filePath == "" && book.FilePath != "" {
			filePath = book.FilePath
		}
	}

	if filePath == "" {
		return fmt.Errorf("no audio file found")
	}

	if err := s.validateFileInLibrary(filePath, book); err != nil {
		return fmt.Errorf("audio file outside book folder")
	}

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return fmt.Errorf("audio file not found: %s", filePath)
	}

	ext := filepath.Ext(filePath)
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "audio/mpeg"
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Cache-Control", "public, max-age=86400")

	http.ServeFile(w, r, filePath)
	return nil
}

func (s *AudioBookService) ServeCover(id string, w io.Writer, r *http.Request) error {
	book, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	if book.CoverPath == "" {
		return fmt.Errorf("no cover available")
	}

	if err := s.validateFileInLibrary(book.CoverPath, book); err != nil {
		return fmt.Errorf("cover file outside book folder")
	}

	coverPath := book.CoverPath

	ext := strings.ToLower(filepath.Ext(coverPath))
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "image/jpeg"
	}

	f, err := os.Open(coverPath)
	if err != nil {
		return err
	}
	defer f.Close()

	if rw, ok := w.(http.ResponseWriter); ok {
		rw.Header().Set("Content-Type", contentType)
		rw.Header().Set("Cache-Control", "public, max-age=86400")
		http.ServeContent(rw, r, filepath.Base(coverPath), time.Time{}, f)
		return nil
	}

	_, err = io.Copy(w, f)
	return err
}

// ==================== 喜马拉雅刮削 ====================

// ScrapeBook 刮削有声书元数据
// 优先使用 ximalaya_id，否则用书名搜索
func (s *AudioBookService) ScrapeBook(bookID string) (*model.AudioBook, error) {
	if s.ximalaya == nil {
		return nil, fmt.Errorf("喜马拉雅刮削服务未配置")
	}

	if !s.ximalaya.IsEnabled() {
		return nil, fmt.Errorf("喜马拉雅刮削未启用")
	}

	book, err := s.repo.FindByID(bookID)
	if err != nil {
		return nil, fmt.Errorf("有声书未找到: %w", err)
	}

	s.logger.Infof("开始刮削有声书: %s (current ximalaya_id=%d)", book.Title, book.XimalayaID)

	var scrapeResult *XimalayaScrapeResult

	if book.XimalayaID > 0 {
		scrapeResult, err = s.ximalaya.ScrapeByID(int64(book.XimalayaID), book.FolderPath)
		if err != nil {
			s.logger.Warnf("通过ID刮削失败，尝试搜索: %v", err)
			scrapeResult, err = s.ximalaya.SearchAndScrape(s.scrapeSearchQuery(book), book.FolderPath)
			if err != nil {
				return nil, err
			}
		} else if isPlaceholderTitle(scrapeResult.Title, int64(book.XimalayaID)) {
			s.logger.Warnf("通过ID刮削返回占位标题，回退搜索")
			searchResult, searchErr := s.ximalaya.SearchAndScrape(s.scrapeSearchQuery(book), book.FolderPath)
			if searchErr == nil && !isPlaceholderTitle(searchResult.Title, 0) {
				scrapeResult = searchResult
			}
		}
	} else {
		scrapeResult, err = s.ximalaya.SearchAndScrape(s.scrapeSearchQuery(book), book.FolderPath)
		if err != nil {
			return nil, err
		}
	}

	s.applyScrapeResult(book, scrapeResult)

	book.ScrapeStatus = "scraped"
	book.ScrapeAttempts++
	now := time.Now()
	book.LastScrapeAt = &now

	if err := s.repo.Update(book); err != nil {
		return nil, fmt.Errorf("保存刮削结果失败: %w", err)
	}

	s.logger.Infof("有声书刮削完成: %s (ximalaya_id=%d)", book.Title, book.XimalayaID)

	s.mu.Lock()
	if s.wsHub != nil {
		s.wsHub.BroadcastEvent(EventScrapeCompleted, &ScrapeProgressData{
			LibraryID:  book.LibraryID,
			MediaTitle: book.Title,
			Total:      1,
			Success:    1,
			Message:    fmt.Sprintf("有声书刮削完成: %s", book.Title),
		})
	}
	s.mu.Unlock()

	return book, nil
}

func isPlaceholderTitle(title string, ximalayaID int64) bool {
	if !strings.HasPrefix(title, "喜马拉雅专辑 ") {
		return false
	}
	if ximalayaID > 0 {
		return title == fmt.Sprintf("喜马拉雅专辑 %d", ximalayaID)
	}
	return true
}

func (s *AudioBookService) scrapeSearchQuery(book *model.AudioBook) string {
	if !strings.HasPrefix(book.Title, "喜马拉雅专辑 ") {
		return book.Title
	}
	if book.FolderPath != "" {
		dirName := filepath.Base(book.FolderPath)
		if dirName != "" && dirName != "." && dirName != "\\" && dirName != "/" {
			s.logger.Infof("书名已损坏(%s)，使用目录名搜索: %s", book.Title, dirName)
			return dirName
		}
	}
	return book.Title
}

func (s *AudioBookService) applyScrapeResult(book *model.AudioBook, result *XimalayaScrapeResult) {
	if result.Title != "" && !strings.HasPrefix(result.Title, "喜马拉雅专辑 ") {
		book.Title = result.Title
	}
	if result.Author != "" {
		book.Author = result.Author
	}
	if result.Narrator != "" {
		book.Narrator = result.Narrator
	}
	if result.Publisher != "" {
		book.Publisher = result.Publisher
	}
	if result.Language != "" {
		book.Language = result.Language
	}
	if result.ISBN != "" {
		book.ISBN = result.ISBN
	}
	if result.Description != "" {
		book.Description = result.Description
	}
	if result.Genres != "" {
		book.Genres = result.Genres
	}
	if result.IsCompleted {
		book.IsCompleted = true
	}
	if result.XimalayaID > 0 {
		book.XimalayaID = int(result.XimalayaID)
	}
	if result.Duration > 0 {
		book.Duration = float64(result.Duration)
	}
	if result.ChapterCount > 0 {
		book.ChapterCount = result.ChapterCount
	}
	if result.ReleaseDate != "" {
		book.ReleaseDate = result.ReleaseDate
	}
	if result.UpdateDate != "" {
		book.UpdateDate = result.UpdateDate
	}
	if result.Year > 0 {
		book.Year = result.Year
	}
	if result.Rating > 0 && book.CommunityRating == 0 {
		book.CommunityRating = result.Rating
	}

	if coverPath := s.findCover(book.FolderPath); coverPath != "" {
		book.CoverPath = coverPath
	}

	// 应用章节列表（仅在本地无章节信息时）
	if len(result.Chapters) > 0 && book.ChapterList == "" {
		var chapters []AudioBookChapter
		for _, ch := range result.Chapters {
			chapters = append(chapters, AudioBookChapter{
				Index:    ch.Index,
				Title:    ch.Title,
				Duration: float64(ch.Duration),
			})
		}
		if data, err := json.Marshal(chapters); err == nil {
			book.ChapterList = string(data)
		}
	}
}

// ScrapeBookByXimalayaID 通过喜马拉雅专辑ID刮削元数据
func (s *AudioBookService) ScrapeBookByXimalayaID(bookID string, ximalayaID int64) (*model.AudioBook, error) {
	if s.ximalaya == nil {
		return nil, fmt.Errorf("喜马拉雅刮削服务未配置")
	}

	book, err := s.repo.FindByID(bookID)
	if err != nil {
		return nil, fmt.Errorf("有声书未找到: %w", err)
	}

	s.logger.Infof("通过喜马拉雅ID刮削有声书: %s (ximalaya_id=%d)", book.Title, ximalayaID)

	scrapeResult, err := s.ximalaya.ScrapeByID(ximalayaID, book.FolderPath)
	if err != nil {
		return nil, err
	}

	s.applyScrapeResult(book, scrapeResult)

	book.ScrapeStatus = "scraped"
	book.ScrapeAttempts++
	now := time.Now()
	book.LastScrapeAt = &now

	if err := s.repo.Update(book); err != nil {
		return nil, fmt.Errorf("保存刮削结果失败: %w", err)
	}

	s.mu.Lock()
	if s.wsHub != nil {
		s.wsHub.BroadcastEvent(EventScrapeCompleted, &ScrapeProgressData{
			LibraryID:  book.LibraryID,
			MediaTitle: book.Title,
			Total:      1,
			Success:    1,
			Message:    fmt.Sprintf("有声书刮削完成: %s", book.Title),
		})
	}
	s.mu.Unlock()

	return book, nil
}

// SearchXimalayaAlbums 搜索喜马拉雅专辑（供前端选择）
func (s *AudioBookService) SearchXimalayaAlbums(keyword string, page int) ([]XimalayaSearchResult, int, error) {
	if s.ximalaya == nil {
		return nil, 0, fmt.Errorf("喜马拉雅刮削服务未配置")
	}

	results, total, err := s.ximalaya.SearchAlbums(keyword, page, 20)
	if err != nil || len(results) == 0 {
		s.logger.Warnf("移动端搜索失败或无结果: %v，尝试Web搜索", err)
		results, _, err = s.ximalaya.SearchAlbumsWeb(keyword, page)
	}
	return results, total, err
}

// ScrapeAllBooks 刮削媒体库中所有有声书的元数据
func (s *AudioBookService) ScrapeAllBooks(libraryID string) error {
	if s.ximalaya == nil {
		return fmt.Errorf("喜马拉雅刮削服务未配置")
	}

	if !s.ximalaya.IsEnabled() {
		return fmt.Errorf("喜马拉雅刮削未启用")
	}

	books, err := s.repo.ListByLibraryID(libraryID)
	if err != nil {
		return fmt.Errorf("获取有声书列表失败: %w", err)
	}

	if len(books) == 0 {
		s.logger.Infof("有声书库 %s 中没有书籍需要刮削", libraryID)
		return nil
	}

	libName := libraryID
	if s.libraryRepo != nil {
		if lib, err := s.libraryRepo.FindByID(libraryID); err == nil && lib != nil {
			libName = lib.Name
		}
	}

	s.logger.Infof("开始批量刮削有声书库 %s，共 %d 本", libraryID, len(books))

	var successCount, failedCount, processedCount int32
	broadcastProgress := func() {
		s.mu.Lock()
		hub := s.wsHub
		s.mu.Unlock()
		if hub == nil {
			return
		}
		hub.BroadcastEvent(EventScrapeProgress, &ScrapeProgressData{
			LibraryID:   libraryID,
			LibraryName: libName,
			Current:     int(atomic.LoadInt32(&processedCount)),
			Total:       len(books),
			Success:     int(atomic.LoadInt32(&successCount)),
			Failed:      int(atomic.LoadInt32(&failedCount)),
			Message:     fmt.Sprintf("正在刮削有声书... %d/%d", atomic.LoadInt32(&processedCount), len(books)),
		})
	}

	s.mu.Lock()
	if s.wsHub != nil {
		s.wsHub.BroadcastEvent(EventScrapeStarted, &ScrapeProgressData{
			LibraryID:   libraryID,
			LibraryName: libName,
			Total:       len(books),
			Message:     fmt.Sprintf("开始批量刮削有声书: %s, 共 %d 本", libName, len(books)),
		})
	}
	s.mu.Unlock()

	sem := make(chan struct{}, maxScrapeConcurrency)
	var wg sync.WaitGroup

	for _, book := range books {
		wg.Add(1)
		sem <- struct{}{}
		go func(b model.AudioBook) {
			defer func() {
				<-sem
				atomic.AddInt32(&processedCount, 1)
				broadcastProgress()
				wg.Done()
			}()
			if _, err := s.ScrapeBook(b.ID); err != nil {
				s.logger.Errorf("刮削有声书 '%s' (%s) 失败: %v", b.Title, b.ID, err)
				atomic.AddInt32(&failedCount, 1)
			} else {
				atomic.AddInt32(&successCount, 1)
			}
		}(book)
	}

	wg.Wait()

	s.mu.Lock()
	if s.wsHub != nil {
		s.wsHub.BroadcastEvent(EventScrapeCompleted, &ScrapeProgressData{
			LibraryID:   libraryID,
			LibraryName: libName,
			Total:       len(books),
			Success:     int(atomic.LoadInt32(&successCount)),
			Failed:      int(atomic.LoadInt32(&failedCount)),
			Message:     fmt.Sprintf("有声书刮削完成: %s, 成功 %d, 失败 %d", libName, successCount, failedCount),
		})
	}
	s.mu.Unlock()

	s.logger.Infof("有声书库 %s 批量刮削任务已完成", libraryID)
	return nil
}
