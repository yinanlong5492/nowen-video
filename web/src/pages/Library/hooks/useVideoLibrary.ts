import { useEffect, useState, useCallback } from 'react'
import { mediaApi, libraryApi } from '@/api'
import { useToast } from '@/components/Toast'
import type { MixedItem, Library } from '@/types'

interface UseVideoLibraryOptions {
  pageSize?: number
  page?: number
}

export function useVideoLibrary(libraryId: string, options: UseVideoLibraryOptions = {}) {
  const [items, setItems] = useState<MixedItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [library, setLibrary] = useState<Library | null>(null)
  const toast = useToast()
  const pageSize = options.pageSize ?? 30
  const page = options.page ?? 1

  const loadData = useCallback(async (pageNum: number = page, size: number = pageSize) => {
    setLoading(true)
    try {
      // 获取媒体库信息
      const libRes = await libraryApi.list()
      const foundLibrary = libRes.data.data.find(lib => lib.id === libraryId)
      setLibrary(foundLibrary || null)

      // 如果不是视频库，直接返回
      if (foundLibrary?.type === 'music' || foundLibrary?.type === 'audiobook') {
        setLoading(false)
        return
      }

      // 加载视频内容
      const mixedRes = await mediaApi.listMixed({ page: pageNum, size, library_id: libraryId })
      // 过滤只保留视频和剧集类型
      const videoItems = mixedRes.data.data.filter(item => 
        item.type === 'movie' || item.type === 'series'
      )
      setItems(videoItems || [])
      setTotal(mixedRes.data.total || 0)
    } catch {
      toast.error('加载媒体库内容失败')
    } finally {
      setLoading(false)
    }
  }, [libraryId, toast, pageSize, page])

  useEffect(() => {
    loadData()
  }, [loadData, page, pageSize])

  return {
    items,
    total,
    loading,
    library,
    refresh: loadData,
  }
}