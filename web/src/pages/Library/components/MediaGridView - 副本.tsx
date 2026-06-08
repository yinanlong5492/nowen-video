import MediaCard from '@/components/media/MediaCard'
import type { MixedItem } from '../types'

interface MediaGridViewProps {
  items: MixedItem[]
  loading?: boolean
  onRefreshMetadata?: (id: string) => void
  onEditMetadata?: (id: string) => void
  onDelete?: (id: string) => void
  onManualMatch?: (id: string) => void
  onUnmatch?: (id: string) => void
  isAdmin?: boolean
}

export function MediaGridView({
  items,
  loading = false,
  onRefreshMetadata,
  onEditMetadata,
  onDelete,
  onManualMatch,
  onUnmatch,
  isAdmin = false,
}: MediaGridViewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
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
              onManualMatch={isAdmin ? onManualMatch : undefined}
              onUnmatch={isAdmin ? onUnmatch : undefined}
              onRefreshMetadata={isAdmin ? onRefreshMetadata : undefined}
              onEditMetadata={isAdmin ? onEditMetadata : undefined}
              onDelete={isAdmin ? onDelete : undefined}
            />
          )
        }
        if (item.media) {
          return (
            <MediaCard
              key={`m-${item.media.id}`}
              media={item.media}
              onManualMatch={isAdmin ? onManualMatch : undefined}
              onUnmatch={isAdmin ? onUnmatch : undefined}
              onRefreshMetadata={isAdmin ? onRefreshMetadata : undefined}
              onEditMetadata={isAdmin ? onEditMetadata : undefined}
              onDelete={isAdmin ? onDelete : undefined}
            />
          )
        }
        return null
      })}
    </div>
  )
}