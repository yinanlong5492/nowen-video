package main

import (
	"fmt"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func main() {
	db, _ := gorm.Open(sqlite.Open("data/nowen.db"), &gorm.Config{})

	var softDeleted int64
	db.Table("libraries").Where("deleted_at IS NOT NULL").Count(&softDeleted)
	fmt.Printf("软删除的媒体库: %d 条\n", softDeleted)

	result := db.Exec("DELETE FROM libraries WHERE deleted_at IS NOT NULL")
	fmt.Printf("已物理删除: %d 条\n", result.RowsAffected)

	var remaining int64
	db.Table("libraries").Count(&remaining)
	fmt.Printf("剩余媒体库: %d 个\n\n", remaining)

	rows, _ := db.Table("libraries").Select("name, type, path").Rows()
	defer rows.Close()
	for rows.Next() {
		var name, typ, path string
		rows.Scan(&name, &typ, &path)
		fmt.Printf("  %s (%s) path=%s\n", name, typ, path)
	}

	// Also check music data
	var tracks, albums int64
	db.Table("music_tracks").Count(&tracks)
	db.Table("music_albums").Count(&albums)
	fmt.Printf("\n音乐数据: tracks=%d, albums=%d\n", tracks, albums)
}
