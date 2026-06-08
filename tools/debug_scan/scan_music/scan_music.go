package main

import (
	"fmt"
	"os"

	"github.com/glebarez/sqlite"
	"github.com/nowen-video/nowen-video/internal/service"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

func main() {
	dbPath := "data/nowen.db"
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		fmt.Println("DB error:", err)
		os.Exit(1)
	}

	logger, _ := zap.NewDevelopment()
	sugar := logger.Sugar()

	musicSvc, err := service.NewMusicService(db, sugar)
	if err != nil {
		fmt.Println("Create music service error:", err)
		os.Exit(1)
	}

	// 先清理重复的音乐库数据
	fmt.Println("清理旧数据...")
	if err := musicSvc.Migrate(); err != nil {
		fmt.Println("Migrate error:", err)
	}

	// 查找所有 music 类型的库
	type Library struct {
		ID   string
		Name string
		Type string
		Path string
	}
	var libs []Library
	db.Table("libraries").Where("type = ?", "music").Order("created_at DESC").Find(&libs)
	fmt.Printf("找到 %d 个音乐库\n", len(libs))

	if len(libs) == 0 {
		fmt.Println("没有音乐库，需要先创建一个")
		os.Exit(0)
	}

	// 使用第一个 music 库进行扫描
	lib := libs[0]
	fmt.Printf("扫描音乐库: %s (%s) path=%s\n", lib.Name, lib.ID, lib.Path)

	paths := []string{lib.Path}
	fmt.Printf("路径: %v\n", paths)

	count, err := musicSvc.ScanMusicLibrary(lib.ID, paths)
	if err != nil {
		fmt.Printf("扫描失败: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("扫描完成! 新增 %d 首曲目\n", count)

	// 验证
	var trackCount int64
	db.Table("music_tracks").Where("library_id = ?", lib.ID).Count(&trackCount)
	var albumCount int64
	db.Table("music_albums").Where("library_id = ?", lib.ID).Count(&albumCount)
	fmt.Printf("\n结果: music_tracks=%d, music_albums=%d\n", trackCount, albumCount)
}
