import type { MixedItem } from '@/types'
import MediaCard from '@/components/MediaCard'

interface LibraryGridViewProps {
  loading: boolean
  items: MixedItem[]
  isAdmin: boolean
  onManualMatch?: (id: string) => void
  onUnmatch?: (id: string) => void
  onRefreshMetadata?: (id: string) => void
  onEditMetadata?: (id: string) => void
  onDelete?: (id: string, type: 'movie' | 'series') => void
}

export default function LibraryGridView({
  loading,
  items,
  isAdmin,
  onManualMatch,
  onUnmatch,
  onRefreshMetadata,
  onEditMetadata,
  onDelete,
}: LibraryGridViewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[2/3] rounded-xl" />
            <div className="skeleton mt-2 h-4 w-3/4 rounded" />
            <div className="skeleton mt-1 h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 animate-fade-in">
      {items.map((item) => {
        if (item.type === 'series' && item.series) {
          return (
            <MediaCard
              key={`s-${item.series.id}`}
              series={item.series}
              contentType="series"
              onManualMatch={isAdmin ? onManualMatch : undefined}
              onUnmatch={isAdmin ? onUnmatch : undefined}
              onRefreshMetadata={isAdmin ? onRefreshMetadata : undefined}
              onEditMetadata={isAdmin ? onEditMetadata : undefined}
              onDelete={isAdmin ? (id: string) => onDelete?.(id, 'series') : undefined}
            />
          )
        }
        if (item.media) {
          // 判断是电影还是剧集的集
          const contentType = item.media.series_id ? 'episode' : 'movie'
          return (
            <MediaCard
              key={`m-${item.media.id}`}
              media={item.media}
              contentType={contentType}
              onManualMatch={isAdmin ? onManualMatch : undefined}
              onUnmatch={isAdmin ? onUnmatch : undefined}
              onRefreshMetadata={isAdmin ? onRefreshMetadata : undefined}
              onEditMetadata={isAdmin ? onEditMetadata : undefined}
              onDelete={isAdmin ? (id: string) => onDelete?.(id, contentType === 'movie' ? 'movie' : 'series') : undefined}
            />
          )
        }
        return null
      })}
    </div>
  )
}
