import type { ReactNode } from 'react'
import { MediaDetailSkeleton } from '@/components/common/layout/MediaDetailSkeleton'

export type SkeletonVariant = 'movie' | 'series' | 'season' | 'episode'

interface UseDetailPageLoaderOptions<T> {
  loading: boolean
  data: T | null | undefined
  variant: SkeletonVariant
  fallback?: ReactNode
}

interface UseDetailPageLoaderResult {
  shouldRender: boolean
  element: ReactNode | null
}

export function useDetailPageLoader<T>({
  loading,
  data,
  variant,
  fallback,
}: UseDetailPageLoaderOptions<T>): UseDetailPageLoaderResult {
  if (loading || !data) {
    if (fallback) {
      return { shouldRender: false, element: fallback }
    }
    return { shouldRender: false, element: <MediaDetailSkeleton variant={variant} /> }
  }
  return { shouldRender: true, element: null }
}