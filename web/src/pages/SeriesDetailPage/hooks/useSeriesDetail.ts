import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { seriesApi, userApi, playlistApi } from '@/api'
import { useToast } from '@/components/Toast'
import type { Series, SeasonInfo, MediaPerson, Playlist } from '@/types'

interface UseSeriesDetailReturn {
  id: string | undefined
  series: Series | null
  seasons: SeasonInfo[]
  loading: boolean
  isFavorited: boolean
  isWatched: boolean
  watchedSeasonNums: Set<number>
  persons: MediaPerson[]
  playlists: Playlist[]
  posterVersion: number
  setPosterVersion: React.Dispatch<React.SetStateAction<number>>
  setSeries: React.Dispatch<React.SetStateAction<Series | null>>
  setSeasons: React.Dispatch<React.SetStateAction<SeasonInfo[]>>
  setIsFavorited: React.Dispatch<React.SetStateAction<boolean>>
  setIsWatched: React.Dispatch<React.SetStateAction<boolean>>
  setWatchedSeasonNums: React.Dispatch<React.SetStateAction<Set<number>>>
  firstEpisode: { id: string; duration?: number } | null
}

export function useSeriesDetail(): UseSeriesDetailReturn {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [series, setSeries] = useState<Series | null>(null)
  const [seasons, setSeasons] = useState<SeasonInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [isFavorited, setIsFavorited] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [watchedSeasonNums, setWatchedSeasonNums] = useState<Set<number>>(new Set())
  const [persons, setPersons] = useState<MediaPerson[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [posterVersion, setPosterVersion] = useState<number>(() => Date.now())

  const toastRef = useRef(toast)
  const navigateRef = useRef(navigate)

  useEffect(() => {
    toastRef.current = toast
    navigateRef.current = navigate
  }, [toast, navigate])

  useEffect(() => {
    if (!id) return
    const abortController = new AbortController()
    setLoading(true)
    setPersons([])
    setIsFavorited(false)

    Promise.all([
      seriesApi.detail(id),
      seriesApi.seasons(id),
    ])
      .then(([seriesRes, seasonsRes]) => {
        if (abortController.signal.aborted) return
        setSeries(seriesRes.data.data)
        const seasonData = seasonsRes.data.data || []
        setSeasons(seasonData)
        setLoading(false)

        // 批量获取各季观看状态
        if (userApi) {
          const watchedNums = new Set<number>()
          const progressPromises = seasonData
            .filter(s => s.episodes?.length > 0)
            .map(s => {
              const firstEp = s.episodes![0]
              return userApi.getProgress(firstEp.id)
                .then(res => {
                  if (abortController.signal.aborted) return
                  const progress = res.data.data
                  const duration = firstEp.duration || 3600
                  if (progress && progress.position >= duration * 0.9) {
                    watchedNums.add(s.season_num)
                  }
                })
                .catch(() => {})
            })
          Promise.all(progressPromises).then(() => {
            if (!abortController.signal.aborted) {
              setWatchedSeasonNums(watchedNums)
              const allHaveEpisodes = seasonData.every(s => s.episodes?.length > 0)
              setIsWatched(allHaveEpisodes && watchedNums.size === seasonData.length)
            }
          })
        }
      })
      .catch(() => {
        if (abortController.signal.aborted) return
        toastRef.current.error('加载剧集详情失败')
        navigateRef.current('/')
        setLoading(false)
      })

    // 非首屏：演职人员 + 收藏状态
    seriesApi.getPersons(id)
      .then((res) => { if (!abortController.signal.aborted) setPersons(res.data.data || []) })
      .catch(() => {})

    userApi.checkFavorite(id)
      .then((res) => { if (!abortController.signal.aborted) setIsFavorited(res.data.data) })
      .catch(() => {})

    // 获取播放列表
    playlistApi.list()
      .then((res) => { if (!abortController.signal.aborted) setPlaylists(res.data.data || []) })
      .catch(() => {})

    return () => abortController.abort()
  }, [id])

  // 获取第一集用于播放
  const firstEpisode = seasons.length > 0 && seasons[0].episodes?.length > 0
    ? seasons[0].episodes![0]
    : null

  return {
    id,
    series,
    seasons,
    loading,
    isFavorited,
    isWatched,
    watchedSeasonNums,
    persons,
    playlists,
    posterVersion,
    setPosterVersion,
    setSeries,
    setSeasons,
    setIsFavorited,
    setIsWatched,
    setWatchedSeasonNums,
    firstEpisode,
  }
}
