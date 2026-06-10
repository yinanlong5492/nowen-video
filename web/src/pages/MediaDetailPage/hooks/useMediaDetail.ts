import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { mediaApi, userApi, streamApi, playlistApi, subtitleApi } from '@/api'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n'
import type { Media, MediaPlayInfo, Playlist, MediaPerson, WatchHistory, TechSpecs, FileDetail, SubtitleTrack } from '@/types'

interface UseMediaDetailReturn {
  id: string | undefined
  media: Media | null
  playInfo: MediaPlayInfo | null
  loading: boolean
  isFavorited: boolean
  isWatched: boolean
  playlists: Playlist[]
  watchProgress: WatchHistory | null
  persons: MediaPerson[]
  techSpecs: TechSpecs | null
  fileInfo: FileDetail | null
  subtitleTracks: SubtitleTrack[]
  posterVersion: number
  setPosterVersion: React.Dispatch<React.SetStateAction<number>>
  setIsFavorited: React.Dispatch<React.SetStateAction<boolean>>
  setIsWatched: React.Dispatch<React.SetStateAction<boolean>>
  setMedia: React.Dispatch<React.SetStateAction<Media | null>>
  refreshMediaDetail: (mediaId: string) => Promise<void>
}

export function useMediaDetail(): UseMediaDetailReturn {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()

  const [media, setMedia] = useState<Media | null>(null)
  const [playInfo, setPlayInfo] = useState<MediaPlayInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFavorited, setIsFavorited] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [watchProgress, setWatchProgress] = useState<WatchHistory | null>(null)
  const [persons, setPersons] = useState<MediaPerson[]>([])
  const [techSpecs, setTechSpecs] = useState<TechSpecs | null>(null)
  const [fileInfo, setFileInfo] = useState<FileDetail | null>(null)
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([])
  const [posterVersion, setPosterVersion] = useState<number>(() => Date.now())

  const toastRef = useRef(toast)
  const tRef = useRef(t)
  const navigateRef = useRef(navigate)

  useEffect(() => {
    toastRef.current = toast
    tRef.current = t
    navigateRef.current = navigate
  }, [toast, t, navigate])

  useEffect(() => {
    if (!id) return
    const abortController = new AbortController()
    setLoading(true)
    setPersons([])
    setWatchProgress(null)

    Promise.all([
      mediaApi.detail(id),
      streamApi.getPlayInfo(id),
      playlistApi.list(),
    ])
      .then(([mediaRes, playInfoRes, playlistRes]) => {
        if (abortController.signal.aborted) return
        const mediaData = mediaRes.data.data
        setMedia(mediaData)
        setPlayInfo(playInfoRes.data.data)
        setPlaylists(playlistRes.data.data || [])

        userApi.checkFavorite(mediaData.id)
          .then((res) => { if (!abortController.signal.aborted) setIsFavorited(res.data.data) })
          .catch(() => {})
        mediaApi.getPersons(mediaData.id)
          .then((res) => { if (!abortController.signal.aborted) setPersons(res.data.data || []) })
          .catch(() => {})
        userApi.getProgress(mediaData.id)
          .then((res) => { 
            if (!abortController.signal.aborted) {
              setWatchProgress(res.data.data)
              const progress = res.data.data
              if (progress && progress.position > 0 && mediaData.duration > 0) {
                setIsWatched(progress.position >= mediaData.duration * 0.9)
              }
            }
          })
          .catch(() => {})

        mediaApi.detailEnhanced(mediaData.id)
          .then((res) => {
            if (abortController.signal.aborted) return
            const data = res.data.data
            setTechSpecs(data.tech_specs)
            setFileInfo(data.file_info)
          })
          .catch(() => {})

        subtitleApi.getTracks(mediaData.id)
          .then((res) => {
            if (!abortController.signal.aborted) {
              setSubtitleTracks(res.data.data?.embedded || [])
            }
          })
          .catch(() => {})
      })
      .catch(() => {
        if (abortController.signal.aborted) return
        toastRef.current.error(tRef.current('mediaDetail.loadFailed'))
        navigateRef.current('/')
      })
      .finally(() => { if (!abortController.signal.aborted) setLoading(false) })

    return () => abortController.abort()
  }, [id])

  const refreshMediaDetail = async (mediaId: string) => {
    try {
      const [detailRes, enhancedRes, personsRes] = await Promise.all([
        mediaApi.detail(mediaId),
        mediaApi.detailEnhanced(mediaId).catch(() => null),
        mediaApi.getPersons(mediaId).catch(() => null),
      ])
      setMedia(detailRes.data.data)
      if (enhancedRes) {
        const data = enhancedRes.data.data
        setTechSpecs(data.tech_specs)
        setFileInfo(data.file_info)
      }
      if (personsRes) setPersons(personsRes.data.data || [])
    } catch {
      // 详情刷新失败不致命
    }
  }

  return {
    id,
    media,
    playInfo,
    loading,
    isFavorited,
    isWatched,
    playlists,
    watchProgress,
    persons,
    techSpecs,
    fileInfo,
    subtitleTracks,
    posterVersion,
    setPosterVersion,
    setIsFavorited,
    setIsWatched,
    setMedia,
    refreshMediaDetail,
  }
}
