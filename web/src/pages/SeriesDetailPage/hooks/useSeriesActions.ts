import { useCallback } from 'react'
import { userApi, playlistApi } from '@/api'
import { useToast } from '@/components/Toast'
import type { Playlist, SeasonInfo } from '@/types'

export function useSeriesActions(
  seriesId: string | undefined,
  seasons: SeasonInfo[],
  isFavorited: boolean,
  isWatched: boolean,
  watchedSeasonNums: Set<number>,
  onFavoritedChange: (value: boolean) => void,
  onWatchedChange: (value: boolean) => void,
  onWatchedSeasonsChange: (value: Set<number>) => void,
) {
  const toast = useToast()

  const handleFavorite = useCallback(async () => {
    if (!seriesId) return
    try {
      if (isFavorited) {
        await userApi.removeFavorite(seriesId)
        onFavoritedChange(false)
      } else {
        await userApi.addFavorite(seriesId)
        onFavoritedChange(true)
      }
    } catch {
      toast.error('收藏操作失败')
    }
  }, [seriesId, isFavorited, onFavoritedChange, toast])

  const handleAddToPlaylist = useCallback(async (playlistId: string) => {
    if (!seriesId) return
    try {
      await playlistApi.addItem(playlistId, seriesId)
      toast.success('已添加到播放列表')
    } catch {
      toast.error('添加到播放列表失败')
    }
  }, [seriesId, toast])

  const handleMarkWatched = useCallback(async () => {
    if (!seriesId) return
    try {
      const allEpisodes = seasons.flatMap(s => s.episodes || [])
      if (allEpisodes.length === 0) {
        toast.info('暂无剧集信息')
        return
      }

      await Promise.all(
        allEpisodes.map(ep => {
          const duration = ep.duration || 3600
          return userApi.updateProgress(ep.id, isWatched ? 0 : duration, duration)
        })
      )

      if (isWatched) {
        onWatchedChange(false)
        onWatchedSeasonsChange(new Set())
        toast.success(`已取消标记全部 ${allEpisodes.length} 集`)
      } else {
        onWatchedChange(true)
        onWatchedSeasonsChange(new Set(seasons.filter(s => s.episodes?.length > 0).map(s => s.season_num)))
        toast.success(`已标记全部 ${allEpisodes.length} 集为已观看`)
      }
    } catch {
      toast.error('操作失败')
    }
  }, [seriesId, seasons, isWatched, onWatchedChange, onWatchedSeasonsChange, toast])

  const handleMarkSeasonWatched = useCallback(async (seasonNum: number, watched: boolean) => {
    const targetSeason = seasons.find(s => s.season_num === seasonNum)
    if (!targetSeason?.episodes?.length) return

    try {
      await Promise.all(
        targetSeason.episodes.map(ep => {
          const duration = ep.duration || 3600
          return userApi.updateProgress(ep.id, watched ? duration : 0, duration)
        })
      )

      onWatchedSeasonsChange(prev => {
        const next = new Set(prev)
        if (watched) {
          next.add(seasonNum)
        } else {
          next.delete(seasonNum)
        }
        return next
      })

      toast.success(watched ? `已标记第 ${seasonNum} 季为已观看` : `已取消标记第 ${seasonNum} 季`)
    } catch {
      toast.error('操作失败')
    }
  }, [seasons, onWatchedSeasonsChange, toast])

  return {
    handleFavorite,
    handleAddToPlaylist,
    handleMarkWatched,
    handleMarkSeasonWatched,
  }
}