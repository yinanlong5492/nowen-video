import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { streamApi } from '@/api'
import { formatProgress } from '@/utils/format'
import { HorizontalScrollRow } from './HorizontalScrollRow'
import { MediaCardActions } from '../actions/MediaCardActions'
import { MoreMenuDropdown } from '../actions/MoreMenuDropdown'
import { useDropdownPosition } from '@/hooks/useDropdownPosition'
import { useMediaActions } from '@/hooks/useMediaActions'
import { useAuthStore } from '@/stores/auth'
import type { WatchHistory, MixedItem } from '@/types'
import { getWatchHistoryTitle, getWatchHistoryDetailTo, getItemId, getItemTitle, getItemYear, getItemRating, getItemPosterUrl, getItemLink, getItemDetailTo } from '@/utils/mediaHelpers'

export type CardType = 'continue' | 'recent' | 'default'

interface MediaRowProps {
  title: string
  items: WatchHistory[] | MixedItem[]
  cardType?: CardType
  watchedLabel?: (percent: number) => string
}

export function MediaRow({ title, items, cardType = 'default', watchedLabel }: MediaRowProps) {
  const { favoritedMap, watchedMap, toggleFavorite, markWatched } = useMediaActions()
  const [showMoreId, setShowMoreId] = useState<string | null>(null)
  const { buttonRef, position } = useDropdownPosition(showMoreId)
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const handleMoreClick = (e: React.MouseEvent, mediaId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMoreId(showMoreId === mediaId ? null : mediaId)
  }

  const renderContinueCard = (item: WatchHistory) => {
    const percent = formatProgress(item.position, item.duration)
    const displayTitle = getWatchHistoryTitle(item)
    const detailTo = getWatchHistoryDetailTo(item)
    const isFav = favoritedMap[item.media_id] || false
    const isWatched = watchedMap[item.media_id] || false
    const isSeries = !!item.media.series_id

    return (
      <motion.div key={item.id} className="flex-shrink-0">
        <Link
          to={`/play/${item.media_id}`}
          className="media-card group block w-[220px] sm:w-[260px]"
        >
          <div className="relative aspect-video overflow-hidden rounded-xl bg-theme-bg-surface">
            {item.media.poster_path ? (
              <img
                src={streamApi.getPosterUrl(item.media_id)}
                alt={item.media.title}
                className="h-full w-full object-cover transition-all duration-500"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-surface-700">
                <Play size={36} />
              </div>
            )}
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
                  boxShadow: 'var(--neon-glow-shadow-md)',
                }}
              >
                <Play size={18} className="ml-0.5 text-white" fill="white" />
              </div>
            </div>
            <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {percent}%
            </span>
            <MediaCardActions
              mediaId={item.media_id}
              isFavorited={isFav}
              isWatched={isWatched}
              onFavorite={() => toggleFavorite(item.media_id)}
              onMarkWatched={() => markWatched(item.media_id, item.duration, isSeries, item.media.series_id)}
              onMoreClick={(e) => handleMoreClick(e, item.media_id)}
              moreBtnRef={showMoreId === item.media_id ? buttonRef : undefined}
            />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-20">
              <div
                className="h-full transition-all"
                style={{
                  width: `${percent}%`,
                  background: 'linear-gradient(90deg, var(--neon-blue), var(--neon-purple))',
                  boxShadow: 'var(--neon-glow-shadow-sm)',
                }}
              />
            </div>
          </div>

          <div className="px-1 py-2 text-center">
            <h3 className="truncate text-sm font-medium transition-colors group-hover:text-neon text-theme-primary">
              {displayTitle}
            </h3>
            {item.media.media_type === 'episode' && item.media.episode_title && (
              <p className="mt-0.5 truncate text-xs text-theme-secondary">
                {item.media.episode_title}
              </p>
            )}
            {watchedLabel && (
              <p className="mt-1 text-[11px] text-theme-tertiary">
                {watchedLabel(percent)}
              </p>
            )}
          </div>
        </Link>
        <MoreMenuDropdown
          isOpen={showMoreId === item.media_id}
          onClose={() => setShowMoreId(null)}
          position={position}
          detailTo={detailTo}
          isAdmin={isAdmin}
          contentType={item.media.media_type === 'episode' ? 'episode' : 'movie'}
        />
      </motion.div>
    )
  }

  const renderRecentCard = (item: MixedItem) => {
    const itemId = getItemId(item)
    if (!itemId) return null
    const title = getItemTitle(item)
    const year = getItemYear(item)
    const rating = getItemRating(item)
    const posterUrl = getItemPosterUrl(item)
    const linkTo = getItemLink(item)
    const detailTo = getItemDetailTo(item)
    const isMusicType = item.type === 'music'
    const isAudiobookType = item.type === 'audiobook'
    const isFav = favoritedMap[itemId] || false
    const isWatched = watchedMap[itemId] || false
    const isSeries = item.type === 'series' || (item.media && !!item.media.series_id)
    const seriesId = item.type === 'series' && item.series ? item.series.id : item.media?.series_id

    return (
      <Link
        key={itemId}
        to={linkTo}
        className="media-card group w-[140px] flex-shrink-0 sm:w-[160px]"
      >
        <div className={`relative overflow-hidden rounded-xl ${isMusicType ? 'aspect-square' : 'aspect-[2/3]'}`}>
          {posterUrl && (
            <img
              src={posterUrl}
              alt={title}
              className="h-full w-full object-cover transition-all duration-500"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <div className="absolute inset-0 -z-10 flex items-center justify-center text-surface-700">
            <Play size={36} />
          </div>
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 hover:scale-125 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
                boxShadow: 'var(--neon-glow-shadow-md)',
              }}
            >
              <Play size={18} className="ml-0.5 text-white" fill="white" />
            </button>
          </div>
          {rating > 0 && (
            <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-yellow-400 backdrop-blur-sm">
              <Star size={10} fill="currentColor" />
              {rating.toFixed(1)}
            </span>
          )}
          <MediaCardActions
            mediaId={itemId}
            isFavorited={isFav}
            isWatched={isWatched}
            showMarkWatched={!isMusicType && !isAudiobookType}
            onFavorite={() => toggleFavorite(itemId)}
            onMarkWatched={() => markWatched(itemId, 3600, isSeries, seriesId)}
            onMoreClick={(e) => handleMoreClick(e, itemId)}
            moreBtnRef={showMoreId === itemId ? buttonRef : undefined}
          />
        </div>
        <div className="px-1 py-2 text-center" style={{ background: 'transparent' }}>
          <h3 className="truncate text-sm font-medium transition-colors group-hover:text-neon text-theme-primary">
            {title}
          </h3>
          {year > 0 && (
            <p className="mt-0.5 text-xs text-theme-secondary">{year}</p>
          )}
        </div>
        <MoreMenuDropdown
          isOpen={showMoreId === itemId}
          onClose={() => setShowMoreId(null)}
          position={position}
          detailTo={detailTo}
          isAdmin={isAdmin}
          contentType={item.type === 'series' ? 'series' : item.type === 'media' ? 'movie' : 'movie'}
        />
      </Link>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <h2 className="mb-4 font-display text-xl font-bold tracking-wide text-theme-primary">
        {title}
      </h2>

      <HorizontalScrollRow gap={16}>
        {cardType === 'continue' && items.length > 0 && (
          (items as WatchHistory[]).map(renderContinueCard)
        )}
        {(cardType === 'recent' || cardType === 'default') && items.length > 0 && (
          (items as MixedItem[]).map(renderRecentCard)
        )}
      </HorizontalScrollRow>
    </motion.section>
  )
}