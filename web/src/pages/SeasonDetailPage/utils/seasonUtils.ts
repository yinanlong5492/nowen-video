import type { Media } from '@/types'

const SEGMENT_SIZE = 30

/**
 * 计算剧集分段
 * 按集数（episode_num）的数字值分段，每30集一个区间，只显示包含有效集数的分段
 */
export function calculateSegments(episodes: Media[]): { start: number; end: number }[] {
  if (episodes.length === 0) {
    return []
  }

  // 获取所有有效集数（过滤负数、0和非数字）
  const episodeNums = new Set<number>()
  for (const ep of episodes) {
    const num = ep.episode_num
    if (typeof num === 'number' && !isNaN(num) && num > 0) {
      episodeNums.add(num)
    }
  }

  // 如果没有有效集数，返回空数组
  if (episodeNums.size === 0) {
    return []
  }

  // 找出最小和最大集数
  const minEp = Math.min(...episodeNums)
  const maxEp = Math.max(...episodeNums)

  const result: { start: number; end: number }[] = []

  // 计算第一个分段的起始值（对齐到30的倍数）
  let currentStart = Math.floor((minEp - 1) / SEGMENT_SIZE) * SEGMENT_SIZE + 1

  while (currentStart <= maxEp) {
    const currentEnd = currentStart + SEGMENT_SIZE - 1

    // 检查这个区间是否包含有效集数
    let hasValidEpisode = false
    for (let num = currentStart; num <= Math.min(currentEnd, maxEp); num++) {
      if (episodeNums.has(num)) {
        hasValidEpisode = true
        break
      }
    }

    if (hasValidEpisode) {
      result.push({
        start: currentStart,
        end: Math.min(currentEnd, maxEp)
      })
    }

    currentStart = currentEnd + 1
  }

  return result
}

/**
 * 根据分段获取当前显示的剧集
 */
export function getDisplayedEpisodes(
  episodes: Media[],
  segment: { start: number; end: number }
): Media[] {
  return episodes
    .filter(ep => ep.episode_num >= segment.start && ep.episode_num <= segment.end)
    .sort((a, b) => a.episode_num - b.episode_num)
}

/**
 * 根据集数找到所在分段索引
 */
export function findSegmentIndex(
  segments: { start: number; end: number }[],
  episodeNum: number
): number {
  return segments.findIndex(seg => episodeNum >= seg.start && episodeNum <= seg.end)
}

/**
 * 生成已点击集数的 sessionStorage key
 */
export function getClickedKey(seriesId: string | undefined, seasonNum: string | undefined): string {
  return `season_clicked_${seriesId}_${seasonNum || '1'}`
}

/**
 * 从 sessionStorage 读取已点击集数
 */
export function loadClickedEpisodeIds(key: string): Set<string> {
  try {
    const stored = sessionStorage.getItem(key)
    if (stored) return new Set(JSON.parse(stored))
  } catch {}
  return new Set()
}

/**
 * 保存已点击集数到 sessionStorage
 */
export function saveClickedEpisodeIds(key: string, ids: Set<string>): void {
  try {
    sessionStorage.setItem(key, JSON.stringify([...ids]))
  } catch {}
}
