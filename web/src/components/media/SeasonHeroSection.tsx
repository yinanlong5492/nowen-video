import { useState, useEffect, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { streamApi } from '@/api'
import { useToast } from '@/components/Toast'
import type { Series, Playlist } from '@/types'
import { Play, Star, MoreHorizontal, RefreshCw, Heart, Eye, Check, Share2, Link2, Unlink, Pencil, Trash2, ListPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

interface SeasonHeroSectionProps {
  series: Series
  seasonNum: number
  episodeCount: number
  posterVersion?: number
  firstEpisodeId?: string
  overview?: string
  isAdmin?: boolean
  showMoreMenu?: boolean
  showPlaylistMenu?: boolean
  playlists?: Playlist[]
  onToggleMoreMenu?: () => void
  onTogglePlaylistMenu?: () => void
  onRefreshMetadata?: () => void
  onManualMatch?: () => void
  onUnmatch?: () => void
  onEditMetadata?: () => void
  onDelete?: () => void
  isFavorite?: boolean
  isWatched?: boolean
  onToggleFavorite?: () => void
  onMarkWatched?: () => void
  onAddToPlaylist?: (playlistId: string) => void
}

export default memo(function SeasonHeroSection({
  series,
  seasonNum,
  episodeCount,
  posterVersion,
  firstEpisodeId,
  overview,
  isAdmin,
  showMoreMenu,
  showPlaylistMenu,
  playlists,
  onToggleMoreMenu,
  onTogglePlaylistMenu,
  onRefreshMetadata,
  onManualMatch,
  onUnmatch,
  onEditMetadata,
  onDelete,
  isFavorite,
  isWatched,
  onToggleFavorite,
  onMarkWatched,
  onAddToPlaylist,
}: SeasonHeroSectionProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [posterError, setPosterError] = useState(false)
  const [backdropError, setBackdropError] = useState(false)

  useEffect(() => {
    setImgLoaded(false)
    setPosterError(false)
    setBackdropError(false)
  }, [series.id, seasonNum])

  return (
    <div className="relative" style={{ background: 'var(--bg-base)' }}>
      {/* 背景图 */}
      <div className="relative overflow-hidden sm:h-[80vh]" style={{ background: 'var(--bg-base)' }}>
        <div className="absolute inset-0" style={{ background: 'var(--bg-surface)' }}>
          <img
            src={streamApi.getSeriesPosterUrl(series.id, posterVersion)}
            alt=""
            className="h-full w-full object-cover opacity-15 blur-2xl scale-110"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          {!backdropError && (
            <img
              src={streamApi.getSeriesBackdropUrl(series.id, posterVersion)}
              alt=""
              loading="lazy"
              className={clsx(
                'absolute inset-0 h-full w-full object-cover transition-all duration-1000',
                imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              )}
              onLoad={() => setImgLoaded(true)}
              onError={() => { setBackdropError(true); setImgLoaded(true) }}
            />
          )}
        </div>
        <div className="absolute inset-0 gradient-overlay" />
      </div>

      {/* 信息叠加层 */}
      <div className="relative -mt-48 px-4 pb-2 sm:px-6 lg:px-8">
        <div className="mx-auto">
          <div className="flex min-w-0 flex-col justify-end">
            {/* 季海报大图 + 季信息并行布局 */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {/* 季海报 */}
              <div
                className="relative w-36 flex-shrink-0 overflow-hidden rounded-xl sm:w-44"
                style={{
                  aspectRatio: '2/3',
                  background: 'var(--bg-surface)',
                  border: '2px solid var(--border-default)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                }}
              >
                {!posterError ? (
                  <img
                    src={streamApi.getSeasonPosterUrl(series.id, seasonNum)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={() => setPosterError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    无海报
                  </div>
                )}
              </div>

              {/* 季信息 */}
              <div className="flex flex-col justify-end pb-1">
                {/* 剧集标题 */}
                <h1 className="font-display text-2xl font-bold tracking-wide drop-shadow-lg sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
                  {series.title}
                </h1>
                {/* 季标题（副标题） */}
                <div className="mt-1 text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {seasonNum === 0 ? '特别篇' : `第 ${seasonNum} 季`}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span>{episodeCount} 集</span>
                  {series.year > 0 && (
                    <>
                      <span className="opacity-40">·</span>
                      <span>{series.year}</span>
                    </>
                  )}
                  {series.rating > 0 && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="inline-flex items-center gap-1 font-bold text-yellow-400">
                        <Star size={13} fill="currentColor" />
                        {series.rating.toFixed(1)}
                      </span>
                    </>
                  )}
                </div>

                {/* 播放按钮 + 收藏 + 更多 */}
                <div className="mt-3 flex items-center gap-2">
                  {firstEpisodeId && (
                    <Link
                      to={`/play/${firstEpisodeId}`}
                      className="group inline-flex items-center gap-2.5 self-start rounded-3xl px-6 py-3 text-base font-bold transition-all duration-300 hover:-translate-y-0.5"
                      style={{
                        background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-blue-mid))',
                        boxShadow: 'var(--shadow-neon), 0 4px 15px var(--neon-blue-15)',
                        color: 'var(--text-on-neon)',
                      }}
                    >
                      <Play size={22} fill="currentColor" />
                      播放
                    </Link>
                  )}
                  {/* 收藏按钮 */}
                  {onToggleFavorite && (
                    <button
                      onClick={onToggleFavorite}
                      className={clsx(
                        'btn-icon',
                        isFavorite && 'text-pink-400 !bg-pink-500/[0.12] !border-pink-500/20'
                      )}
                    >
                      <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  )}
                  {onMarkWatched && (
                    <button
                      onClick={onMarkWatched}
                      className={clsx(
                        'btn-icon',
                        isWatched ? 'bg-green-500/15 text-green-400 border-green-500/30' : ''
                      )}
                      title={isWatched ? '取消标记已观看' : '标记为已观看'}
                    >
                      {isWatched ? <Check size={20} fill="currentColor" /> : <Eye size={20} />}
                    </button>
                  )}
                  {/* 添加到播放列表 */}
                  {playlists && onAddToPlaylist && (
                    <div className="relative">
                      <button
                        onClick={onTogglePlaylistMenu}
                        className="btn-icon"
                        title="添加到播放列表"
                      >
                        <ListPlus size={20} />
                      </button>
                      <AnimatePresence>
                        {showPlaylistMenu && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={onTogglePlaylistMenu}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: -8, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-xl py-1 shadow-2xl"
                              style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--glass-border)',
                                backdropFilter: 'blur(20px)',
                              }}
                            >
                              <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>播放列表</div>
                              {playlists.length === 0 ? (
                                <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>暂无播放列表</div>
                              ) : (
                                playlists.map((pl) => (
                                  <button
                                    key={pl.id}
                                    onClick={() => { onAddToPlaylist?.(pl.id); onTogglePlaylistMenu?.() }}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    <ListPlus size={14} />
                                    {pl.name}
                                    {pl.items?.some(item => item.media_id === series.id) && (
                                      <Check size={14} className="ml-auto" style={{ color: 'var(--neon-blue)' }} />
                                    )}
                                  </button>
                                ))
                              )}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="relative">
                      <button
                        onClick={onToggleMoreMenu}
                        className="btn-icon"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      <AnimatePresence>
                        {showMoreMenu && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={onToggleMoreMenu}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: -8, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-xl py-1 shadow-2xl"
                              style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--glass-border)',
                                backdropFilter: 'blur(20px)',
                              }}
                            >
                              <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>剧集管理</div>
                              <button
                                onClick={() => { onManualMatch ? onManualMatch() : navigate(`/series/${series.id}`); onToggleMoreMenu?.() }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                <Link2 size={14} />
                                手动匹配剧集
                              </button>
                              <button
                                onClick={() => { onUnmatch ? onUnmatch() : navigate(`/series/${series.id}`); onToggleMoreMenu?.() }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                <Unlink size={14} />
                                解除匹配剧集
                              </button>
                              <button
                                onClick={() => { onRefreshMetadata?.(); onToggleMoreMenu?.() }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                <RefreshCw size={14} />
                                刷新元数据
                              </button>
                              <button
                                onClick={() => { onEditMetadata ? onEditMetadata() : navigate(`/series/${series.id}`); onToggleMoreMenu?.() }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                <Pencil size={14} />
                                编辑元数据
                              </button>
                              <button
                                onClick={() => { onDelete ? onDelete() : navigate(`/series/${series.id}`); onToggleMoreMenu?.() }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                              >
                                <Trash2 size={14} />
                                删除本季
                              </button>
                              <div className="my-1 mx-3 h-px" style={{ background: 'var(--border-default)' }} />
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/series/${series.id}`
                                  navigator.clipboard.writeText(url)
                                    .then(() => toast.success('链接已复制'))
                                    .catch(() => toast.error('复制失败'))
                                  onToggleMoreMenu?.()
                                }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                <Share2 size={14} />
                                分享链接
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* 剧情简介 */}
                {overview && (
                  <div className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {overview}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
