import { useState, useEffect, useCallback } from 'react'
import { seriesApi, userApi, playlistApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import type { Series, SeasonInfo, MediaPerson, Playlist } from '@/types'

export function useSeriesDetail(id: string | undefined) {
  const user = useAuthStore((s) => s.user)
  const [series, setSeries] = useState<Series | null>(null)
  const [seasons, setSeasons] = useState<SeasonInfo[]>([])
  const [persons, setPersons] = useState<MediaPerson[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isFavorited, setIsFavorited] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [watchedSeasonNums, setWatchedSeasonNums] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [posterVersion, setPosterVersion] = useState(Date.now())

  const loadData = useCallback(async () => {
    if (!id) return
    const abortController = new AbortController()
    setLoading(true)
    
    try {
      const [seriesRes, seasonsRes] = await Promise.all([
        seriesApi.detail(id),
        seriesApi.seasons(id),
      ])
      
      if (abortController.signal.aborted) return
      setSeries(seriesRes.data.data)
      const seasonData = seasonsRes.data.data || []
      setSeasons(seasonData)

      if (user) {
        const watchedNums = new Set<number>()
        await Promise.all(
          seasonData
            .filter(s => s.episodes?.length > 0)
            .map(async (s) => {
              try {
                const firstEp = s.episodes![0]
                const res = await userApi.getProgress(firstEp.id)
                const progress = res.data.data
                const duration = firstEp.duration || 3600
                if (progress && progress.position >= duration * 0.9) {
                  watchedNums.add(s.season_num)
                }
              } catch { }
            })
        )
        setWatchedSeasonNums(watchedNums)
        const allHaveEpisodes = seasonData.every(s => s.episodes?.length > 0)
        setIsWatched(allHaveEpisodes && watchedNums.size === seasonData.length)
      }

      Promise.all([
        seriesApi.getPersons(id).then(res => { if (!abortController.signal.aborted) setPersons(res.data.data || []) }).catch(() => {}),
        user?.id ? userApi.checkFavorite(id).then(res => { if (!abortController.signal.aborted) setIsFavorited(res.data.data) }).catch(() => {}) : Promise.resolve(),
        playlistApi.list().then(res => { if (!abortController.signal.aborted) setPlaylists(res.data.data || []) }).catch(() => {}),
      ])
    } catch {
      // 静默处理错误，避免未捕获的 Promise rejection
    } finally {
      setLoading(false)
    }

    return () => abortController.abort()
  }, [id, user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refreshPoster = useCallback(() => {
    setPosterVersion(Date.now())
  }, [])

  const refreshData = useCallback(() => {
    loadData()
  }, [loadData])

  return {
    series,
    seasons,
    persons,
    playlists,
    isFavorited,
    isWatched,
    watchedSeasonNums,
    loading,
    posterVersion,
    refreshPoster,
    refreshData,
  }
}