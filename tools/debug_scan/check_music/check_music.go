package main

import (
	"fmt"
	"os"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func main() {
	dbPath := "data/nowen.db"
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		fmt.Println("数据库文件不存在:", dbPath)
		return
	}

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		fmt.Println("DB error:", err)
		return
	}

	// 检查表是否存在
	for _, table := range []string{"music_tracks", "music_albums", "music_playlists", "music_playlist_items"} {
		var count int64
		err := db.Table(table).Count(&count).Error
		if err != nil {
			fmt.Printf("表 %s: 不存在或错误 (%v)\n", table, err)
		} else {
			fmt.Printf("表 %s: %d 条记录\n", table, count)
		}
	}

	// 媒体库列表
	type Library struct {
		ID       string
		Name     string
		Type     string
		Path     string
		LastScan *string `gorm:"column:last_scan"`
	}
	var libs []Library
	db.Table("libraries").Find(&libs)
	fmt.Printf("\n全部媒体库 (%d 个):\n", len(libs))
	for _, l := range libs {
		ls := "未扫描"
		if l.LastScan != nil && *l.LastScan != "" {
			ls = *l.LastScan
		}
		fmt.Printf("  [%s] %s (%s) path=%s 上次扫描=%s\n", l.ID, l.Name, l.Type, l.Path, ls)
	}
}
