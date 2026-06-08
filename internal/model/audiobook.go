package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AudioBook struct {
	ID          string `json:"id" gorm:"primaryKey;type:text"`
	LibraryID   string `json:"library_id" gorm:"index;type:text;not null"`
	Title       string `json:"title" gorm:"index;type:text;not null"`
	OrigTitle   string `json:"orig_title" gorm:"type:text"`
	SubTitle    string `json:"sub_title" gorm:"type:text"`
	SortTitle   string `json:"sort_title" gorm:"type:text"`
	Description string `json:"description" gorm:"type:text"`
	CoverPath   string `json:"cover_path" gorm:"type:text"`

	Author    string `json:"author" gorm:"index;type:text"`
	Narrator  string `json:"narrator" gorm:"index;type:text"`
	Publisher string `json:"publisher" gorm:"type:text"`

	SeriesName     string `json:"series_name" gorm:"index;type:text"`
	SeriesPosition int    `json:"series_position"`

	Language      string `json:"language" gorm:"type:text"`
	Genres        string `json:"genres" gorm:"type:text"`
	Tags          string `json:"tags" gorm:"type:text"`
	Category      string `json:"category" gorm:"index;type:text"`
	ContentRating string `json:"content_rating" gorm:"type:text"`
	IsCompleted   bool   `json:"is_completed"`
	Copyright     string `json:"copyright" gorm:"type:text"`
	ISBN          string `json:"isbn" gorm:"type:text"`

	ReleaseDate string `json:"release_date" gorm:"type:text"`
	UpdateDate  string `json:"update_date" gorm:"type:text"`
	Year        int    `json:"year" gorm:"index"`

	Duration   float64 `json:"duration"`
	FileSize   int64   `json:"file_size"`
	Format     string  `json:"format" gorm:"type:text"`
	Bitrate    int     `json:"bitrate"`
	SampleRate int     `json:"sample_rate"`
	Channels   int     `json:"channels"`

	ChapterCount int    `json:"chapter_count"`
	ChapterList  string `json:"chapter_list" gorm:"type:text"` // JSON array of {index, title, start, end, duration, file}
	IsSingleFile bool   `json:"is_single_file"`

	FilePath   string `json:"file_path" gorm:"type:text;index"`
	FolderPath string `json:"folder_path" gorm:"type:text;index"`

	PlayPosition float64    `json:"play_position"`
	PlayCount    int        `json:"play_count" gorm:"default:0"`
	LastPlayTime *time.Time `json:"last_play_time"`
	IsFavorite   bool       `json:"is_favorite" gorm:"default:false"`

	Rating          float64 `json:"rating"`
	CommunityRating float64 `json:"community_rating"`

	XimalayaID      int    `json:"ximalaya_id" gorm:"index"`
	XimalayaTrackID string `json:"ximalaya_track_id" gorm:"type:text"`

	ScrapeStatus   string     `json:"scrape_status" gorm:"type:text;default:pending;index"`
	ScrapeAttempts int        `json:"scrape_attempts"`
	LastScrapeAt   *time.Time `json:"last_scrape_at"`

	CreatedAt time.Time      `json:"created_at" gorm:"index"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (ab *AudioBook) BeforeCreate(tx *gorm.DB) error {
	if ab.ID == "" {
		ab.ID = uuid.New().String()
	}
	return nil
}
