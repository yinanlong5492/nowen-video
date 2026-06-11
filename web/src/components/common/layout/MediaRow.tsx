import MediaCard from '@/components/MediaCard'
import { HorizontalScrollRow } from './HorizontalScrollRow'
import type { WatchHistory, MixedItem } from '@/types'

export type CardType = 'continue' | 'recent' | 'default'

export type ContentType = 'movie' | 'series' | 'season' | 'episode'

interface MediaRowProps {
  title: string
  items: WatchHistory[] | MixedItem[]
  cardType?: CardType
  watchedLabel?: (percent: number) => string
  isAdmin?: boolean
  onManualMatch?: (id: string) => void
  onUnmatch?: (id: string) => void
  onRefreshMetadata?: (id: string) => void
  onEditMetadata?: (id: string) => void
  onDelete?: (id: string) => void
}

export function MediaRow({ title, items, cardType = 'default', watchedLabel, isAdmin, onManualMatch, onUnmatch, onRefreshMetadata, onEditMetadata, onDelete }: MediaRowProps) {
  const getContentType = (item: MixedItem): ContentType => {
    if (item.type === 'series') return 'series'
    if (item.type === 'movie' && item.media?.series_id) return 'episode'
    return 'movie'
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold tracking-wide text-theme-primary">
        {title}
      </h2>

      <HorizontalScrollRow gap={16}>
        {cardType === 'continue' && items.length > 0 && (
          (items as WatchHistory[]).map((item) => {
            const contentType: ContentType = item.media.series_id ? 'episode' : 'movie'
            return (
              <div key={item.id} className="flex-shrink-0 w-[calc(50%-8px)] sm:w-[calc(33.333%-10.67px)] md:w-[calc(25%-12px)] lg:w-[calc(20%-12.8px)] xl:w-[calc(16.666%-13.33px)]">
                <MediaCard
                  watchHistory={item}
                  watchedLabel={watchedLabel}
                  contentType={contentType}
                  onManualMatch={isAdmin ? onManualMatch : undefined}
                  onUnmatch={isAdmin ? onUnmatch : undefined}
                  onRefreshMetadata={isAdmin ? onRefreshMetadata : undefined}
                  onEditMetadata={isAdmin ? onEditMetadata : undefined}
                  onDelete={isAdmin ? onDelete : undefined}
                />
              </div>
            )
          })
        )}
        {(cardType === 'recent' || cardType === 'default') && items.length > 0 && (
          (items as MixedItem[]).map((item) => {
            const cardWidth = item.type === 'music' 
              ? 'w-[140px] sm:w-[160px]' 
              : 'w-[140px] sm:w-[160px]'
            const contentType = getContentType(item)
            return (
              <div key={item.media?.id || item.series?.id || item.music?.id || item.audiobook?.id} className={`flex-shrink-0 ${cardWidth}`}>
                <MediaCard
                  media={item.media}
                  series={item.series}
                  music={item.music}
                  audiobook={item.audiobook}
                  contentType={contentType}
                  onManualMatch={isAdmin ? onManualMatch : undefined}
                  onUnmatch={isAdmin ? onUnmatch : undefined}
                  onRefreshMetadata={isAdmin ? onRefreshMetadata : undefined}
                  onEditMetadata={isAdmin ? onEditMetadata : undefined}
                  onDelete={isAdmin ? onDelete : undefined}
                />
              </div>
            )
          })
        )}
      </HorizontalScrollRow>
    </section>
  )
}