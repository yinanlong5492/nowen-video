import { Link } from 'react-router-dom'
import { Star, Tv } from 'lucide-react'
import { streamApi } from '@/api'
import type { MixedItem, Media, Series } from '@/types'
import { formatDuration } from '../utils/libraryHelpers'

interface LibraryListViewProps {
  items: MixedItem[]
}

export default function LibraryListView({ items }: LibraryListViewProps) {
  return (
    <div className="space-y-2 animate-fade-in">
      {items.map((item) => {
        if (item.type === 'series' && item.series) {
          return <ListSeriesItem key={`s-${item.series.id}`} series={item.series} />
        }
        if (item.media) {
          return <ListMediaItem key={`m-${item.media.id}`} media={item.media} />
        }
        return null
      })}
    </div>
  )
}

function ListMediaItem({ media }: { media: Media }) {
  return (
    <Link
      to={media.series_id ? `/series/${media.series_id}` : `/media/${media.id}`}
      className="group flex items-center gap-4 rounded-xl p-3 transition-all duration-300"
      style={{ border: '1px solid var(--border-default)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--nav-hover-bg)'
        e.currentTarget.style.borderColor = 'var(--border-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = 'var(--border-default)'
      }}
    >
      {/* 缩略图 */}
      <div
        className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg"
        style={{ background: 'var(--bg-surface)' }}
      >
        <img
          src={streamApi.getPosterUrl(media.id)}
          alt={media.title}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      </div>

      {/* 信息 */}
      <div className="min-w-0 flex-1">
        <h3
          className="truncate text-sm font-medium transition-colors group-hover:text-neon"
          style={{ color: 'var(--text-primary)' }}
        >
          {media.title}
        </h3>
        <div className="mt-0.5 flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {media.year > 0 && <span>{media.year}</span>}
          {media.duration > 0 && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span>{formatDuration(media.duration)}</span>
            </>
          )}
          {media.resolution && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span className="badge-neon text-[10px] px-1.5 py-0">{media.resolution}</span>
            </>
          )}
        </div>
      </div>

      {/* 评分 */}
      {media.rating > 0 && (
        <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Star size={14} className="text-yellow-400" fill="currentColor" />
          <span className="font-display font-semibold">{media.rating.toFixed(1)}</span>
        </div>
      )}
    </Link>
  )
}

function ListSeriesItem({ series }: { series: Series }) {
  return (
    <Link
      to={`/series/${series.id}`}
      className="group flex items-center gap-4 rounded-xl p-3 transition-all duration-300"
      style={{ border: '1px solid var(--border-default)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--nav-hover-bg)'
        e.currentTarget.style.borderColor = 'var(--border-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = 'var(--border-default)'
      }}
    >
      {/* 缩略图 */}
      <div
        className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg"
        style={{ background: 'var(--bg-surface)' }}
      >
        {series.poster_path ? (
          <img
            src={streamApi.getSeriesPosterUrl(series.id)}
            alt={series.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-surface-700">
            <Tv size={16} />
          </div>
        )}
      </div>

      {/* 信息 */}
      <div className="min-w-0 flex-1">
        <h3
          className="truncate text-sm font-medium transition-colors group-hover:text-neon"
          style={{ color: 'var(--text-primary)' }}
        >
          {series.title}
        </h3>
        <div className="mt-0.5 flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {series.year > 0 && <span>{series.year}</span>}
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span>{series.season_count} 季 · {series.episode_count} 集</span>
        </div>
      </div>

      {/* 评分 */}
      {series.rating > 0 && (
        <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Star size={14} className="text-yellow-400" fill="currentColor" />
          <span className="font-display font-semibold">{series.rating.toFixed(1)}</span>
        </div>
      )}
    </Link>
  )
}
