import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { streamApi, userApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/components/Toast'
import type { Media, WatchHistory } from '@/types'
import { Play, Check, Heart, Eye, MoreHorizontal, Share2, RefreshCw, Link2, Unlink, Pencil, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { createPortal } from 'react-dom'

function formatDuration(seconds: number): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m}分钟`
  return `${m}分钟`
}

interface EpisodeSlideCardProps {
  episode: Media
  historyRecord?: WatchHistory
  seriesId?: string
  seasonNum?: number
  onManualMatch?: () => void
  onUnmatch?: () => void
  onRefreshMetadata?: () => void
  onEditMetadata?: () => void
  onDelete?: () => void
}

const GRADIENT_BG = 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))'

export default function EpisodeSlideCard({ episode: ep, historyRecord, seriesId, seasonNum, onManualMatch, onUnmatch, onRefreshMetadata, onEditMetadata, onDelete }: EpisodeSlideCardProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const [imgError, setImgError] = useState(false)
  const [seasonFallbackError, setSeasonFallbackError] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  const seasonNum_ = seasonNum ?? ep.season_num

  const watchStatus = useMemo(() => {
    if (!historyRecord) return { watched: false, progress: 0 }
    return {
      watched: historyRecord.completed || (historyRecord.duration > 0 && historyRecord.position / historyRecord.duration > 0.9),
      progress: historyRecord.duration > 0 ? Math.round((historyRecord.position / historyRecord.duration) * 100) : 0,
    }
  }, [historyRecord])

  useLayoutEffect(() => {
    if (showMore && moreBtnRef.current) {
      const rect = moreBtnRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
      })
    }
  }, [showMore])

  useEffect(() => {
    setIsWatched(watchStatus.watched)
  }, [watchStatus.watched])

  useEffect(() => {
    if (!user) return
    userApi.checkFavorite(ep.id).then((res) => {
      setIsFavorited(res.data.data)
    }).catch(() => {})
  }, [ep.id, user])

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) { toast.info('请先登录'); return }
    const apiCall = isFavorited ? userApi.removeFavorite(ep.id) : userApi.addFavorite(ep.id)
    apiCall.then(() => {
      setIsFavorited(!isFavorited)
      toast.success(isFavorited ? '已取消收藏' : '已加入收藏')
    }).catch(() => toast.error('操作失败'))
  }

  const handleMarkWatched = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) { toast.info('请先登录'); return }
    const duration = ep.duration || 3600
    if (isWatched) {
      userApi.updateProgress(ep.id, 0, duration).then(() => {
        setIsWatched(false)
        toast.success('已取消标记')
      }).catch(() => toast.error('操作失败'))
    } else {
      userApi.updateProgress(ep.id, duration, duration).then(() => {
        setIsWatched(true)
        toast.success('已标记为已观看')
      }).catch(() => toast.error('操作失败'))
    }
  }

  const handleMore = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMore(!showMore)
  }

  const epLabel = useMemo(
    () => `第${ep.season_num}季第${ep.episode_num}集${ep.episode_title ? ` ${ep.episode_title}` : ''}`,
    [ep.season_num, ep.episode_num, ep.episode_title],
  )

  const durationText = useMemo(() => formatDuration(ep.duration), [ep.duration])
  const hasDuration = ep.duration > 0

  const handleCardClick = () => navigate(`/media/${ep.id}`)

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/play/${ep.id}`)
  }

  return (
    <div
      onClick={handleCardClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick() }}
      className="group flex-shrink-0 cursor-pointer overflow-hidden transition-all duration-300"
      style={{ width: 'calc((100% - 3.75rem) / 6)', minWidth: '160px', scrollSnapAlign: 'start' }}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl" style={{ background: 'var(--bg-surface)' }}>
        {!imgError ? (
          <img
            src={streamApi.getPosterUrl(ep.id)}
            alt={ep.title || '剧集海报'}
            loading="lazy"
            onLoad={(e) => {
              const img = e.target as HTMLImageElement
              if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
                setImgError(true)
              }
            }}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : seriesId && seasonNum_ && !seasonFallbackError ? (
          <img
            src={streamApi.getSeasonPosterUrl(seriesId, seasonNum_)}
            alt="季海报"
            loading="lazy"
            onError={() => setSeasonFallbackError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ color: 'var(--text-muted)' }}>
            <Play size={28} aria-label="无海报" />
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <button
            onClick={handlePlay}
            aria-label={`播放 ${epLabel}`}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: GRADIENT_BG, boxShadow: '0 0 12px var(--neon-blue-40)' }}
          >
            <Play size={18} className="ml-0.5 text-white" fill="white" />
          </button>
        </div>

        <div className="absolute left-1.5 top-1.5">
          <span className="badge-neon text-[10px]">
            E{String(ep.episode_num).padStart(2, '0')}
          </span>
        </div>

        {watchStatus.watched && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: GRADIENT_BG }}>
              <Check size={16} className="text-white" aria-label="已观看" />
            </div>
          </div>
        )}

        {!watchStatus.watched && watchStatus.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div className="h-full" style={{
              width: `${watchStatus.progress}%`,
              background: 'linear-gradient(90deg, var(--neon-blue), var(--neon-purple))',
              boxShadow: '0 0 6px var(--neon-blue-30)',
            }} />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 rounded-b-xl bg-gradient-to-t from-black/90 via-black/60 to-transparent px-2 py-3 pt-6 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <button
            onClick={handleFavorite}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
            style={{ color: isFavorited ? '#EF4444' : 'rgba(255,255,255,0.85)' }}
            title={isFavorited ? '取消收藏' : '加入收藏'}
          >
            <Heart size={15} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleMarkWatched}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
            style={{ color: isWatched ? 'var(--neon-blue)' : 'rgba(255,255,255,0.85)' }}
            title={isWatched ? '取消已看' : '标记为已观看'}
          >
            <Eye size={15} />
          </button>
          <div className="relative">
            <button
              ref={moreBtnRef}
              onClick={handleMore}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.85)' }}
              title="更多"
            >
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>

        {/* 更多下拉菜单 (Portal) */}
        {showMore && createPortal(
          <div ref={dropdownRef}>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false) }}
            />
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
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>管理本集</div>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onManualMatch?.() }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Link2 size={14} />
                    手动匹配
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onUnmatch?.() }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Unlink size={14} />
                    解除匹配
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onRefreshMetadata?.() }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <RefreshCw size={14} />
                    刷新元数据
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onEditMetadata?.() }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Pencil size={14} />
                    编辑元数据
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onDelete?.() }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                    删除本集
                  </button>
                  <div className="my-1 mx-3 h-px" style={{ background: 'var(--border-default)' }} />
                </>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault(); e.stopPropagation(); setShowMore(false)
                  const url = `${window.location.origin}/media/${ep.id}`
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

      <div className="p-2.5">
        <h4
          title={epLabel}
          className={clsx('truncate text-sm font-medium transition-colors group-hover:text-neon')}
          style={{ color: watchStatus.watched ? 'var(--text-muted)' : 'var(--text-primary)' }}
        >
          {epLabel}
        </h4>
        <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {watchStatus.watched && <span className="text-green-400/70">✓ 已看</span>}
          {!watchStatus.watched && watchStatus.progress > 0 && (
            <span className="text-neon/60">{watchStatus.progress}%</span>
          )}
          {ep.resolution && <span className="badge-neon !py-0 text-xs">{ep.resolution}</span>}
        </div>
        {ep.overview && (
          <p title={ep.overview} className="mt-1 line-clamp-2 text-xs leading-relaxed"
            style={{ color: 'var(--text-tertiary)' }}>
            {ep.overview}
          </p>
        )}
        {hasDuration && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{durationText}</p>
        )}
      </div>
    </div>
  )
}
