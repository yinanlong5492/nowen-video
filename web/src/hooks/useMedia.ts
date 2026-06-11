import { useCallback, useState, useEffect, useMemo } from 'react'
import { mediaApi, userApi, playlistApi, adminApi } from '@/api'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n'
import { formatErrMsg } from '@/utils/error'
import { getVideoStreams, getAudioStreams } from '@/utils/mediaHelpers'
import type { Media, Series, Episode, Stream, VideoStream, AudioStream } from '@/types'

interface MediaActions<T = string> {
  onManualMatch?: (id: T) => void
  onUnmatch?: (id: T) => void
  onRefreshMetadata?: (id: T) => void
  onEditMetadata?: (id: T) => void
  onDelete?: (id: T) => void
}

interface UseMediaActionsOptions<T = string> extends MediaActions<T> {
  isAdmin: boolean
}

interface UseMediaActionsResult<T = string> extends MediaActions<T> {}

export function useMediaActions<T = string>({
  isAdmin,
  onManualMatch,
  onUnmatch,
  onRefreshMetadata,
  onEditMetadata,
  onDelete,
}: UseMediaActionsOptions<T>): UseMediaActionsResult<T> {
  const wrapAction = <Action extends (...args: [T]) => void>(
    action?: Action
  ): Action | undefined => {
    if (!isAdmin || !action) return undefined
    return action
  }

  return {
    onManualMatch: wrapAction(onManualMatch),
    onUnmatch: wrapAction(onUnmatch),
    onRefreshMetadata: wrapAction(onRefreshMetadata),
    onEditMetadata: wrapAction(onEditMetadata),
    onDelete: wrapAction(onDelete),
  }
}

interface UseMediaUserActionsProps {
  id: string | undefined
  media: Media | Series | null
  isFavorited: boolean
  isWatched: boolean
  setIsFavorited: React.Dispatch<React.SetStateAction<boolean>>
  setIsWatched: React.Dispatch<React.SetStateAction<boolean>>
  setMedia?: React.Dispatch<React.SetStateAction<Media | null>>
  setPosterVersion?: React.Dispatch<React.SetStateAction<number>>
  refreshMediaDetail?: (id: string) => Promise<void>
}

interface UseMediaUserActionsReturn {
  scraping: boolean
  handleFavorite: () => Promise<void>
  handleMarkWatched: () => Promise<void>
  handleScrape: () => Promise<void>
  handleAddToPlaylist: (playlistId: string) => Promise<void>
  handleUnmatch: () => Promise<void>
  handleRefreshSuccess: () => Promise<void>
  handleEditSave: (editForm: {
    title: string
    orig_title: string
    year: number
    overview: string
    rating: number
    genres: string
    country: string
    language: string
    tagline: string
    studio: string
  }) => Promise<void>
  handleDelete: (deleteFiles: boolean, onSuccess?: () => void) => Promise<void>
}

export function useMediaUserActions({
  id,
  media,
  isFavorited,
  isWatched,
  setIsFavorited,
  setIsWatched,
  setMedia,
  setPosterVersion,
  refreshMediaDetail,
}: UseMediaUserActionsProps): UseMediaUserActionsReturn {
  const toast = useToast()
  const { t } = useTranslation()
  const [scraping, setScraping] = useState(false)

  const handleFavorite = useCallback(async () => {
    if (!id) return
    try {
      if (isFavorited) {
        await userApi.removeFavorite(id)
        setIsFavorited(false)
      } else {
        await userApi.addFavorite(id)
        setIsFavorited(true)
      }
    } catch {
      toast.error(t('mediaDetail.favoriteFailed'))
    }
  }, [id, isFavorited, setIsFavorited, toast, t])

  const handleMarkWatched = useCallback(async () => {
    if (!id || !media) return
    try {
      const duration = media.duration || 3600
      if (isWatched) {
        await userApi.updateProgress(id, 0, duration)
        setIsWatched(false)
        toast.success('已取消标记')
      } else {
        await userApi.updateProgress(id, duration, duration)
        setIsWatched(true)
        toast.success('已标记为已观看')
      }
    } catch {
      toast.error('操作失败')
    }
  }, [id, media, isWatched, setIsWatched, toast])

  const handleScrape = useCallback(async () => {
    if (!id) return
    setScraping(true)
    try {
      await mediaApi.scrape(id)
      if (refreshMediaDetail) {
        await refreshMediaDetail(id)
      } else if (setMedia) {
        const res = await mediaApi.detail(id)
        setMedia(res.data.data)
      }
      toast.success(t('mediaDetail.scrapeSuccess'))
    } catch (err) {
      toast.error(formatErrMsg(err, t('mediaDetail.scrapeFailed')))
    } finally {
      setScraping(false)
    }
  }, [id, setMedia, refreshMediaDetail, toast, t])

  const handleAddToPlaylist = useCallback(async (playlistId: string) => {
    if (!id) return
    try {
      await playlistApi.addItem(playlistId, id)
      toast.success(t('mediaDetail.addToPlaylistSuccess'))
    } catch {
      toast.error(t('mediaDetail.addToPlaylistFailed'))
    }
  }, [id, toast, t])

  const handleUnmatch = useCallback(async () => {
    if (!id) return
    try {
      await adminApi.unmatchMetadata(id)
      if (refreshMediaDetail) {
        await refreshMediaDetail(id)
      } else if (setMedia) {
        const res = await mediaApi.detail(id)
        setMedia(res.data.data)
      }
      setPosterVersion?.(Date.now())
      toast.success(t('mediaDetail.unmatchSuccess'))
    } catch {
      toast.error(t('mediaDetail.unmatchFailed'))
    }
  }, [id, setMedia, refreshMediaDetail, setPosterVersion, toast, t])

  const handleRefreshSuccess = useCallback(async () => {
    if (!id) return
    try {
      if (refreshMediaDetail) {
        await refreshMediaDetail(id)
      } else if (setMedia) {
        const res = await mediaApi.detail(id)
        setMedia(res.data.data)
      }
      setPosterVersion?.(Date.now())
      toast.success(t('mediaDetail.refreshSuccess'))
    } catch {
      // ignore
    }
  }, [id, setMedia, refreshMediaDetail, setPosterVersion, toast, t])

  const handleEditSave = useCallback(
    async (editForm: {
      title: string
      orig_title: string
      year: number
      overview: string
      rating: number
      genres: string
      country: string
      language: string
      tagline: string
      studio: string
    }) => {
      if (!id) return
      try {
        await adminApi.updateMediaMetadata(id, editForm)
        if (refreshMediaDetail) {
          await refreshMediaDetail(id)
        } else if (setMedia) {
          const res = await mediaApi.detail(id)
          setMedia(res.data.data)
        }
        setPosterVersion?.(Date.now())
        toast.success(t('mediaDetail.editSuccess'))
      } catch {
        toast.error(t('mediaDetail.editFailed'))
      }
    },
    [id, setMedia, refreshMediaDetail, setPosterVersion, toast, t]
  )

  const handleDelete = useCallback(
    async (deleteFiles: boolean, onSuccess?: () => void) => {
      if (!id) return
      try {
        await adminApi.deleteMedia(id, deleteFiles)
        toast.success(t('mediaDetail.deleteSuccess'))
        onSuccess?.()
      } catch {
        toast.error(t('mediaDetail.deleteFailed'))
      }
    },
    [id, toast, t]
  )

  return {
    scraping,
    handleFavorite,
    handleMarkWatched,
    handleScrape,
    handleAddToPlaylist,
    handleUnmatch,
    handleRefreshSuccess,
    handleEditSave,
    handleDelete,
  }
}

export interface EditFormData {
  title: string
  orig_title: string
  year: number
  overview: string
  rating: number
  genres: string
  country: string
  language: string
  tagline: string
  studio: string
}

const defaultForm: EditFormData = {
  title: '',
  orig_title: '',
  year: 0,
  overview: '',
  rating: 0,
  genres: '',
  country: '',
  language: '',
  tagline: '',
  studio: '',
}

interface UseEditMetadataOptions {
  onSaveSuccess?: () => void
  onSaveError?: (err: unknown) => void
}

export function useEditMetadata(
  media: Media | Series | Episode | null,
  onSave: (form: EditFormData) => Promise<void>,
  options: UseEditMetadataOptions = {}
) {
  const [editForm, setEditForm] = useState<EditFormData>(defaultForm)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!media) {
      setEditForm(defaultForm)
      return
    }
    
    setEditForm({
      title: media.title || '',
      orig_title: media.orig_title || '',
      year: media.year || 0,
      overview: media.overview || '',
      rating: media.rating || 0,
      genres: Array.isArray(media.genres) ? media.genres.join(', ') : (media.genres || ''),
      country: media.country || '',
      language: media.language || '',
      tagline: media.tagline || '',
      studio: media.studio || '',
    })
  }, [media])

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSave = useCallback(async () => {
    try {
      await onSave(editForm)
      options.onSaveSuccess?.()
      close()
    } catch (err) {
      options.onSaveError?.(err)
    }
  }, [editForm, onSave, close, options])

  const handleChange = useCallback((field: keyof EditFormData, value: string | number) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  return {
    editForm,
    isOpen,
    open,
    close,
    handleSave,
    handleChange,
    setEditForm,
  }
}

export interface MatchStrategy {
  search: (query: string) => Promise<any[]>
  apply: (mediaId: string, selectedId: string | number) => Promise<void>
}

export interface MatchResult {
  id: string | number
  title: string
  year?: string | number
  rating?: number
  posterUrl?: string
}

export interface MovieTmdbStrategy {
  type: 'movie'
  source: 'tmdb'
}

export interface TvTmdbStrategy {
  type: 'tv'
  source: 'tmdb'
}

export interface MovieDoubanStrategy {
  type: 'movie'
  source: 'douban'
}

export interface TvDoubanStrategy {
  type: 'tv'
  source: 'douban'
}

export type MatchStrategyType = MovieTmdbStrategy | TvTmdbStrategy | MovieDoubanStrategy | TvDoubanStrategy

function createStrategy(strategyType: MatchStrategyType, mediaId: string): MatchStrategy {
  const { type, source } = strategyType

  const search = async (query: string): Promise<any[]> => {
    if (source === 'tmdb') {
      const res = await adminApi.searchMetadata(query, type)
      return res.data.data || []
    } else {
      const res = await adminApi.searchDouban(query)
      return res.data.data || []
    }
  }

  const apply = async (mediaId: string, selectedId: string | number): Promise<void> => {
    if (source === 'tmdb') {
      if (type === 'tv') {
        await adminApi.matchSeriesMetadata(mediaId, selectedId as number)
      } else {
        await adminApi.matchMetadata(mediaId, selectedId as number)
      }
    } else {
      if (type === 'tv') {
        await adminApi.matchSeriesDouban(mediaId, selectedId as string)
      } else {
        await adminApi.matchMediaDouban(mediaId, selectedId as string)
      }
    }
  }

  return { search, apply }
}

export function useMatch(mediaId: string, strategyType: MatchStrategyType, onSuccess: () => void) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MatchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [applying, setApplying] = useState(false)
  const toast = useToast()
  const strategy = createStrategy(strategyType, mediaId)

  const search = useCallback(async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const rawResults = await strategy.search(query)
      const formattedResults: MatchResult[] = rawResults.map(result => {
        const { source } = strategyType
        const displayTitle = source === 'tmdb' ? (result.name || result.title) : result.title
        const displayYear = source === 'tmdb'
          ? (result.first_air_date || result.release_date)?.split('-')[0]
          : (result.year > 0 ? String(result.year) : '')
        const displayRating = source === 'tmdb' ? result.vote_average : (result.rating || 0)
        const posterUrl = source === 'tmdb'
          ? (result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : null)
          : (result.cover || null)

        return {
          id: result.id,
          title: displayTitle,
          year: displayYear,
          rating: displayRating,
          posterUrl,
        }
      })
      setResults(formattedResults)
      if (!formattedResults.length) {
        toast.info(`${strategyType.source === 'tmdb' ? 'TMDb' : '豆瓣'} 未找到匹配结果`)
      }
    } catch (err) {
      toast.error(formatErrMsg(err, `${strategyType.source} 搜索失败`))
    } finally {
      setSearching(false)
    }
  }, [query, strategy, strategyType.source, toast])

  const apply = useCallback(async (selectedId: string | number) => {
    setApplying(true)
    try {
      await strategy.apply(mediaId, selectedId)
      await onSuccess()
      toast.success(`匹配成功（来源：${strategyType.source === 'tmdb' ? 'TMDb' : '豆瓣'}）`)
      return true
    } catch {
      toast.error('匹配失败')
      return false
    } finally {
      setApplying(false)
    }
  }, [mediaId, strategy, onSuccess, strategyType.source, toast])

  const reset = useCallback(() => {
    setResults([])
    setQuery('')
  }, [])

  return {
    query,
    setQuery,
    results,
    setResults,
    searching,
    applying,
    search,
    apply,
    reset,
    source: strategyType.source,
  }
}

interface UseMediaStreamsReturn {
  videoStreams: VideoStream[]
  audioStreams: AudioStream[]
}

export function useMediaStreams(streams: Stream[] | undefined): UseMediaStreamsReturn {
  const videoStreams = useMemo(() => getVideoStreams(streams || []), [streams])
  const audioStreams = useMemo(() => getAudioStreams(streams || []), [streams])

  return { videoStreams, audioStreams }
}