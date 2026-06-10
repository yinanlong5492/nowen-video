import { streamApi, musicApi, getAudioBookCoverUrl } from '@/api'
import type { MixedItem, WatchHistory, Series, Media } from '@/types'

export function getEntityByType(item: MixedItem): Series | Media | null {
  if (item.type === 'series' && item.series) return item.series
  if (item.type === 'movie' && item.media) return item.media
  if (item.type === 'episode' && item.media) return item.media
  if (item.type === 'music' && item.music) return item.music as unknown as Media
  if (item.type === 'audiobook' && item.audiobook) return item.audiobook as unknown as Media
  if (item.media) return item.media
  return null
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
      const year = new Date(item.music.album_release_date).getFullYear()
      return !isNaN(year) && year > 0 ? year : 0
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
  if (item.media) return item.media.rating
  return 0
}

export function getItemPosterUrl(item: MixedItem): string {
  if (item.type === 'music' && item.music) {
    if (item.music.album_id) return musicApi.getAlbumCoverUrl(item.music.album_id)
    if (item.music.cover_path) return musicApi.getCoverUrlFromPath(item.music.cover_path)
    return ''
  }
  if (item.type === 'series' && item.series) return streamApi.getSeriesPosterUrl(item.series.id)
  if (item.type === 'audiobook' && item.audiobook) {
    if (!item.audiobook.cover_path) return ''
    return getAudioBookCoverUrl(item.audiobook.id)
  }
  if (item.media) return streamApi.getPosterUrl(item.media.id)
  return ''
}

export function getItemLink(item: MixedItem): string {
  if (item.type === 'music') return '/music'
  if (item.type === 'audiobook') return `/library/${item.audiobook?.library_id}`
  if (item.type === 'series') return `/series/${item.series?.id}`
  if (item.media?.series_id) return `/series/${item.media.series_id}`
  if (item.media) return `/media/${item.media.id}`
  return '/'
}

export function getItemDetailTo(item: MixedItem): string {
  if (item.type === 'audiobook' && item.audiobook) return `/library/${item.audiobook.library_id}`
  if (item.type === 'series' && item.series) return `/series/${item.series.id}`
  if (item.media?.series_id) return `/series/${item.media.series_id}`
  if (item.media) return `/media/${item.media.id}`
  return '/'
}

export function getWatchHistoryTitle(item: WatchHistory): string {
  if (item.media.media_type === 'episode' && item.media.series) {
    return `${item.media.series.title} S${String(item.media.season_num || 0).padStart(2, '0')}E${String(item.media.episode_num || 0).padStart(2, '0')}`
  }
  return item.media.title
}

export function getWatchHistoryDetailTo(item: WatchHistory): string {
  return item.media.series_id ? `/series/${item.media.series_id}` : `/media/${item.media_id}`
}

export interface MediaStream {
  codec_type?: string
  codec_name?: string
  codec_long_name?: string
  width?: number
  height?: number
  bit_rate?: number
  duration?: number
  language?: string
}

export function getVideoStreams(streams: MediaStream[]): MediaStream[] {
  return streams?.filter((s) => s.codec_type === 'video') || []
}

export function getAudioStreams(streams: MediaStream[]): MediaStream[] {
  return streams?.filter((s) => s.codec_type === 'audio') || []
}

export function getSubtitleStreams(streams: MediaStream[]): MediaStream[] {
  return streams?.filter((s) => s.codec_type === 'subtitle') || []
}

export function formatCodecName(codecName?: string): string {
  if (!codecName) return ''
  const codecMap: Record<string, string> = {
    'h264': 'H.264',
    'h265': 'H.265',
    'hevc': 'HEVC',
    'vp9': 'VP9',
    'av1': 'AV1',
    'aac': 'AAC',
    'mp3': 'MP3',
    'opus': 'Opus',
    'flac': 'FLAC',
    'ac3': 'AC3',
    'eac3': 'E-AC3',
    'dts': 'DTS',
    'dts-hd': 'DTS-HD',
  }
  return codecMap[codecName.toLowerCase()] || codecName.toUpperCase()
}

export function formatResolution(width?: number, height?: number): string {
  if (!width || !height) return ''
  if (height >= 2160) return '4K'
  if (height >= 1080) return '1080p'
  if (height >= 720) return '720p'
  if (height >= 480) return '480p'
  return `${height}p`
}
