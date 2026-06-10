import { useToast } from '@/components/Toast'
import { userApi, playlistApi } from '@/api'
import type { Series, SeasonInfo } from '@/types'

interface UseSeriesActionsProps {
  series: Series | null
  seasons: SeasonInfo[]
  isFavorited: boolean
  isWatched: boolean
  watchedSeasonNums: Set<number>
  setIsFavorited: React.Dispatch<React.SetStateAction<boolean>>
  setIsWatched: React.Dispatch<React.SetStateAction<boolean>>
  setWatchedSeasonNums: React.Dispatch<React.SetStateAction<Set<number>>>
}

interface UseSeriesActionsReturn {
  handleFavorite: () => Promise<void>
  handleAddToPlaylist: (playlistId: string) => Promise<void>
  handleMarkWatched: () => Promise<void>
  handleMarkSeasonWatched: (seasonNum: number, watched: boolean) => Promise<void>
}

export function useSeriesActions({
  series,
  seasons,
  isFavorited,
  isWatched,
  watchedSeasonNums,
  setIsFavorited,
  setIsWatched,
  setWatchedSeasonNums,
}: UseSeriesActionsProps): UseSeriesActionsReturn {
  const toast = useToast()

  const handleFavorite = async () => {
    if (!series) return
    try {
      if (isFavorited) {
        await userApi.removeFavorite(series.id)
        setIsFavorited(false)
      } else {
        await userApi.addFavorite(series.id)
        setIsFavorited(true)
      }
    } catch {
      toast.error('收藏操作失败')
    }
  }

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!series) return
    try {
      await playlistApi.addItem(playlistId, series.id)
      toast.success('已添加到播放列表')
    } catch {
      toast.error('添加到播放列表失败')
    }
  }

  const handleMarkWatched = async () => {
    if (!series) return
    try {
      let allEpisodes: Array<{ id: string; duration?: number }> = []
      for (const season of seasons) {
        if (season.episodes && season.episodes.length > 0) {
          allEpisodes = allEpisodes.concat(season.episodes)
        }
      }
      if (allEpisodes.length === 0) {
        toast.info('暂无剧集信息')
        return
      }
      if (isWatched) {
        await Promise.all(
          allEpisodes.map(ep => {
            const duration = ep.duration || 3600
            return userApi.updateProgress(ep.id, 0, duration)
          })
        )
        setIsWatched(false)
        setWatchedSeasonNums(new Set())
        toast.success(`已取消标记全部 ${allEpisodes.length} 集`)
      } else {
        await Promise.all(
          allEpisodes.map(ep => {
            const duration = ep.duration || 3600
            return userApi.updateProgress(ep.id, duration, duration)
          })
        )
        setIsWatched(true)
        setWatchedSeasonNums(new Set(seasons.filter(s => s.episodes?.length > 0).map(s => s.season_num)))
        toast.success(`已标记全部 ${allEpisodes.length} 集为已观看`)
      }
    } catch {
      toast.error('操作失败')
    }
  }

  const handleMarkSeasonWatched = async (seasonNum: number, watched: boolean) => {
    const targetSeason = seasons.find(s => s.season_num === seasonNum)
    if (!targetSeason?.episodes?.length) return
    try {
      if (watched) {
        await Promise.all(
          targetSeason.episodes.map(ep => {
            const duration = ep.duration || 3600
            return userApi.updateProgress(ep.id, duration, duration)
          })
        )
        setWatchedSeasonNums(prev => {
          const next = new Set(prev)
          next.add(seasonNum)
          return next
        })
        toast.success(`已标记第 ${seasonNum} 季为已观看`)
      } else {
        await Promise.all(
          targetSeason.episodes.map(ep => {
            const duration = ep.duration || 3600
            return userApi.updateProgress(ep.id, 0, duration)
          })
        )
        setWatchedSeasonNums(prev => {
          const next = new Set(prev)
          next.delete(seasonNum)
          return next
        })
        toast.success(`已取消标记第 ${seasonNum} 季`)
      }
    } catch {
      toast.error('操作失败')
    }
  }

  return {
    handleFavorite,
    handleAddToPlaylist,
    handleMarkWatched,
    handleMarkSeasonWatched,
  }
}
