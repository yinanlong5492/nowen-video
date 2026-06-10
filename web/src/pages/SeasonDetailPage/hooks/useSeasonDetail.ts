import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { seriesApi, userApi, playlistApi } from '@/api'
import { useToast } from '@/components/Toast'
import type { Series, Media, WatchHistory, MediaPerson, Playlist } from '@/types'

interface UseSeasonDetailReturn {
  seriesId: string | undefined
  seasonNum: string | undefined
  currentSeasonNum: number
  series: Series | null
  seasons: { season_num: number; episode_count: number }[]
  episodes: Media[]
  loading: boolean
  historyMap: Record<string, WatchHistory>
  persons: MediaPerson[]
  playlists: Playlist[]
  isFavorited: boolean
  isWatched: boolean
  posterVersion: number
  setPosterVersion: React.Dispatch<React.SetStateAction<number>>
  setSeries: React.Dispatch<React.SetStateAction<Series | null>>
  setSeasons: React.Dispatch<React.SetStateAction<{ season_num: number; episode_count: number }[]>>
  refreshSeriesDetail: () => Promise<void>
  handleSeasonChange: (seasonNum: number) => Promise<void>
}

export function useSeasonDetail(): UseSeasonDetailReturn {
  const { seriesId, seasonNum } = useParams<{ seriesId: string; seasonNum: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [series, setSeries] = useState<Series | null>(null)
  const [seasons, setSeasons] = useState<{ season_num: number; episode_count: number }[]>([])
  const [episodes, setEpisodes] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [historyMap, setHistoryMap] = useState<Record<string, WatchHistory>>({})
  const [persons, setPersons] = useState<MediaPerson[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isFavorited, setIsFavorited] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [posterVersion, setPosterVersion] = useState<number>(() => Date.now())
  const [currentSeasonNum, setCurrentSeasonNum] = useState<number>(() => parseInt(seasonNum || '1') || 1)

  const toastRef = useRef(toast)
  const navigateRef = useRef(navigate)

  useEffect(() => {
    toastRef.current = toast
    navigateRef.current = navigate
  }, [toast, navigate])

  useEffect(() => {
    if (seasonNum) {
      setCurrentSeasonNum(parseInt(seasonNum) || 1)
    }
  }, [seasonNum])

  const handleSeasonChange = async (newSeasonNum: number) => {
    if (!seriesId || newSeasonNum === currentSeasonNum) return
    
    setCurrentSeasonNum(newSeasonNum)
    navigate(`/series/${seriesId}/season/${newSeasonNum}`, { replace: true })
    
    try {
      const res = await seriesApi.seasonEpisodes(seriesId, newSeasonNum)
      setEpisodes(res.data.data || [])
      setPosterVersion(Date.now())
    } catch (error) {
      console.error('加载季剧集失败:', error)
      toastRef.current.error('加载季剧集失败')
    }
  }

  const refreshSeriesDetail = async () => {
    if (!seriesId) return
    try {
      const [seriesRes, seasonsRes] = await Promise.all([
        seriesApi.detail(seriesId),
        seriesApi.seasons(seriesId),
      ])
      setSeries(seriesRes.data.data)
      setSeasons(seasonsRes.data.data || [])
      setPosterVersion(Date.now())
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!seriesId) return

    const abortController = new AbortController()
    setLoading(true)

    Promise.all([
      seriesApi.detail(seriesId),
      seriesApi.seasons(seriesId),
      seriesApi.seasonEpisodes(seriesId, parseInt(seasonNum || '1') || 1),
    ])
      .then(([seriesRes, seasonsRes, seasonRes]) => {
        if (abortController.signal.aborted) return

        const seriesData = seriesRes.data?.data
        if (!seriesData) {
          toastRef.current.error('剧集数据为空')
          navigateRef.current('/')
          setLoading(false)
          return
        }

        setSeries(seriesData)
        setSeasons(seasonsRes.data.data || [])
        setEpisodes(seasonRes.data.data || [])
        setPosterVersion(Date.now())
        setLoading(false)

        // 获取观看进度状态（需要等待 seriesData 加载完成）
        if (seriesData.episodes?.[0]) {
          userApi.getProgress(seriesData.episodes[0].id)
            .then((res) => {
              if (!abortController.signal.aborted) {
                const progress = res.data.data
                const duration = seriesData.episodes![0].duration || 3600
                if (progress && progress.position >= duration * 0.9) {
                  setIsWatched(true)
                }
              }
            })
            .catch(() => {})
        }
      })
      .catch((error) => {
        if (abortController.signal.aborted) return
        console.error('加载季详情失败:', error)
        toastRef.current.error('加载季详情失败')
        navigateRef.current('/')
        setLoading(false)
      })

    // 非首屏：播放历史 + 演职人员（不阻塞页面渲染）
    const fetchHistory = async () => {
      try {
        const res = await userApi.history(1, 200)
        if (abortController.signal.aborted) return

        const map: Record<string, WatchHistory> = {}
        for (const h of (res.data.data || [])) {
          map[h.media_id] = h
        }
        setHistoryMap(map)
      } catch (error) {
        console.warn('加载播放历史失败:', error)
      }
    }

    const fetchPersons = async () => {
      try {
        const res = await seriesApi.getPersons(seriesId)
        if (abortController.signal.aborted) return

        setPersons(res.data.data || [])
      } catch (error) {
        console.warn('加载演职人员失败:', error)
      }
    }

    // 获取收藏状态
    const fetchFavoriteStatus = async () => {
      try {
        const res = await userApi.checkFavorite(seriesId)
        if (!abortController.signal.aborted) {
          setIsFavorited(res.data.data)
        }
      } catch {
        setIsFavorited(false)
      }
    }

    // 并行执行非首屏请求
    fetchHistory()
    fetchPersons()
    fetchFavoriteStatus()

    // 获取播放列表
    playlistApi.list()
      .then((res) => { if (!abortController.signal.aborted) setPlaylists(res.data.data || []) })
      .catch(() => {})

    return () => abortController.abort()
  }, [seriesId, seasonNum])

  return {
    seriesId,
    seasonNum,
    currentSeasonNum,
    series,
    seasons,
    episodes,
    loading,
    historyMap,
    persons,
    playlists,
    isFavorited,
    isWatched,
    posterVersion,
    setPosterVersion,
    setSeries,
    setSeasons,
    refreshSeriesDetail,
    handleSeasonChange,
  }
}
