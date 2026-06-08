import { useState, useRef, useLayoutEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { userApi, seriesApi, audiobookApi, musicApi } from '@/api'
import { useToast } from '@/components/Toast'
import { useSmoothScroll } from '@/hooks/useSmoothScroll'
import { useAuthStore } from '@/stores/auth'
import { useMusicPlayerStore } from '@/stores/musicPlayer'
import { useAudioBookPlayerStore } from '@/stores/audioBookPlayer'
import { getAudioBookCoverUrl } from '@/api'
import type { MixedItem } from '@/types'
import { Play, ChevronLeft, ChevronRight, Star, Heart, Eye, MoreHorizontal, Share2, Link2, Unlink, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import { streamApi } from '@/api'
import { motion } from 'framer-motion'
import { staggerContainerVariants, staggerItemVariants } from '@/lib/motion'
import { createPortal } from 'react-dom'
import {
  LibraryWithCovers,
  getItemId,
  getItemTitle,
  getItemYear,
  getItemRating,
  getItemPosterUrl,
  getItemLink,
  getItemDetailTo,
} from '../utils/homeUtils'

interface BaseProps {
  title: string
}

interface LibraryModeProps extends BaseProps {
  mode: 'library'
  libraries: LibraryWithCovers[]
}

interface RecentModeProps extends BaseProps {
  mode: 'recent'
  library: LibraryWithCovers
}

type Props = LibraryModeProps | RecentModeProps

export default function LibraryRow(props: Props) {
  return props.mode === 'library' ? <LibraryMode {...props} /> : <RecentMode {...props} />
}

// ===================== 媒体库横向滚动模式 =====================
function LibraryMode({ title, libraries }: LibraryModeProps) {
  const { scrollRef, canScrollLeft, canScrollRight, scroll } = useSmoothScroll<HTMLDivElement>(0.7, libraries.length)

  return (
    <motion.section
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 mt-6"
    >
      <motion.h2 variants={staggerItemVariants} className="font-display text-xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
        {title}
      </motion.h2>
      <div className="relative overflow-x-hidden">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 transition-all"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}
            aria-label="scroll left"
          >
            <ChevronLeft size={20} className="text-theme-primary" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="scrollbar-hide flex gap-4 overflow-x-auto scroll-smooth pb-4"
        >
          {libraries.map((lib) => (
            <motion.div key={lib.id} variants={staggerItemVariants} className="flex-shrink-0">
              <Link
                to={`/library/${lib.id}`}
                className="group block w-[260px]"
              >
                <div className="relative aspect-video overflow-hidden rounded-xl" style={{ background: 'var(--bg-surface)' }}>
                  {lib.coverUrls.length > 0 ? (
                    <img
                      src={lib.coverUrls[0]}
                      alt={lib.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                      <span className="text-sm">{lib.name}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
                <div className="mt-2 text-center">
                  <h3 className="truncate text-sm font-medium transition-colors group-hover:text-neon text-theme-primary">
                    {lib.name}
                  </h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 transition-all"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}
            aria-label="scroll right"
          >
            <ChevronRight size={20} className="text-theme-primary" />
          </button>
        )}
      </div>
    </motion.section>
  )
}

// ===================== 最近添加横向滚动模式 =====================
function RecentMode({ title, library }: RecentModeProps) {
  const { scrollRef, canScrollLeft, canScrollRight, scroll } = useSmoothScroll<HTMLDivElement>(0.7, library.recentItems.length)
  const { playTrack } = useMusicPlayerStore()
  const toast = useToast()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const [favoritedMap, setFavoritedMap] = useState<Record<string, boolean>>({})
  const [watchedMap, setWatchedMap] = useState<Record<string, boolean>>({})
  const [showMoreId, setShowMoreId] = useState<string | null>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (showMoreId && moreBtnRef.current) {
      const rect = moreBtnRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
      })
    }
  }, [showMoreId])

  const handlePlayClick = async (e: React.MouseEvent, item: MixedItem) => {
    e.preventDefault()
    e.stopPropagation()
    if (item.type === 'music' && item.music) {
      playTrack(item.music, [item.music])
    } else if (item.type === 'audiobook' && item.audiobook) {
      const bookId = item.audiobook.id
      const [bookRes, chaptersRes] = await Promise.all([
        audiobookApi.detail(bookId),
        audiobookApi.getChapters(bookId),
      ])
      const book = bookRes.data.data
      const chapters = chaptersRes.data.data || []
      const { playBook } = useAudioBookPlayerStore.getState()
      playBook(book, chapters[0] || undefined)
    }
  }

  const handleFavorite = (e: React.MouseEvent, mediaId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { toast.info('请先登录'); return }
    const isFav = favoritedMap[mediaId] || false
    const apiCall = isFav ? userApi.removeFavorite(mediaId) : userApi.addFavorite(mediaId)
    apiCall.then(() => {
      setFavoritedMap((prev) => ({ ...prev, [mediaId]: !isFav }))
      toast.success(isFav ? '已取消收藏' : '已加入收藏')
    }).catch(() => toast.error('操作失败'))
  }

  const handleMarkWatched = async (e: React.MouseEvent, item: MixedItem) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { toast.info('请先登录'); return }
    if (item.type !== 'audiobook' && item.type !== 'music') {
      const mediaId = item.media?.id || (item.type === 'series' && item.series ? item.series.id : '')
      if (!mediaId) { toast.info('暂无法标记此内容'); return }
      const isWatched = watchedMap[mediaId] || false
      if (item.type === 'series' || (item.media && item.media.series_id)) {
        const seriesId = item.type === 'series' && item.series ? item.series.id : item.media?.series_id || ''
        try {
          const seasonsRes = await seriesApi.seasons(seriesId)
          const seasons = seasonsRes.data.data || []
          const allEpisodes = seasons.flatMap((s) => s.episodes || [])
          if (allEpisodes.length > 0) {
            await Promise.all(allEpisodes.map((ep) => {
              const duration = ep.duration || 3600
              return userApi.updateProgress(ep.id, isWatched ? 0 : duration, duration)
            }))
            setWatchedMap((prev) => ({ ...prev, [mediaId]: !isWatched }))
            toast.success(isWatched ? `已取消标记全部 ${allEpisodes.length} 集` : `已标记全部 ${allEpisodes.length} 集为已观看`)
          } else {
            toast.info('暂无剧集信息')
          }
        } catch { toast.error('操作失败') }
      } else if (item.media) {
        const duration = item.media.duration || 3600
        userApi.updateProgress(item.media.id, isWatched ? 0 : duration, duration).then(() => {
          setWatchedMap((prev) => ({ ...prev, [mediaId]: !isWatched }))
          toast.success(isWatched ? '已取消标记' : '已标记为已观看')
        }).catch(() => toast.error('操作失败'))
      }
    } else {
      toast.info('暂无法标记此内容')
    }
  }

  const handleMore = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMoreId(showMoreId === itemId ? null : itemId)
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

      <div className="relative overflow-x-hidden">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 transition-all"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}
            aria-label="scroll left"
          >
            <ChevronLeft size={20} className="text-theme-primary" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="scrollbar-hide flex gap-4 overflow-x-auto scroll-smooth pb-4"
        >
          {library.recentItems.map((item) => {
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

            return (
              <Link
                key={itemId}
                to={linkTo}
                className="media-card group w-[140px] flex-shrink-0 sm:w-[160px]"
              >
                <div className={`relative overflow-hidden rounded-xl ${library.type === 'music' ? 'aspect-square' : 'aspect-[2/3]'}`}>
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
                      onClick={(e) => handlePlayClick(e, item)}
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
                  {!isMusicType && (
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 rounded-b-xl px-2 py-3 pt-8 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <button
                        onClick={(e) => handleFavorite(e, itemId)}
                        className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
                        style={{ color: isFav ? '#EF4444' : '#ffffff' }}
                        title={isFav ? '取消收藏' : '加入收藏'}
                      >
                        <Heart size={20} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                      {!isAudiobookType && (
                        <button
                          onClick={(e) => handleMarkWatched(e, item)}
                          className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
                          style={{ color: isWatched ? '#22C55E' : '#ffffff' }}
                          title={isWatched ? '取消标记' : '标记为已观看'}
                        >
                          <Eye size={20} />
                        </button>
                      )}
                      <div className="relative">
                        <button
                          ref={showMoreId === itemId ? moreBtnRef : undefined}
                          onClick={(e) => handleMore(e, itemId)}
                          className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
                          style={{ color: '#ffffff' }}
                          title="更多"
                        >
                          <MoreHorizontal size={20} />
                        </button>
                        {showMoreId === itemId && createPortal(
                          <div ref={dropdownRef}>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMoreId(null) }} />
                            <div
                              className="fixed z-50 min-w-[200px] rounded-xl py-1 shadow-2xl"
                              style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--glass-border)',
                                backdropFilter: 'blur(20px)',
                                top: dropdownPos.top,
                                left: dropdownPos.left,
                                transform: 'translateX(-50%)',
                              }}
                            >
                              {isAdmin && (
                                <>
                                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>剧集管理</div>
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMoreId(null); navigate(detailTo) }}
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    <Link2 size={14} />
                                    手动匹配剧集
                                  </button>
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMoreId(null); navigate(detailTo) }}
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    <Unlink size={14} />
                                    解除匹配剧集
                                  </button>
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMoreId(null); navigate(detailTo) }}
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    <RefreshCw size={14} />
                                    刷新元数据
                                  </button>
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMoreId(null); navigate(detailTo) }}
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    <Pencil size={14} />
                                    编辑元数据
                                  </button>
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMoreId(null); navigate(detailTo) }}
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                                  >
                                    <Trash2 size={14} />
                                    删除剧集
                                  </button>
                                  <div className="my-1 mx-3 h-px" style={{ background: 'var(--border-default)' }} />
                                </>
                              )}
                              <button
                                onClick={(e) => {
                                  e.preventDefault(); e.stopPropagation(); setShowMoreId(null)
                                  const url = `${window.location.origin}${detailTo}`
                                  navigator.clipboard.writeText(url)
                                    .then(() => toast.success('链接已复制'))
                                    .catch(() => toast.error('复制失败'))
                                }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                <Share2 size={14} />
                                分享链接
                              </button>
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-1 py-2 text-center" style={{ background: 'transparent' }}>
                  <h3 className="truncate text-sm font-medium transition-colors group-hover:text-neon text-theme-primary">
                    {title}
                  </h3>
                  {year > 0 && (
                    <p className="mt-0.5 text-xs text-theme-secondary">{year}</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 transition-all"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}
            aria-label="scroll right"
          >
            <ChevronRight size={20} className="text-theme-primary" />
          </button>
        )}
      </div>
    </motion.section>
  )
}
