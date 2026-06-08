import { useState, useRef, useCallback, useLayoutEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { streamApi } from '@/api'
import type { SeasonInfo } from '@/types'
import { Play, Tv, Heart, Eye, MoreHorizontal, Share2, RefreshCw, Link2, Unlink, Pencil, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/components/Toast'
import { createPortal } from 'react-dom'
import HorizontalScroll from '@/components/common/HorizontalScroll'

interface SeasonGridProps {
  seriesId: string
  seasons: SeasonInfo[]
  isFavorited?: boolean
  watchedSeasonNums?: Set<number>
  onFavorite?: () => void
  onMarkSeasonWatched?: (seasonNum: number, watched: boolean) => Promise<void>
  onRefreshSeasonMetadata?: (seasonNum: number) => void
  onEditSeasonMetadata?: (seasonNum: number) => void
  onMatchSeason?: (seasonNum: number) => void
  onUnmatchSeason?: (seasonNum: number) => void
  onDeleteSeason?: (seasonNum: number) => void
}

function SeasonCard({
  seriesId,
  season,
  isFavorited,
  isSeasonWatched,
  onFavorite,
  onMarkSeasonWatched,
  onRefreshSeasonMetadata,
  onEditSeasonMetadata,
  onMatchSeason,
  onUnmatchSeason,
  onDeleteSeason,
}: {
  seriesId: string
  season: SeasonInfo
  isFavorited?: boolean
  isSeasonWatched?: boolean
  onFavorite?: () => void
  onMarkSeasonWatched?: (seasonNum: number, watched: boolean) => Promise<void>
  onRefreshSeasonMetadata?: (seasonNum: number) => void
  onEditSeasonMetadata?: (seasonNum: number) => void
  onMatchSeason?: (seasonNum: number) => void
  onUnmatchSeason?: (seasonNum: number) => void
  onDeleteSeason?: (seasonNum: number) => void
}) {
  const [imgError, setImgError] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  const hasLocalPoster = !!season.poster_path
  const showEpisodeFallback = !hasLocalPoster && season.episodes[0]?.poster_path && !imgError
  const showPlaceholder = !hasLocalPoster && !season.episodes[0]?.poster_path

  useLayoutEffect(() => {
    if (showMore && moreBtnRef.current) {
      const rect = moreBtnRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
      })
    }
  }, [showMore])

  const handleFavorite = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onFavorite?.()
  }, [onFavorite])

  const handleMarkSeasonWatched = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { toast.info('请先登录'); return }
    if (!onMarkSeasonWatched) return
    try {
      await onMarkSeasonWatched(season.season_num, !isSeasonWatched)
    } catch {
      toast.error('操作失败')
    }
  }, [user, season.season_num, isSeasonWatched, onMarkSeasonWatched, toast])

  const handleMore = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMore(!showMore)
  }, [showMore])

  const seasonDetailUrl = `/series/${seriesId}/season/${season.season_num}`

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    navigate(seasonDetailUrl)
  }, [navigate, seasonDetailUrl])

  return (
    <div
      className="group flex flex-col overflow-hidden transition-all duration-300 cursor-pointer w-36 flex-shrink-0"
      onClick={handleCardClick}
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden">
        {hasLocalPoster && !imgError && (
          <img
            src={streamApi.getSeasonPosterUrl(seriesId, season.season_num)}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
        {showEpisodeFallback && (
          <img
            src={streamApi.getPosterUrl(season.episodes[0].id)}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
        {showPlaceholder && (
          <div className="flex h-full w-full items-center justify-center" style={{ color: 'var(--text-muted)' }}>
            <Tv size={28} />
          </div>
        )}

        {/* 悬浮暗色遮罩 + 播放按钮 */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Link
            to={`/series/${seriesId}/season/${season.season_num}`}
            onClick={(e) => e.stopPropagation()}
            className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 hover:scale-125"
            style={{
              background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
              boxShadow: '0 0 12px var(--neon-blue-40)',
            }}
          >
            <Play size={22} className="ml-0.5 text-white" fill="white" />
          </Link>
        </div>

        {/* 底部按钮栏 */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-1.5 rounded-b-xl px-2 py-3 pt-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
          }}
        >
          <button
            onClick={handleFavorite}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
            style={{ color: isFavorited ? '#EF4444' : '#ffffff' }}
            title={isFavorited ? '取消收藏' : '加入收藏'}
          >
            <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleMarkSeasonWatched}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
            style={{ color: isSeasonWatched ? '#22C55E' : '#ffffff' }}
            title={isSeasonWatched ? '取消标记' : '标记为已观看'}
          >
            <Eye size={20} />
          </button>
          <div className="relative">
            <button
              ref={moreBtnRef}
              onClick={handleMore}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
              style={{ color: '#ffffff' }}
              title="更多"
            >
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* 季号标签 */}
        <div
          className="absolute right-0 top-0 z-10 rounded-bl-xl px-2 py-1 text-xs font-bold"
          style={{
            background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
            color: 'var(--text-on-neon)',
          }}
        >
          S{season.season_num}
        </div>
      </div>

      {/* 季信息 */}
      <div className="flex flex-1 flex-col p-2.5 text-center">
        <h4 className="text-sm font-medium line-clamp-1 transition-colors group-hover:text-neon" style={{ color: 'var(--text-primary)' }}>
          {season.season_num === 0 ? '特别篇' : `第 ${season.season_num} 季`}
        </h4>
        <div className="mt-1 flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {season.year > 0 && <span>{season.year}</span>}
          <span>{season.episode_count} 集</span>
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
                <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>季管理</div>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onMatchSeason?.(season.season_num) }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Link2 size={14} />
                  手动匹配本季
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onUnmatchSeason?.(season.season_num) }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Unlink size={14} />
                  解除匹配本季
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onRefreshSeasonMetadata?.(season.season_num) }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <RefreshCw size={14} />
                  刷新季元数据
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onEditSeasonMetadata?.(season.season_num) }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Pencil size={14} />
                  编辑季信息
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onDeleteSeason?.(season.season_num) }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 size={14} />
                  删除本季
                </button>
                <div className="my-1 mx-3 h-px" style={{ background: 'var(--border-default)' }} />
              </>
            )}
            <button
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation(); setShowMore(false)
                const url = `${window.location.origin}/series/${seriesId}/season/${season.season_num}`
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
  )
}

export default function SeasonGrid({
  seriesId,
  seasons,
  isFavorited,
  watchedSeasonNums,
  onFavorite,
  onMarkSeasonWatched,
  onRefreshSeasonMetadata,
  onEditSeasonMetadata,
  onMatchSeason,
  onUnmatchSeason,
  onDeleteSeason,
}: SeasonGridProps) {
  if (seasons.length === 0) return null

  // 使用 HorizontalScroll 实现滚动功能，支持网格模式
  return (
    <HorizontalScroll
      title="季列表"
      itemCount={seasons.length}
      gridCols={3}
      gridGap="gap-4"
    >
      {seasons.map((season) => (
        <SeasonCard
          key={season.season_num}
          seriesId={seriesId}
          season={season}
          isFavorited={isFavorited}
          isSeasonWatched={watchedSeasonNums?.has(season.season_num)}
          onFavorite={onFavorite}
          onMarkSeasonWatched={onMarkSeasonWatched}
          onRefreshSeasonMetadata={onRefreshSeasonMetadata}
          onEditSeasonMetadata={onEditSeasonMetadata}
          onMatchSeason={onMatchSeason}
          onUnmatchSeason={onUnmatchSeason}
          onDeleteSeason={onDeleteSeason}
        />
      ))}
    </HorizontalScroll>
  )
}