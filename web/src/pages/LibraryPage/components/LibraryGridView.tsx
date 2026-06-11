import type { MixedItem } from '@/types'
import MediaCard from '@/components/MediaCard'

interface LibraryGridViewProps {
  items: MixedItem[]
  isAdmin: boolean
  onManualMatch?: (id: string) => void
  onUnmatch?: (id: string) => void
  onRefreshMetadata?: (id: string) => void
  onEditMetadata?: (id: string) => void
  onDelete?: (id: string, type?: 'movie' | 'series') => void
}

export default function LibraryGridView({
  items,
  isAdmin,
  onManualMatch,
  onUnmatch,
  onRefreshMetadata,
  onEditMetadata,
  onDelete,
}: LibraryGridViewProps) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9">
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