import type { MixedItem, Media, Series } from '@/types'

export const SORT_OPTIONS = [
  { value: 'created_desc', label: '最近添加' },
  { value: 'created_asc', label: '最早添加' },
  { value: 'title_asc', label: '名称 A-Z' },
  { value: 'title_desc', label: '名称 Z-A' },
  { value: 'year_desc', label: '年份最新' },
  { value: 'year_asc', label: '年份最早' },
  { value: 'rating_desc', label: '评分最高' },
]

export const getItemTitle = (item: MixedItem): string =>
  item.type === 'series' ? (item.series?.title || '') : (item.media?.title || '')

export const getItemOrigTitle = (item: MixedItem): string =>
  item.type === 'series' ? (item.series?.orig_title || '') : (item.media?.orig_title || '')

export const getItemOverview = (item: MixedItem): string =>
  item.type === 'series' ? (item.series?.overview || '') : (item.media?.overview || '')

export const getItemGenres = (item: MixedItem): string =>
  item.type === 'series' ? (item.series?.genres || '') : (item.media?.genres || '')

export const getItemYear = (item: MixedItem): number =>
  item.type === 'series' ? (item.series?.year || 0) : (item.media?.year || 0)

export const getItemRating = (item: MixedItem): number =>
  item.type === 'series' ? (item.series?.rating || 0) : (item.media?.rating || 0)

export const getItemTime = (item: MixedItem): string =>
  item.type === 'series' ? (item.series?.created_at || '') : (item.media?.created_at || '')

export const formatDuration = (seconds: number): string => {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export const extractGenres = (items: MixedItem[]): string[] => {
  const genres = new Set<string>()
  items.forEach((item) => {
    const g = item.type === 'series' ? item.series?.genres : item.media?.genres
    if (g) {
      g.split(',').forEach((genre) => {
        const trimmed = genre.trim()
        if (trimmed) genres.add(trimmed)
      })
    }
  })
  return Array.from(genres).sort()
}

export const filterAndSortItems = (
  items: MixedItem[],
  searchQuery: string,
  filterGenre: string | null,
  sortValue: string
): MixedItem[] => {
  let filtered = [...items]

  // 搜索
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase()
    filtered = filtered.filter((item) =>
      getItemTitle(item).toLowerCase().includes(q) ||
      getItemOrigTitle(item).toLowerCase().includes(q) ||
      getItemOverview(item).toLowerCase().includes(q)
    )
  }

  // 类型筛选
  if (filterGenre) {
    filtered = filtered.filter((item) => getItemGenres(item).includes(filterGenre))
  }

  // 排序
  const [field, dir] = sortValue.split('_')
  filtered.sort((a, b) => {
    let cmp = 0
    if (field === 'title') cmp = getItemTitle(a).localeCompare(getItemTitle(b))
    else if (field === 'year') cmp = getItemYear(a) - getItemYear(b)
    else if (field === 'rating') cmp = getItemRating(a) - getItemRating(b)
    else cmp = new Date(getItemTime(a)).getTime() - new Date(getItemTime(b)).getTime()
    return dir === 'desc' ? -cmp : cmp
  })

  return filtered
}
