import { useCallback, useState } from 'react'
import { mediaApi, userApi, playlistApi, adminApi } from '@/api'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n'
import { formatErrMsg } from '@/utils/error'
import type { Media, Series } from '@/types'

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