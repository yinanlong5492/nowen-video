import { useState, useRef, useLayoutEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { mediaApi, userApi, seriesApi } from '@/api'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n'
import { useSmoothScroll } from '@/hooks/useSmoothScroll'
import { useAuthStore } from '@/stores/auth'
import { formatProgress } from '@/utils/format'
import type { WatchHistory } from '@/types'
import { Play, ChevronLeft, ChevronRight, Heart, Eye, MoreHorizontal, Share2, Link2, Unlink, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import { streamApi } from '@/api'
import { motion } from 'framer-motion'
import { staggerContainerVariants, staggerItemVariants } from '@/lib/motion'
import { createPortal } from 'react-dom'

interface Props {
  items: WatchHistory[]
  title: string
}

export default function ContinueWatchingRow({ items, title }: Props) {
  const { scrollRef, canScrollLeft, canScrollRight, scroll } = useSmoothScroll<HTMLDivElement>(0.7, items.length)
  const toast = useToast()
  const { t } = useTranslation()
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

  const handleMarkWatched = async (e: React.MouseEvent, item: WatchHistory) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { toast.info('请先登录'); return }
    const isWatched = watchedMap[item.media_id] || false
    if (item.media.series_id) {
      try {
        const seasonsRes = await seriesApi.seasons(item.media.series_id)
        const seasons = seasonsRes.data.data || []
        const allEpisodes = seasons.flatMap((s) => s.episodes || [])
        if (allEpisodes.length > 0) {
          await Promise.all(allEpisodes.map((ep) => {
            const duration = ep.duration || 3600
            return userApi.updateProgress(ep.id, isWatched ? 0 : duration, duration)
          }))
          setWatchedMap((prev) => ({ ...prev, [item.media_id]: !isWatched }))
          toast.success(isWatched ? `已取消标记全部 ${allEpisodes.length} 集` : `已标记全部 ${allEpisodes.length} 集为已观看`)
        } else {
          toast.info('暂无剧集信息')
        }
      } catch { toast.error('操作失败') }
    } else {
      const duration = item.media.duration || 3600
      userApi.updateProgress(item.media_id, isWatched ? 0 : duration, duration).then(() => {
        setWatchedMap((prev) => ({ ...prev, [item.media_id]: !isWatched }))
        toast.success(isWatched ? '已取消标记' : '已标记为已观看')
      }).catch(() => toast.error('操作失败'))
    }
  }

  const handleMore = (e: React.MouseEvent, mediaId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMoreId(showMoreId === mediaId ? null : mediaId)
  }

  return (
    <motion.section
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h2
        variants={staggerItemVariants}
        className="mb-5 font-display text-xl font-bold tracking-wide text-theme-primary"
      >
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
          {items.map((item) => {
            const percent = formatProgress(item.position, item.duration)
            const displayTitle = item.media.media_type === 'episode' && item.media.series
              ? `${item.media.series.title} S${String(item.media.season_num || 0).padStart(2, '0')}E${String(item.media.episode_num || 0).padStart(2, '0')}`
              : item.media.title
            const detailTo = item.media.series_id ? `/series/${item.media.series_id}` : `/media/${item.media_id}`
            const isFav = favoritedMap[item.media_id] || false
            const isWatched = watchedMap[item.media_id] || false
            return (
              <motion.div key={item.id} variants={staggerItemVariants} className="flex-shrink-0">
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
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 rounded-b-xl px-2 py-3 pt-8 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <button
                        onClick={(e) => handleFavorite(e, item.media_id)}
                        className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
                        style={{ color: isFav ? '#EF4444' : '#ffffff' }}
                        title={isFav ? '取消收藏' : '加入收藏'}
                      >
                        <Heart size={20} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={(e) => handleMarkWatched(e, item)}
                        className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
                        style={{ color: isWatched ? '#22C55E' : '#ffffff' }}
                        title={isWatched ? '取消标记' : '标记为已观看'}
                      >
                        <Eye size={20} />
                      </button>
                      <div className="relative">
                        <button
                          ref={showMoreId === item.media_id ? moreBtnRef : undefined}
                          onClick={(e) => handleMore(e, item.media_id)}
                          className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
                          style={{ color: '#ffffff' }}
                          title="更多"
                        >
                          <MoreHorizontal size={20} />
                        </button>
                        {showMoreId === item.media_id && createPortal(
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
                    <p className="mt-1 text-[11px] text-theme-tertiary">
                      {t('home.watched', { percent: String(percent) })}
                    </p>
                  </div>
                </Link>
              </motion.div>
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
