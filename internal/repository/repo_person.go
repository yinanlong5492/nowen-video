package repository

import (
	"github.com/nowen-video/nowen-video/internal/model"
	"gorm.io/gorm"
)

// ==================== PersonRepo ====================

type PersonRepo struct {
	db *gorm.DB
}

func (r *PersonRepo) Create(person *model.Person) error {
	return r.db.Create(person).Error
}

func (r *PersonRepo) Update(person *model.Person) error {
	return r.db.Save(person).Error
}

func (r *PersonRepo) FindByID(id string) (*model.Person, error) {
	var person model.Person
	err := r.db.First(&person, "id = ?", id).Error
	return &person, err
}

func (r *PersonRepo) FindByTMDbID(tmdbID int) (*model.Person, error) {
	var person model.Person
	err := r.db.Where("tmdb_id = ?", tmdbID).First(&person).Error
	return &person, err
}

func (r *PersonRepo) FindByName(name string) (*model.Person, error) {
	var person model.Person
	err := r.db.Where("name = ?", name).First(&person).Error
	return &person, err
}

func (r *PersonRepo) FindOrCreate(name string, tmdbID int) (*model.Person, error) {
	if tmdbID > 0 {
		person, err := r.FindByTMDbID(tmdbID)
		if err == nil {
			return person, nil
		}
	}
	person, err := r.FindByName(name)
	if err == nil {
		return person, nil
	}
	newPerson := &model.Person{Name: name, TMDbID: tmdbID}
	if err := r.Create(newPerson); err != nil {
		return nil, err
	}
	return newPerson, nil
}

// FindOrCreateByTMDbID 通过 TMDbID 查找或创建人物，处理唯一约束冲突
// 注意：profileURL 仅用于下载，不直接写入 Person.ProfileURL（ProfileURL 由 downloadPersonProfile 下载后写入本地路径）
func (r *PersonRepo) FindOrCreateByTMDbID(tmdbID int, name, profileURL string) (*model.Person, error) {
	// 先查找已存在的
	existing, err := r.FindByTMDbID(tmdbID)
	if err == nil {
		// 必要时更新名称（但不更新 ProfileURL，因为它应该由 downloadPersonProfile 管理）
		if existing.Name == "" && name != "" {
			existing.Name = name
			r.Update(existing)
		}
		return existing, nil
	}

	// 不存在则创建（ProfileURL 留空，由 downloadPersonProfile 下载后填入本地路径）
	newPerson := &model.Person{
		TMDbID: tmdbID,
		Name:   name,
	}
	if err := r.Create(newPerson); err != nil {
		// 唯一约束冲突：另一个 goroutine 先创建了，重新查找
		existing, findErr := r.FindByTMDbID(tmdbID)
		if findErr == nil {
			if existing.Name == "" && name != "" {
				existing.Name = name
				r.Update(existing)
			}
			return existing, nil
		}
		return nil, err
	}
	return newPerson, nil
}

func (r *PersonRepo) Search(keyword string, limit int) ([]model.Person, error) {
	var people []model.Person
	err := r.db.Where("name LIKE ?", "%"+keyword+"%").Limit(limit).Find(&people).Error
	return people, err
}

// ==================== MediaPersonRepo ====================

type MediaPersonRepo struct {
	db *gorm.DB
}

// WithTx 返回使用指定事务的临时仓库实例（供跨 Repo 事务使用）
func (r *MediaPersonRepo) WithTx(tx *gorm.DB) *MediaPersonRepo {
	return &MediaPersonRepo{db: tx}
}

func (r *MediaPersonRepo) Create(mp *model.MediaPerson) error {
	return r.db.Create(mp).Error
}

func (r *MediaPersonRepo) ListByMediaID(mediaID string) ([]model.MediaPerson, error) {
	var mps []model.MediaPerson
	err := r.db.Preload("Person").Where("media_id = ?", mediaID).
		Order("role ASC, sort_order ASC").Find(&mps).Error
	return mps, err
}

func (r *MediaPersonRepo) ListBySeriesID(seriesID string) ([]model.MediaPerson, error) {
	var mps []model.MediaPerson
	err := r.db.Preload("Person").Where("series_id = ?", seriesID).
		Order("role ASC, sort_order ASC").Find(&mps).Error
	return mps, err
}

func (r *MediaPersonRepo) DeleteByMediaID(mediaID string) error {
	return r.db.Where("media_id = ?", mediaID).Delete(&model.MediaPerson{}).Error
}

func (r *MediaPersonRepo) DeleteBySeriesID(seriesID string) error {
	return r.db.Where("series_id = ?", seriesID).Delete(&model.MediaPerson{}).Error
}

// DeleteByLibraryMediaIDs 删除指定媒体库下所有媒体关联的演职人员记录
func (r *MediaPersonRepo) DeleteByLibraryMediaIDs(libraryID string) error {
	return r.db.Where("media_id IN (SELECT id FROM media WHERE library_id = ?)", libraryID).
		Delete(&model.MediaPerson{}).Error
}

// DeleteByLibrarySeriesIDs 删除指定媒体库下所有剧集合集关联的演职人员记录
func (r *MediaPersonRepo) DeleteByLibrarySeriesIDs(libraryID string) error {
	return r.db.Where("series_id IN (SELECT id FROM series WHERE library_id = ?)", libraryID).
		Delete(&model.MediaPerson{}).Error
}

// DeduplicateBySeriesID 清理同一 series_id 下重复的演职人员记录
// 相同 person_id + role 只保留 sort_order 最小的那条
func (r *MediaPersonRepo) DeduplicateBySeriesID(seriesID string) (int64, error) {
	// 子查询：找出每组 (person_id, role) 中需要保留的记录 ID（sort_order 最小的）
	// 然后删除不在保留列表中的记录
	result := r.db.Exec(`
		DELETE FROM media_persons
		WHERE series_id = ? AND id NOT IN (
			SELECT keep_id FROM (
				SELECT MIN(id) as keep_id
				FROM media_persons
				WHERE series_id = ?
				GROUP BY person_id, role
			) AS keeper
		)
	`, seriesID, seriesID)
	return result.RowsAffected, result.Error
}

func (r *MediaPersonRepo) ListByPersonID(personID string) ([]model.MediaPerson, error) {
	var mps []model.MediaPerson
	err := r.db.Where("person_id = ?", personID).Find(&mps).Error
	return mps, err
}

// ListMediaByPersonID 根据 person_id 查询该演员参演的所有影视作品（电影）
func (r *MediaPersonRepo) ListMediaByPersonID(personID string) ([]model.Media, error) {
	var media []model.Media
	err := r.db.
		Where("id IN (?)",
			r.db.Model(&model.MediaPerson{}).Select("media_id").Where("person_id = ? AND media_id != ''", personID),
		).
		Order("year DESC, created_at DESC").
		Find(&media).Error
	return media, err
}

// ListSeriesByPersonID 根据 person_id 查询该演员参演的所有剧集合集
func (r *MediaPersonRepo) ListSeriesByPersonID(personID string) ([]model.Series, error) {
	var series []model.Series
	err := r.db.
		Where("id IN (?)",
			r.db.Model(&model.MediaPerson{}).Select("series_id").Where("person_id = ? AND series_id != ''", personID),
		).
		Order("year DESC, created_at DESC").
		Find(&series).Error
	return series, err
}
