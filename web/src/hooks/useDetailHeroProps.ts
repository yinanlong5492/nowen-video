import type { HeroSectionVariant } from '@/components/media/HeroSection'
import type { Media, MediaPlayInfo, Playlist, WatchHistory, SubtitleTrack, StreamDetail, Series } from '@/types'

export interface UseDetailHeroPropsParams {
  variant: HeroSectionVariant
  
  // Media props
  media?: Media
  playInfo?: MediaPlayInfo | null
  watchProgress?: WatchHistory | null
  subtitleTracks?: SubtitleTrack[]
  audioStreams?: StreamDetail[]
  
  // Series props
  series?: Series
  firstEpisode?: Media | null
  
  // Season props
  seasonNum?: number
  episodeCount?: number
  firstEpisodeId?: string
  overview?: string
  
  // Common props
  isFavorited: boolean
  isWatched?: boolean
  scraping?: boolean
  isAdmin: boolean
  posterVersion?: number
  playlists?: Playlist[]
  
  // Event handlers
  onFavorite: () => void
  onMarkWatched?: () => void
  onAddToPlaylist?: (playlistId: string) => void
  onManualMatch?: () => void
  onUnmatch?: () => void
  onRefreshMetadata?: () => void
  onEditMetadata?: () => void
  onDelete?: () => void
  onShowTrailer?: () => void
  onSelectSubtitle?: (index: number) => void
  onSelectAudio?: (index: number) => void
  
  // External menu state (for season detail)
  showMoreMenu?: boolean
  showPlaylistMenu?: boolean
  onToggleMoreMenu?: () => void
  onTogglePlaylistMenu?: () => void
}

export function useDetailHeroProps(params: UseDetailHeroPropsParams) {
  const {
    variant,
    media,
    playInfo,
    watchProgress,
    subtitleTracks,
    audioStreams,
    series,
    firstEpisode,
    seasonNum,
    episodeCount,
    firstEpisodeId,
    overview,
    isFavorited,
    isWatched,
    scraping,
    isAdmin,
    posterVersion,
    playlists,
    onFavorite,
    onMarkWatched,
    onAddToPlaylist,
    onManualMatch,
    onUnmatch,
    onRefreshMetadata,
    onEditMetadata,
    onDelete,
    onShowTrailer,
    onSelectSubtitle,
    onSelectAudio,
    showMoreMenu,
    showPlaylistMenu,
    onToggleMoreMenu,
    onTogglePlaylistMenu,
  } = params

  const heroProps = {
    variant,
    isFavorited,
    isWatched,
    scraping,
    isAdmin,
    posterVersion,
    playlists,
    onFavorite,
    onMarkWatched,
    onAddToPlaylist,
    onManualMatch,
    onUnmatch,
    onRefreshMetadata,
    onEditMetadata,
    onDelete,
    showMoreMenu,
    showPlaylistMenu,
    onToggleMoreMenu,
    onTogglePlaylistMenu,
  }

  // 根据 variant 添加特定类型的 props
  if (variant === 'media' && media) {
    return {
      ...heroProps,
      media,
      playInfo,
      watchProgress,
      subtitleTracks,
      audioStreams,
      onShowTrailer,
      onSelectSubtitle,
      onSelectAudio,
    }
  }

  if (variant === 'series' && series) {
    return {
      ...heroProps,
      series,
      firstEpisode,
    }
  }

  if (variant === 'season' && series) {
    return {
      ...heroProps,
      series,
      seasonNum: seasonNum || 0,
      episodeCount: episodeCount || 0,
      firstEpisodeId,
      overview,
    }
  }

  return heroProps
}