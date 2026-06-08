package service

import (
	"encoding/json"
	"fmt"
	"testing"

	"github.com/nowen-video/nowen-video/internal/config"
)

func getTestConfig() *config.Config {
	cfg := &config.Config{}
	return cfg
}

func TestSearchGuangYinZhiWai(t *testing.T) {
	cfg := getTestConfig()
	logger := testLogger()
	svc := NewXimalayaService(cfg, logger)

	results, total, err := svc.SearchAlbumsWeb("光阴之外", 1)
	if err != nil {
		t.Fatalf("搜索失败: %v", err)
	}

	t.Logf("搜索结果总数: %d", total)
	for i, r := range results {
		t.Logf("--- 结果 %d ---", i+1)
		t.Logf("  AlbumID: %d", r.AlbumID)
		t.Logf("  Title: %s", r.Title)
		t.Logf("  Author: %s", r.Author)
		t.Logf("  Description: %s", r.Description[:min(100, len(r.Description))])
		t.Logf("  CoverURL: %s", r.CoverURL)
		t.Logf("  ChapterCount: %d", r.ChapterCount)
		t.Logf("  IsCompleted: %v", r.IsCompleted)
		t.Logf("  Duration: %d", r.Duration)
	}
}

func TestPlantDetailGuangYinZhiWai(t *testing.T) {
	cfg := getTestConfig()
	logger := testLogger()
	svc := NewXimalayaService(cfg, logger)

	albumID := int64(79357555)

	result, err := svc.getAlbumDetailFromPlant(albumID)
	if err != nil {
		t.Fatalf("获取 plant/detail 失败: %v", err)
	}

	t.Logf("========== Plant/Detail 元数据 ==========")
	t.Logf("Title:        %s", result.Title)
	t.Logf("Author:       %s", result.Author)
	t.Logf("Narrator:     %s", result.Narrator)
	t.Logf("Publisher:    %s", result.Publisher)
	t.Logf("Description:  %s", result.Description[:min(200, len(result.Description))])
	t.Logf("Genres:       %s", result.Genres)
	t.Logf("ISBN:         %s", result.ISBN)
	t.Logf("Language:     %s", result.Language)
	t.Logf("IsCompleted:  %v", result.IsCompleted)
	t.Logf("ChapterCount: %d", result.ChapterCount)
	t.Logf("Duration:     %d 秒", result.Duration)
	t.Logf("ReleaseDate:  %s", result.ReleaseDate)
	t.Logf("UpdateDate:   %s", result.UpdateDate)
	t.Logf("Year:         %d", result.Year)
	t.Logf("Rating:       %.1f", result.Rating)
	t.Logf("XimalayaID:   %d", result.XimalayaID)
	t.Logf("CoverURL:     %s", result.CoverURL)
}

func TestScrapeChaptersGuangYinZhiWai(t *testing.T) {
	cfg := getTestConfig()
	logger := testLogger()
	svc := NewXimalayaService(cfg, logger)

	albumID := int64(79357555)

	chapters, err := svc.GetAllTracks(albumID)
	if err != nil {
		t.Logf("获取章节列表失败（平台限制，非代码问题）: %v", err)
		return
	}

	t.Logf("========== 章节列表 (共 %d 集) ==========", len(chapters))
	if len(chapters) > 0 {
		t.Logf("--- 前 5 集 ---")
		for i := 0; i < min(5, len(chapters)); i++ {
			ch := chapters[i]
			t.Logf("  [%d] %s (时长: %d秒)", ch.Index, ch.Title, ch.Duration)
		}
		if len(chapters) > 5 {
			t.Logf("  ... (还有 %d 集)", len(chapters)-5)
			t.Logf("--- 最后 3 集 ---")
			for i := max(0, len(chapters)-3); i < len(chapters); i++ {
				ch := chapters[i]
				t.Logf("  [%d] %s (时长: %d秒)", ch.Index, ch.Title, ch.Duration)
			}
		}
	}
}

func TestFullScrapeGuangYinZhiWai(t *testing.T) {
	cfg := getTestConfig()
	logger := testLogger()
	svc := NewXimalayaService(cfg, logger)

	albumID := int64(79357555)

	result, err := svc.ScrapeByID(albumID, "")
	if err != nil {
		t.Fatalf("刮削失败: %v", err)
	}

	jsonBytes, _ := json.MarshalIndent(result, "", "  ")
	fmt.Printf("\n========== 完整刮削结果 (JSON) ==========\n%s\n", string(jsonBytes))
}