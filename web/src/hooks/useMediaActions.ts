import { useState, useCallback, useEffect } from 'react'
import { userApi, seriesApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/components/Toast'

export function useMediaActions(initialFavorites: string[] = [], initialWatched: string[] = []) {
  const user = useAuthStore(s => s.user)
  const toast = useToast()
  const [favoritedMap, setFavoritedMap] = useState<Record<string, boolean>>(
    Object.fromEntries(initialFavorites.map(id => [id, true]))
  )
  const [watchedMap, setWatchedMap] = useState<Record<string, boolean>>(
    Object.fromEntries(initialWatched.map(id => [id, true]))
  )

  const toggleFavorite = useCallback(async (mediaId: string) => {
    if (!user) { toast.info('请先登录'); return false }
    const isFav = favoritedMap[mediaId] || false
    try {
      if (isFav) await userApi.removeFavorite(mediaId)
      else await userApi.addFavorite(mediaId)
      setFavoritedMap(prev => ({ ...prev, [mediaId]: !isFav }))
      toast.success(isFav ? '已取消收藏' : '已加入收藏')
      return true
    } catch {
      toast.error('操作失败')
      return false
    }
  }, [user, favoritedMap, toast])

  const markWatched = useCallback(async (mediaId: string, duration: number, isSeries: boolean, seriesId?: string) => {
    if (!user) { toast.info('请先登录'); return false }
    const isWatched = watchedMap[mediaId] || false
    try {
      if (isSeries && seriesId) {
        const seasonsRes = await seriesApi.seasons(seriesId)
        const allEpisodes = (seasonsRes.data.data || []).flatMap(s => s.episodes || [])
        if (!allEpisodes.length) { toast.info('暂无剧集信息'); return false }
        await Promise.all(allEpisodes.map(ep => userApi.updateProgress(ep.id, isWatched ? 0 : (ep.duration || 3600), ep.duration || 3600)))
        toast.success(isWatched ? `已取消标记全部 ${allEpisodes.length} 集` : `已标记全部 ${allEpisodes.length} 集`)
      } else {
        await userApi.updateProgress(mediaId, isWatched ? 0 : duration, duration)
        toast.success(isWatched ? '已取消标记' : '已标记为已观看')
      }
      setWatchedMap(prev => ({ ...prev, [mediaId]: !isWatched }))
      return true
    } catch {
      toast.error('操作失败')
      return false
    }
  }, [user, watchedMap, toast])

  return { favoritedMap, watchedMap, toggleFavorite, markWatched }
}
