import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSystemSettingsStore } from '@/stores/systemSettings'

export function useLibraryPagination() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { settings, fetchSettings } = useSystemSettingsStore()
  const [sizeState, setSizeState] = useState<number | null>(null)

  // 加载系统设置
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // 当设置加载完成或URL参数变化时，更新size状态
  useEffect(() => {
    const defaultSize = settings?.library_page_size ?? 20
    const urlSize = searchParams.get('limit')
    const newSize = urlSize ? parseInt(urlSize, 10) || defaultSize : defaultSize
    setSizeState(newSize)
  }, [settings, searchParams])

  const page = parseInt(searchParams.get('page') || '1', 10) || 1
  const size = sizeState ?? (settings?.library_page_size ?? 20)

  const setPage = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams)
    if (newPage <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(newPage))
    }
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  const setSize = useCallback((newSize: number) => {
    const params = new URLSearchParams(searchParams)
    const defaultSize = settings?.library_page_size ?? 20
    if (newSize === defaultSize) {
      params.delete('limit')
    } else {
      params.set('limit', String(newSize))
    }
    params.delete('page')
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams, settings])

  return {
    page,
    size,
    setPage,
    setSize,
  }
}