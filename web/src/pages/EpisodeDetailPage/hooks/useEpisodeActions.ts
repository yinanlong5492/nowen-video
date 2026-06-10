import { useState } from 'react'
import { mediaApi, userApi, playlistApi, adminApi } from '@/api'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n'
import { formatErrMsg } from '@/utils/error'
import type { Media } from '@/types'

interface UseEpisodeActionsProps {
  id: string | undefined
  media: Media | null
  isFavorited: boolean
  isWatched: boolean
  setIsFavorited: React.Dispatch<React.SetStateAction<boolean>>
  setIsWatched: React.Dispatch<React.SetStateAction<boolean>>
  setMedia: React.Dispatch<React.SetStateAction<Media | null>>
  setPosterVersion: React.Dispatch<React.SetStateAction<number>>
}

interface UseEpisodeActionsReturn {
  scraping: boolean
  handleFavorite: () => Promise<void>
  handleMarkWatched: () => Promise<void>
  handleScrape: () => Promise<void>
  handleAddToPlaylist: (playlistId: string) => Promise<void>
  handleUnmatch: () => Promise<void>
  handleRefreshSuccess: () => Promise<void>
  handleEditSave: (editForm: {
    title: string; orig_title: string; year: number; overview: string;
    rating: number; genres: string; country: string; language: string;
    tagline: string; studio: string
  }) => Promise<void>
  handleDelete: (deleteFiles: boolean, navigateBack: () => void) => Promise<void>
}

export function useEpisodeActions({
  id,
  media,
  isFavorited,
  isWatched,
  setIsFavorited,
  setIsWatched,
  setMedia,
  setPosterVersion,
}: UseEpisodeActionsProps): UseEpisodeActionsReturn {
  const toast = useToast()
  const { t } = useTranslation()
  const [scraping, setScraping] = useState(false)

  const handleFavorite = async () => {
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
  }

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!id) return
    try {
      await playlistApi.addItem(playlistId, id)
      toast.success('已添加到播放列表')
    } catch {
      toast.error('添加到播放列表失败')
    }
  }

  const handleMarkWatched = async () => {
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
  }

  const handleScrape = async () => {
    if (!id) return
    setScraping(true)
    try {
      await mediaApi.scrape(id)
      const res = await mediaApi.detail(id)
      setMedia(res.data.data)
      toast.success(t('mediaDetail.scrapeSuccess'))
    } catch (err) {
      toast.error(formatErrMsg(err, t('mediaDetail.scrapeFailed')))
    } finally {
      setScraping(false)
    }
  }

  const handleUnmatch = async () => {
    if (!id) return
    try {
      await adminApi.unmatchMetadata(id)
      const res = await mediaApi.detail(id)
      setMedia(res.data.data)
      setPosterVersion(Date.now())
      toast.success(t('mediaDetail.unmatchSuccess'))
    } catch {
      toast.error(t('mediaDetail.unmatchFailed'))
    }
  }

  const handleRefreshSuccess = async () => {
    if (!id) return
    try {
      const res = await mediaApi.detail(id)
      setMedia(res.data.data)
      setPosterVersion(Date.now())
      toast.success(t('mediaDetail.refreshSuccess'))
    } catch {
      // ignore
    }
  }

  const handleEditSave = async (editForm: {
    title: string; orig_title: string; year: number; overview: string;
    rating: number; genres: string; country: string; language: string;
    tagline: string; studio: string
  }) => {
    if (!id) return
    try {
      await adminApi.updateMediaMetadata(id, editForm)
      const res = await mediaApi.detail(id)
      setMedia(res.data.data)
      setPosterVersion(Date.now())
      toast.success(t('mediaDetail.editSuccess'))
    } catch {
      toast.error(t('mediaDetail.editFailed'))
    }
  }

  const handleDelete = async (deleteFiles: boolean, navigateBack: () => void) => {
    if (!id) return
    try {
      await adminApi.deleteMedia(id, deleteFiles)
      toast.success(t('mediaDetail.deleteSuccess'))
      navigateBack()
    } catch {
      toast.error(t('mediaDetail.deleteFailed'))
    }
  }

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
