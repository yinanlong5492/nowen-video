import type { Library, MixedItem } from '@/types'
import { libraryApi, musicApi, audiobookApi, mediaApi, getAudioBookCoverUrl } from '@/api'
import { streamApi } from '@/api'

export interface LibraryWithCovers extends Library {
  coverUrls: string[]
  recentItems: MixedItem[]
}

export async function getRandomCovers(lib: Library): Promise<{
  coverUrls: string[]
  recentItems: MixedItem[]
}> {
  const coverUrls: string[] = []
  const recentItems: MixedItem[] = []

  try {
    let medias: MixedItem[] = []

    if (lib.type === 'music') {
      const musicResult = await musicApi.listTracks({ library_id: lib.id, size: 12 })
      medias = (musicResult.data.data || []).map((track) => ({
        type: 'music' as const,
        music: track,
      }))
    } else if (lib.type === 'audiobook') {
      const audiobookResult = await audiobookApi.list({ library_id: lib.id, size: 12 })
      medias = (audiobookResult.data.data || []).map((book) => ({
        type: 'audiobook' as const,
        audiobook: book,
      }))
    } else {
      const mediaResult = await mediaApi.listMixed({ library_id: lib.id, size: 12 })
      medias = mediaResult.data.data || []
    }

    recentItems.push(...medias)

    const posterUrls = medias
      .filter((m) => {
        if (m.type === 'movie' && m.media) {
          return m.media.poster_path || m.media.backdrop_path
        }
        if (m.type === 'series' && m.series) {
          return m.series.poster_path || m.series.backdrop_path
        }
        if (m.type === 'music' && m.music) {
          return m.music.cover_path !== ''
        }
        if (m.type === 'audiobook' && m.audiobook) {
          return m.audiobook.cover_path !== ''
        }
        return false
      })
      .map((m) => {
        if (m.type === 'series' && m.series) {
          return streamApi.getSeriesBackdropUrl(m.series.id)
        }
        if (m.type === 'movie' && m.media) {
          return streamApi.getBackdropUrl(m.media.id)
        }
        if (m.type === 'music' && m.music) {
          if (m.music.album_id) {
            return musicApi.getAlbumCoverUrl(m.music.album_id)
          } else if (m.music.cover_path) {
            return musicApi.getCoverUrlFromPath(m.music.cover_path)
          }
        }
        if (m.type === 'audiobook' && m.audiobook) {
          return getAudioBookCoverUrl(m.audiobook.id)
        }
        return ''
      })
      .filter(Boolean)

    for (let i = posterUrls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[posterUrls[i], posterUrls[j]] = [posterUrls[j], posterUrls[i]]
    }
    coverUrls.push(...posterUrls.slice(0, 3))
  } catch {
    // 忽略错误
  }

  return { coverUrls, recentItems }
}

export function getItemId(item: MixedItem): string {
  if (item.type === 'music' && item.music) return item.music.id
  if (item.type === 'series' && item.series) return item.series.id
  if (item.type === 'audiobook' && item.audiobook) return item.audiobook.id
  if (item.media) return item.media.id
  return ''
}

export function getItemTitle(item: MixedItem): string {
  if (item.type === 'music' && item.music) return item.music.title
  if (item.type === 'series' && item.series) return item.series.title
  if (item.type === 'audiobook' && item.audiobook) return item.audiobook.title
  if (item.media) return item.media.title
  return ''
}

export function getItemYear(item: MixedItem): number {
  if (item.type === 'music' && item.music) {
    if (item.music.year > 0) return item.music.year
    if (item.music.album_release_date) {
      const date = new Date(item.music.album_release_date)
      const year = date.getFullYear()
      if (!isNaN(year) && year > 0) return year
    }
    return 0
  }
  if (item.type === 'series' && item.series) return item.series.year
  if (item.type === 'audiobook' && item.audiobook) return item.audiobook.year
  if (item.media) return item.media.year
  return 0
}

export function getItemRating(item: MixedItem): number {
  if (item.type === 'series' && item.series) return item.series.rating
  if (item.type === 'audiobook' && item.audiobook) return 0
  if (item.media) return item.media.rating
  return 0
}

export function getItemPosterUrl(item: MixedItem): string {
  if (item.type === 'music' && item.music) {
    if (item.music.album_id) {
      return musicApi.getAlbumCoverUrl(item.music.album_id)
    } else if (item.music.cover_path) {
      return musicApi.getCoverUrlFromPath(item.music.cover_path)
    }
    return ''
  }
  if (item.type === 'series' && item.series) {
    return streamApi.getSeriesPosterUrl(item.series.id)
  }
  if (item.type === 'audiobook' && item.audiobook) {
    if (!item.audiobook.cover_path) return ''
    return getAudioBookCoverUrl(item.audiobook.id)
  }
  if (item.media) {
    return streamApi.getPosterUrl(item.media.id)
  }
  return ''
}

export function getItemLink(item: MixedItem): string {
  if (item.type === 'music') return '/music'
  if (item.type === 'audiobook' && item.audiobook) return `/library/${item.audiobook.library_id}`
  if (item.type === 'series' && item.series) return `/series/${item.series.id}`
  if (item.media && item.media.series_id) return `/series/${item.media.series_id}`
  if (item.media) return `/media/${item.media.id}`
  return '/'
}

export function getItemDetailTo(item: MixedItem): string {
  if (item.type === 'audiobook' && item.audiobook) return `/library/${item.audiobook.library_id}`
  if (item.type === 'series' && item.series) return `/series/${item.series.id}`
  if (item.media && item.media.series_id) return `/series/${item.media.series_id}`
  if (item.media) return `/media/${item.media.id}`
  return '/'
}
