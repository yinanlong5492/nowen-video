package repository

import (
	"path/filepath"
	"strings"

	"github.com/nowen-video/nowen-video/internal/model"
	"gorm.io/gorm"
)

type AudioBookRepo struct {
	db *gorm.DB
}

func (r *AudioBookRepo) DB() *gorm.DB {
	return r.db
}

func (r *AudioBookRepo) Create(ab *model.AudioBook) error {
	return r.db.Create(ab).Error
}

func (r *AudioBookRepo) FindByID(id string) (*model.AudioBook, error) {
	var ab model.AudioBook
	err := r.db.First(&ab, "id = ?", id).Error
	return &ab, err
}

func (r *AudioBookRepo) FindByFilePath(filePath string) (*model.AudioBook, error) {
	var ab model.AudioBook
	err := r.db.Where("file_path = ?", filePath).First(&ab).Error
	return &ab, err
}

func (r *AudioBookRepo) FindByFolderPath(folderPath string) (*model.AudioBook, error) {
	var ab model.AudioBook
	err := r.db.Where("folder_path = ?", folderPath).First(&ab).Error
	return &ab, err
}

func (r *AudioBookRepo) FindByFilePathOrFolder(filePath string) (*model.AudioBook, error) {
	var ab model.AudioBook
	normalized := strings.ReplaceAll(filePath, "\\", "/")
	err := r.db.Where("REPLACE(file_path, '\\', '/') = ?", normalized).First(&ab).Error
	if err == nil {
		return &ab, nil
	}

	dir := strings.ReplaceAll(filepath.Dir(filePath), "\\", "/")
	err = r.db.Where("REPLACE(folder_path, '\\', '/') = ?", dir).First(&ab).Error
	return &ab, err
}

func (r *AudioBookRepo) ListByLibraryID(libraryID string) ([]model.AudioBook, error) {
	var books []model.AudioBook
	err := r.db.Where("library_id = ?", libraryID).Order("title ASC").Find(&books).Error
	return books, err
}

func (r *AudioBookRepo) ListByLibraryIDPaginated(libraryID string, page, size int) ([]model.AudioBook, int64, error) {
	var books []model.AudioBook
	var total int64

	query := r.db.Model(&model.AudioBook{})
	if libraryID != "" {
		query = query.Where("library_id = ?", libraryID)
	}
	query.Count(&total)
	err := query.Order("title ASC").Offset((page - 1) * size).Limit(size).Find(&books).Error
	return books, total, err
}

func (r *AudioBookRepo) ListByFolderPath(folderPath string, page, size int, libraryID, keyword string) ([]model.AudioBook, int64, error) {
	var books []model.AudioBook
	var total int64

	normalizedPath := strings.ReplaceAll(folderPath, "\\", "/")

	query := r.db.Model(&model.AudioBook{}).Where(
		"REPLACE(folder_path, '\\', '/') = ? OR REPLACE(folder_path, '\\', '/') LIKE ?",
		normalizedPath, normalizedPath+"/%")
	if libraryID != "" {
		query = query.Where("library_id = ?", libraryID)
	}
	if keyword != "" {
		escaped := escapeLike(keyword)
		query = query.Where("title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\' OR narrator LIKE ? ESCAPE '\\'",
			"%"+escaped+"%", "%"+escaped+"%", "%"+escaped+"%")
	}
	query.Count(&total)
	err := query.Order("title ASC").Offset((page - 1) * size).Limit(size).Find(&books).Error
	return books, total, err
}

func (r *AudioBookRepo) Update(ab *model.AudioBook) error {
	return r.db.Save(ab).Error
}

func (r *AudioBookRepo) Delete(id string) error {
	return r.db.Unscoped().Delete(&model.AudioBook{}, "id = ?", id).Error
}

func (r *AudioBookRepo) DeleteByLibraryID(libraryID string) error {
	return r.db.Unscoped().Where("library_id = ?", libraryID).Delete(&model.AudioBook{}).Error
}

func (r *AudioBookRepo) GetAllFilePathsByLibrary(libraryID string) (map[string]int64, error) {
	var books []model.AudioBook
	if err := r.db.Where("library_id = ?", libraryID).Select("file_path, file_size").Find(&books).Error; err != nil {
		return nil, err
	}
	result := make(map[string]int64, len(books))
	for _, b := range books {
		if b.FilePath != "" {
			result[b.FilePath] = b.FileSize
		}
	}
	return result, nil
}

func (r *AudioBookRepo) GetAllFolderPaths(libraryID string) ([]string, error) {
	var paths []string
	query := r.db.Model(&model.AudioBook{}).Select("folder_path").Where("folder_path != ''")
	if libraryID != "" {
		query = query.Where("library_id = ?", libraryID)
	}
	if err := query.Pluck("folder_path", &paths).Error; err != nil {
		return nil, err
	}
	return paths, nil
}

type FolderPathCount struct {
	FolderPath   string `gorm:"column:folder_path"`
	ChapterCount int    `gorm:"column:chapter_count"`
	IsSingleFile bool   `gorm:"column:is_single_file"`
}

func (r *AudioBookRepo) GetAllFolderPathCounts(libraryID string) (map[string]int, error) {
	var rows []FolderPathCount
	query := r.db.Model(&model.AudioBook{}).
		Select("folder_path, chapter_count, is_single_file").
		Where("folder_path != ''")
	if libraryID != "" {
		query = query.Where("library_id = ?", libraryID)
	}
	if err := query.Find(&rows).Error; err != nil {
		return nil, err
	}
	result := make(map[string]int, len(rows))
	for _, row := range rows {
		count := row.ChapterCount
		if row.IsSingleFile || count <= 0 {
			count = 1
		}
		normalized := strings.ReplaceAll(row.FolderPath, "\\", "/")
		result[normalized] = count
	}
	return result, nil
}

func (r *AudioBookRepo) Search(keyword string, page, size int) ([]model.AudioBook, int64, error) {
	var books []model.AudioBook
	var total int64

	escaped := escapeLike(keyword)
	query := r.db.Model(&model.AudioBook{}).
		Where("title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\' OR narrator LIKE ? ESCAPE '\\'",
			"%"+escaped+"%", "%"+escaped+"%", "%"+escaped+"%")
	query.Count(&total)
	err := query.Order("title ASC").Offset((page - 1) * size).Limit(size).Find(&books).Error
	return books, total, err
}

func escapeLike(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "%", "\\%")
	s = strings.ReplaceAll(s, "_", "\\_")
	return s
}
