import type { MixedItem, WatchHistory } from '@/types'

export function getMediaType(item: MixedItem | WatchHistory): 'movie' | 'series' {
  if ('media' in item) {
    if (item.media?.series_id) {
      return 'series'
    }
  }
  if ('type' in item && item.type === 'series') {
    return 'series'
  }
  return 'movie'
}

export function getMediaTypeById(
  id: string,
  continueList: WatchHistory[],
  libraries: { recentItems: MixedItem[] }[]
): 'movie' | 'series' {
  const continueItem = continueList.find(item => item.media.id === id)
  if (continueItem && continueItem.media.series_id) {
    return 'series'
  }
  for (const lib of libraries) {
    const recentItem = lib.recentItems.find(item => {
      if (item.type === 'series') return item.series?.id === id
      if (item.type === 'media') return item.media?.id === id
      return false
    })
    if (recentItem) {
      return getMediaType(recentItem)
    }
  }
  return 'movie'
}
