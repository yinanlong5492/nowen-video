package service

import (
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
)

// 刮削相关常量
const (
	// 刮削延迟配置
	ScrapeDelayMin = 1500 * time.Millisecond
	ScrapeDelayMax = 3000 * time.Millisecond

	// 有效年份范围
	minYear = 1900
	maxYear = 2100
)

// 预编译正则表达式（全局常量，提升性能）
var (
	// 匹配年份模式：(YYYY) 或 [YYYY] 或 .YYYY
	yearPattern = regexp.MustCompile(`(?:[(\[.])(\d{4})(?:[)\]])?`)

	// 匹配文件扩展名（用于移除扩展名）
	extPattern = regexp.MustCompile(`\.[a-zA-Z0-9]{2,4}$`)

	// 匹配连续空格
	multiSpacePattern = regexp.MustCompile(`\s+`)

	// 匹配括号内的内容（用于提取备选标题）
	altPattern = regexp.MustCompile(`[(\[]([^)\]]+)[)\]]`)

	// 匹配末尾多余的标点（用于清理年份移除后的残留）
	trailingPunctPattern = regexp.MustCompile(`[.\-_]+$`)

	// 常见的技术标签（不应被当作备选标题）
	techTags = map[string]bool{
		"1080p":  true,
		"720p":   true,
		"4k":     true,
		"2160p":  true,
		"h264":   true,
		"h265":   true,
		"x264":   true,
		"x265":   true,
		"hevc":   true,
		"avc":    true,
		"web-dl": true,
		"bluray": true,
		"bdrip":  true,
		"dvdrip": true,
		"hdrip":  true,
		"webrip": true,
		"rarbg":  true,
		"dual":   true,
		"chs":    true,
		"cht":    true,
		"eng":    true,
		"中英":     true,
		"中字":     true,
		"字幕":     true,
		"内封":     true,
		"外挂":     true,
		"无字幕":    true,
	}
)

// isValidYear 检查年份是否在有效范围内
func isValidYear(year int) bool {
	return year >= minYear && year <= maxYear
}

// parseTitle 从文件标题中提取搜索关键词和年份
func (s *MetadataService) parseTitle(title string) (string, int) {
	title = strings.TrimSpace(title)

	// 空标题处理
	if title == "" {
		return "", 0
	}

	// 先匹配年份（支持多种格式：(YYYY), [YYYY], .YYYY）
	var year int
	matches := yearPattern.FindStringSubmatch(title)
	if len(matches) == 2 {
		parsedYear, err := strconv.Atoi(matches[1])
		if err == nil && isValidYear(parsedYear) {
			year = parsedYear
			// 移除年份部分（保留空格处理到后面）
			title = yearPattern.ReplaceAllString(title, "")
		}
	}

	// 移除文件扩展名
	title = strings.TrimSpace(extPattern.ReplaceAllString(title, ""))

	// 清理年份移除后可能残留的多余标点（如 Movie.2014 → Movie. → Movie）
	title = strings.TrimSpace(trailingPunctPattern.ReplaceAllString(title, ""))

	// 清理连续空格（支持任意数量的连续空格）
	title = strings.TrimSpace(multiSpacePattern.ReplaceAllString(title, " "))

	// 边界值处理：纯年份标题
	if _, err := strconv.Atoi(title); err == nil {
		return "", year
	}

	return title, year
}

// parseTitleWithAlt 解析标题，返回主标题、备选标题和年份
func (s *MetadataService) parseTitleWithAlt(title string) (cleanTitle string, alt string, year int) {
	cleanTitle, year = s.parseTitle(title)

	// 如果主标题为空，直接返回
	if cleanTitle == "" {
		return "", "", year
	}

	// 尝试提取括号内的备选标题（如中文标题后的英文）
	// 影视命名惯例：最后一个括号才是别名/副标题，第一个括号通常是分辨率/语言
	matches := altPattern.FindAllStringSubmatch(title, -1)
	if len(matches) > 0 {
		// 从后往前遍历，取最后一个有效备选标题
		for i := len(matches) - 1; i >= 0; i-- {
			candidate := strings.TrimSpace(matches[i][1])
			// 跳过空字符串
			if candidate == "" {
				continue
			}
			// 跳过年份（4位数字且在有效范围内）
			if len(candidate) == 4 {
				if parsedYear, err := strconv.Atoi(candidate); err == nil && isValidYear(parsedYear) {
					continue
				}
			}
			// 跳过技术标签（转为小写检查）
			lowerCandidate := strings.ToLower(candidate)
			if techTags[lowerCandidate] {
				continue
			}
			// 跳过纯数字或特殊字符
			if isNumericOrSpecial(candidate) {
				continue
			}
			// 找到有效的备选标题（取最后一个）
			alt = candidate
			break
		}
	}

	// 清理备选标题的空格
	alt = strings.TrimSpace(multiSpacePattern.ReplaceAllString(alt, " "))

	return cleanTitle, alt, year
}

// isNumericOrSpecial 检查字符串是否主要由数字或特殊字符组成
func isNumericOrSpecial(s string) bool {
	letterCount := 0
	for _, r := range s {
		if unicode.IsLetter(r) {
			letterCount++
		}
	}
	// 使用字符数而非字节数，支持中文
	totalChars := len([]rune(s))
	if totalChars == 0 {
		return true
	}
	// 如果字母（含中文）占比低于50%，认为不是有效标题
	return letterCount*2 < totalChars
}

// mapGenreIDs 将 TMDb 类型ID映射为中文类型名称
func (s *MetadataService) mapGenreIDs(ids []int) string {
	if len(ids) == 0 {
		return ""
	}

	genreMap := map[int]string{
		28:    "动作",
		12:    "冒险",
		16:    "动画",
		35:    "喜剧",
		80:    "犯罪",
		99:    "纪录",
		18:    "剧情",
		10751: "家庭",
		14:    "奇幻",
		36:    "历史",
		27:    "恐怖",
		10402: "音乐",
		9648:  "悬疑",
		10749: "爱情",
		878:   "科幻",
		10770: "电视电影",
		53:    "惊悚",
		10752: "战争",
		37:    "西部",
	}

	var genres []string
	for _, id := range ids {
		if name, ok := genreMap[id]; ok {
			genres = append(genres, name)
		}
	}

	return strings.Join(genres, "/")
}
