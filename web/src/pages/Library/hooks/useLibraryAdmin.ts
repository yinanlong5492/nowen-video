import { useCallback } from 'react'
import { useToast } from '@/components/Toast'
import { adminApi, fileManagerApi } from '@/api'

export function useLibraryAdmin() {
  const toast = useToast()

  const refreshMetadata = useCallback(async (mediaId: string) => {
    try {
      await fileManagerApi.scrapeFile(mediaId)
      toast.success('刷新成功')
    } catch {
      toast.error('刷新失败')
    }
  }, [toast])

  const manualMatch = useCallback(async (mediaId: string, source: 'tmdb' | 'douban', query: string) => {
    try {
      const result = await adminApi.searchMetadata(query, source === 'tmdb' ? 'movie' : 'movie')
      if (result.data.data.length > 0) {
        const tmdbId = result.data.data[0].id
        await adminApi.matchMetadata(mediaId, tmdbId)
        toast.success('匹配成功')
      } else {
        toast.error('未找到匹配结果')
      }
    } catch {
      toast.error('匹配失败')
    }
  }, [toast])

  const editMetadata = useCallback(async (mediaId: string, data: Record<string, unknown>) => {
    try {
      await adminApi.updateMediaMetadata(mediaId, data as any)
      toast.success('编辑成功')
    } catch {
      toast.error('编辑失败')
    }
  }, [toast])

  const deleteMedia = useCallback(async (mediaId: string, deleteFiles?: boolean) => {
    try {
      await adminApi.deleteMedia(mediaId, deleteFiles)
      toast.success('删除成功')
    } catch {
      toast.error('删除失败')
    }
  }, [toast])

  const unmatchMedia = useCallback(async (mediaId: string) => {
    try {
      await adminApi.unmatchMetadata(mediaId)
      toast.success('取消匹配成功')
    } catch {
      toast.error('取消匹配失败')
    }
  }, [toast])

  return {
    refreshMetadata,
    manualMatch,
    editMetadata,
    deleteMedia,
    unmatchMedia,
  }
}