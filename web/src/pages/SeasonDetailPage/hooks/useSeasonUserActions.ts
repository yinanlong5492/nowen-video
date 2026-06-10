import { useState } from 'react'
import { userApi, playlistApi } from '@/api'
import { useToast } from '@/components/Toast'
import type { Series, Media } from '@/types'

interface UseSeasonUserActionsProps {
  seriesId: string | undefined
  seasonNum: string | undefined
  series: Series | null
  episodes: Media[]
  isFavorited: boolean
  isWatched: boolean
  setIsFavorited: React.Dispatch<React.SetStateAction<boolean>>
  setIsWatched: React.Dispatch<React.SetStateAction<boolean>>
}

interface UseSeasonUserActionsReturn {
  showMoreMenu: boolean
  showPlaylistMenu: boolean
  setShowMoreMenu: React.Dispatch<React.SetStateAction<boolean>>
  setShowPlaylistMenu: React.Dispatch<React.SetStateAction<boolean>>
  handleFavorite: () => Promise<void>
  handleAddToPlaylist: (playlistId: string) => Promise<void>
  handleMarkWatched: () => Promise<void>
}

export function useSeasonUserActions({
  seriesId,
  seasonNum,
  series,
  episodes,
  isFavorited,
  isWatched,
  setIsFavorited,
  setIsWatched,
}: UseSeasonUserActionsProps): UseSeasonUserActionsReturn {
  const toast = useToast()

  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false)

  const handleFavorite = async () => {
    if (!seriesId) return
    try {
      if (isFavorited) {
        await userApi.removeFavorite(seriesId)
        setIsFavorited(false)
      } else {
        await userApi.addFavorite(seriesId)
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
      if (episodes.length === 0) {
        toast.info('暂无剧集信息')
        return
      }
      if (isWatched) {
        await Promise.all(
          episodes.map(ep => {
            const duration = ep.duration || 3600
            return userApi.updateProgress(ep.id, 0, duration)
          })
        )
        setIsWatched(false)
        toast.success(`已取消标记全部 ${episodes.length} 集`)
      } else {
        await Promise.all(
          episodes.map(ep => {
            const duration = ep.duration || 3600
            return userApi.updateProgress(ep.id, duration, duration)
          })
        )
        setIsWatched(true)
        toast.success(`已标记全部 ${episodes.length} 集为已观看`)
      }
    } catch {
      toast.error('操作失败')
    }
  }

  return {
    showMoreMenu,
    showPlaylistMenu,
    setShowMoreMenu,
    setShowPlaylistMenu,
    handleFavorite,
    handleAddToPlaylist,
    handleMarkWatched,
  }
}