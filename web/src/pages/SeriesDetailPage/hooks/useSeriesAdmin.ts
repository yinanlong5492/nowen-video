import { useCallback } from 'react'
import { adminApi, seriesApi } from '@/api'
import { useToast } from '@/components/Toast'
import type { Series } from '@/types'

export function useSeriesAdmin(
  seriesId: string | undefined,
  series: Series | null,
  onSeriesChange: (series: Series) => void,
  onRefreshPoster: () => void,
  onRefreshData: () => void,
) {
  const toast = useToast()

  const handleUnmatch = useCallback(async () => {
    if (!seriesId) return
    try {
      await adminApi.unmatchSeriesMetadata(seriesId)
      const res = await seriesApi.detail(seriesId)
      onSeriesChange(res.data.data)
      onRefreshPoster()
      toast.success('已解除匹配')
    } catch {
      toast.error('解除匹配失败')
    }
  }, [seriesId, onSeriesChange, onRefreshPoster, toast])

  const handleRefreshMetadata = useCallback(async () => {
    if (!seriesId) return
    try {
      const res = await seriesApi.detail(seriesId)
      onSeriesChange(res.data.data)
      onRefreshPoster()
      toast.success('元数据刷新成功')
    } catch {
      toast.error('刷新失败')
    }
  }, [seriesId, onSeriesChange, onRefreshPoster, toast])

  const handleEditMetadata = useCallback(() => {
    if (!series) return null
    return {
      title: series.title || '',
      orig_title: series.orig_title || '',
      year: series.year > 0 ? series.year : undefined,
      overview: series.overview || '',
      rating: series.rating > 0 ? series.rating : undefined,
      genres: series.genres || '',
      country: series.country || '',
      language: series.language || '',
      studio: series.studio || '',
    }
  }, [series])

  const handleEditSave = useCallback(async (editForm: Record<string, any>) => {
    if (!seriesId) return
    try {
      await adminApi.updateSeriesMetadata(seriesId, editForm)
      const res = await seriesApi.detail(seriesId)
      onSeriesChange(res.data.data)
      onRefreshPoster()
      toast.success('元数据已更新')
      onRefreshData()
    } catch {
      toast.error('更新失败')
    }
  }, [seriesId, onSeriesChange, onRefreshPoster, onRefreshData, toast])

  const handleDelete = useCallback(async (deleteFiles: boolean) => {
    if (!seriesId) return
    try {
      await adminApi.deleteSeries(seriesId, deleteFiles)
      toast.success('剧集已删除')
    } catch {
      toast.error('删除失败')
    }
  }, [seriesId, toast])

  return {
    handleUnmatch,
    handleRefreshMetadata,
    handleEditMetadata,
    handleEditSave,
    handleDelete,
  }
}