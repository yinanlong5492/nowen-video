import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n'
import { usePermissions } from './useAuth'
import { MediaDetailSkeleton } from '@/components/common/layout/MediaDetailSkeleton'
import type { HeroSectionVariant, HeroSectionProps } from '@/components/media/HeroSection'
import type { Media, MediaPlayInfo, Playlist, WatchHistory, SubtitleTrack, StreamDetail, Series } from '@/types'

export type SkeletonVariant = 'movie' | 'series' | 'season' | 'episode'

interface UseDetailPageLoaderOptions<T> {
  loading: boolean
  data: T | null | undefined
  variant: SkeletonVariant
  fallback?: ReactNode
  minDisplayTime?: number
}

interface UseDetailPageLoaderResult {
  showSkeleton: boolean
  skeletonElement: ReactNode
}

/**
 * 详情页加载状态管理
 * 
 * 核心优化：
 * 1. 最小展示时间（300ms）：防止骨架屏一闪而过
 * 2. 配合 AnimatePresence 实现原子化切换
 * 
 * 使用方式：在详情页中用 AnimatePresence 包裹骨架屏和实际内容
 */
export function useDetailPageLoader<T>({
  loading,
  data,
  variant,
  fallback,
  minDisplayTime = 300,
}: UseDetailPageLoaderOptions<T>): UseDetailPageLoaderResult {
  const [minTimePassed, setMinTimePassed] = useState(false)
  const [loadStartTime] = useState(() => loading ? Date.now() : 0)

  // 最小展示时间逻辑
  useEffect(() => {
    if (!loading) {
      const elapsed = Date.now() - loadStartTime
      const delay = elapsed < minDisplayTime ? minDisplayTime - elapsed : 0
      const timer = setTimeout(() => setMinTimePassed(true), delay)
      return () => clearTimeout(timer)
    } else {
      setMinTimePassed(false)
    }
  }, [loading, loadStartTime, minDisplayTime])

  // 原子化切换：数据未就绪或最小展示时间未到，显示骨架屏
  const showSkeleton = loading || !data || !minTimePassed
  const skeletonElement = fallback || <MediaDetailSkeleton variant={variant} />

  return { showSkeleton, skeletonElement }
}

export interface DetailPageContext {
  navigate: ReturnType<typeof useNavigate>
  toast: ReturnType<typeof useToast>
  t: ReturnType<typeof useTranslation>['t']
  isAdmin: boolean
}

export function useDetailPageContext(): DetailPageContext {
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const { isAdmin } = usePermissions()

  return {
    navigate,
    toast,
    t,
    isAdmin,
  }
}

export interface UseDetailHeroPropsParams {
  variant: HeroSectionVariant
  
  media?: Media
  playInfo?: MediaPlayInfo | null
  watchProgress?: WatchHistory | null
  subtitleTracks?: SubtitleTrack[]
  audioStreams?: StreamDetail[]
  
  series?: Series | null
  firstEpisode?: { id: string; duration?: number } | null
  
  seasonNum?: number
  episodeCount?: number
  firstEpisodeId?: string
  overview?: string
  
  isFavorited: boolean
  isWatched?: boolean
  scraping?: boolean
  isAdmin: boolean
  posterVersion?: number
  playlists?: Playlist[]
  
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
  
  showMoreMenu?: boolean
  showPlaylistMenu?: boolean
  onToggleMoreMenu?: () => void
  onTogglePlaylistMenu?: () => void
}

export function useDetailHeroProps(params: UseDetailHeroPropsParams): HeroSectionProps {
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

  if (variant === 'media' && media) {
    return {
      ...heroProps,
      variant: 'media' as const,
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
      variant: 'series' as const,
      series,
      firstEpisode,
    }
  }

  if (variant === 'season' && series) {
    return {
      ...heroProps,
      variant: 'season' as const,
      series,
      seasonNum: seasonNum || 0,
      episodeCount: episodeCount || 0,
      firstEpisodeId,
      overview,
    }
  }

  return null as any
}
