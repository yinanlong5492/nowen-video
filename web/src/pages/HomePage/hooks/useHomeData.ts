import { useEffect, useRef, useCallback } from 'react'
import { mediaApi, recommendApi, libraryApi } from '@/api'
import { useWebSocket, WS_EVENTS } from '@/hooks/useWebSocket'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n'
import { usePageCache } from '@/hooks/usePageCache'
import type { WatchHistory, RecommendedMedia } from '@/types'
import { getRandomCovers, LibraryWithCovers } from '../utils/homeUtils'

export interface HomeData {
  continueList: WatchHistory[]
  recommendations: RecommendedMedia[]
  libraries: LibraryWithCovers[]
  allFailed: boolean
}

export function useHomeData() {
  const { on, off } = useWebSocket()
  const toast = useToast()
  const { t } = useTranslation()
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data, loading, refetch, invalidate } = usePageCache<HomeData>(
    'home:overview',
    async () => {
      const [continueResult, recommendResult, libraryResult] = await Promise.allSettled([
        mediaApi.continueWatching(10),
        recommendApi.getRecommendations(12),
        libraryApi.list({ sort: 'id', sort_order: 'asc' }),
      ])

      const libraries: LibraryWithCovers[] = []
      if (libraryResult.status === 'fulfilled') {
        const libs = libraryResult.value.data.data || []
        for (const lib of libs) {
          const { coverUrls, recentItems } = await getRandomCovers(lib)
          libraries.push({ ...lib, coverUrls, recentItems })
        }

        const savedSortBy = localStorage.getItem('library_sort_by') as 'name' | 'created' | 'type' | null
        const savedSortAsc = localStorage.getItem('library_sort_asc') === 'true'
        if (savedSortBy) {
          libraries.sort((a, b) => {
            let cmp = 0
            if (savedSortBy === 'name') cmp = a.name.localeCompare(b.name)
            else if (savedSortBy === 'type') cmp = a.type.localeCompare(b.type)
            else cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            return savedSortAsc ? -cmp : cmp
          })
        }
      }

      return {
        continueList: continueResult.status === 'fulfilled' ? (continueResult.value.data.data || []) : [],
        recommendations: recommendResult.status === 'fulfilled' ? (recommendResult.value.data.data || []) : [],
        libraries,
        allFailed: [continueResult, recommendResult].every((r) => r.status === 'rejected'),
      }
    },
    { ttl: 30_000 },
  )

  const toastRef = useRef(toast)
  const tRef = useRef(t)
  useEffect(() => { toastRef.current = toast; tRef.current = t }, [toast, t])

  useEffect(() => {
    if (data?.allFailed && !loading) {
      toastRef.current.error(tRef.current('home.loadFailed'))
    }
  }, [data?.allFailed, loading])

  const silentRefresh = useCallback(() => {
    refetch(true)
  }, [refetch])

  useEffect(() => {
    const debouncedRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(silentRefresh, 1000)
    }
    const handleLibraryDeleted = () => {
      invalidate()
      silentRefresh()
    }
    const handleContentChanged = () => debouncedRefresh()

    on(WS_EVENTS.LIBRARY_DELETED, handleLibraryDeleted)
    on(WS_EVENTS.LIBRARY_UPDATED, handleContentChanged)
    on(WS_EVENTS.SCAN_COMPLETED, handleContentChanged)
    on(WS_EVENTS.SCRAPE_COMPLETED, handleContentChanged)

    return () => {
      off(WS_EVENTS.LIBRARY_DELETED, handleLibraryDeleted)
      off(WS_EVENTS.LIBRARY_UPDATED, handleContentChanged)
      off(WS_EVENTS.SCAN_COMPLETED, handleContentChanged)
      off(WS_EVENTS.SCRAPE_COMPLETED, handleContentChanged)
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [on, off, invalidate, silentRefresh])

  return { data, loading, refetch }
}
