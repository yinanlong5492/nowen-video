import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { mediaApi, libraryApi } from '@/api'
import { useToast } from '@/components/Toast'
import type { MixedItem, Library } from '@/types'

interface UseLibraryContentReturn {
  id: string | undefined
  library: Library | null
  mixedItems: MixedItem[]
  total: number
  loading: boolean
  page: number
  size: number
  totalPages: number
  setPage: (page: number) => void
  setSize: (size: number) => void
}

export function useLibraryContent(): UseLibraryContentReturn {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mixedItems, setMixedItems] = useState<MixedItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [library, setLibrary] = useState<Library | null>(null)
  const toast = useToast()

  // 从 URL 参数读取分页状态
  const page = parseInt(searchParams.get('page') || '1', 10) || 1
  const size = parseInt(searchParams.get('limit') || '30', 10) || 30

  // 分页变化时同步到 URL
  const setPage = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams)
    if (newPage <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(newPage))
    }
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  // 每页数量变化时同步到 URL，并重置到第一页
  const setSize = useCallback((newSize: number) => {
    const params = new URLSearchParams(searchParams)
    if (newSize === 30) {
      params.delete('limit')
    } else {
      params.set('limit', String(newSize))
    }
    params.delete('page')
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  // 切换媒体库时重置状态
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    params.delete('page')
    setSearchParams(params, { replace: true })
    setLoading(true)
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)

    // 首先获取媒体库信息
    libraryApi.list().then((libRes) => {
      const foundLibrary = libRes.data.data.find(lib => lib.id === id)
      setLibrary(foundLibrary || null)

      // 如果是音乐库或有声书库，不需要加载视频内容
      if (foundLibrary?.type === 'music' || foundLibrary?.type === 'audiobook') {
        setLoading(false)
        return
      }

      // 否则加载视频内容
      mediaApi.listMixed({ page, size, library_id: id })
        .then((mixedRes) => {
          setMixedItems(mixedRes.data.data || [])
          setTotal(mixedRes.data.total)
        })
        .catch(() => { toast.error('加载媒体库内容失败') })
        .finally(() => setLoading(false))
    }).catch(() => {
      setLoading(false)
      toast.error('加载媒体库信息失败')
    })
  }, [id, page, size])

  const totalPages = Math.ceil(total / size)

  return {
    id,
    library,
    mixedItems,
    total,
    loading,
    page,
    size,
    totalPages,
    setPage,
    setSize,
  }
}
