package service

import (
	"regexp"
	"strings"
)

type LrcMetadata struct {
	Lyricist string
	Composer string
	Arranger string
	Producer string
}

var lrcMetaRegexps = []struct {
	re  *regexp.Regexp
	set func(meta *LrcMetadata, val string)
}{
	{regexp.MustCompile(`作词\s*[:：]\s*(.+?)(?:\n|$)`), func(m *LrcMetadata, v string) {
		if m.Lyricist == "" {
			m.Lyricist = v
		}
	}},
	{regexp.MustCompile(`词\s*[:：]\s*(.+?)(?:\n|$)`), func(m *LrcMetadata, v string) {
		if m.Lyricist == "" {
			m.Lyricist = v
		}
	}},
	{regexp.MustCompile(`作曲\s*[:：]\s*(.+?)(?:\n|$)`), func(m *LrcMetadata, v string) {
		if m.Composer == "" {
			m.Composer = v
		}
	}},
	{regexp.MustCompile(`曲\s*[:：]\s*(.+?)(?:\n|$)`), func(m *LrcMetadata, v string) {
		if m.Composer == "" {
			m.Composer = v
		}
	}},
	{regexp.MustCompile(`编曲\s*[:：]\s*(.+?)(?:\n|$)`), func(m *LrcMetadata, v string) {
		if m.Arranger == "" {
			m.Arranger = v
		}
	}},
	{regexp.MustCompile(`制作人\s*[:：]\s*(.+?)(?:\n|$)`), func(m *LrcMetadata, v string) {
		if m.Producer == "" {
			m.Producer = v
		}
	}},
}

func ParseLrcMetadata(lrcText string) LrcMetadata {
	var meta LrcMetadata

	for _, p := range lrcMetaRegexps {
		matches := p.re.FindStringSubmatch(lrcText)
		if len(matches) >= 2 {
			val := strings.TrimSpace(matches[1])
			val = strings.TrimRight(val, "[]（）()")
			val = strings.TrimSpace(val)
			if val != "" {
				p.set(&meta, val)
			}
		}
	}

	return meta
}
