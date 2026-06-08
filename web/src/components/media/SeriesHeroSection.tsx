import { useState, useEffect, memo } from 'react'
import { Link } from 'react-router-dom'
import { streamApi } from '@/api'
import { useToast } from '@/components/Toast'
import type { Series, Media, Playlist } from '@/types'
import {
  Play,
  Star,
  Heart,
  Eye,
  Check,
  RefreshCw,
  MoreHorizontal,
  Share2,
  Link2,
  Unlink,
  Pencil,
  Trash2,
  ListPlus,
} from 'lucide-react'
import clsx from 'clsx'

interface SeriesHeroSectionProps {
  series: Series
  isFavorited: boolean
  isWatched?: boolean
  scraping: boolean
  isAdmin: boolean
  firstEpisode: Media | null
  posterVersion?: number
  playlists?: Playlist[]
  onFavorite: () => void
  onMarkWatched?: () => void
  onAddToPlaylist?: (playlistId: string) => void
  onRefreshMetadata: () => void
  onManualMatch: () => void
  onUnmatch: () => void
  onEditMetadata: () => void
  onDelete: () => void
}

export default memo(function SeriesHeroSection({
  series,
  isFavorited,
  isWatched,
  scraping,
  isAdmin,
  firstEpisode,
  posterVersion,
  playlists,
  onFavorite,
  onMarkWatched,
  onAddToPlaylist,
  onRefreshMetadata,
  onManualMatch,
  onUnmatch,
  onEditMetadata,
  onDelete,
}: SeriesHeroSectionProps) {
  const toast = useToast()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false)
  const [backdropError, setBackdropError] = useState(false)

  useEffect(() => {
    setLogoError(false)
    setImgLoaded(false)
    setBackdropError(false)
  }, [series])

  return (
    <div className="relative" style={{ background: 'var(--bg-base)' }}>
      {/* 背景图 - 延伸到顶部 */}
      <div className="relative overflow-hidden sm:h-[80vh]" style={{ background: 'var(--bg-base)', marginTop: '-64px', paddingTop: '64px' }}>
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
            {/* 标题 / Logo */}
            {!logoError ? (
              <div className="mb-1">
                <img
                  src={streamApi.getSeriesLogoUrl(series.id, posterVersion)}
                  alt={series.title}
                  loading="lazy"
                  className="max-h-20 sm:max-h-24 w-auto object-contain drop-shadow-lg"
                  onError={() => setLogoError(true)}
                />
              </div>
            ) : (
              <h1 className="font-display text-3xl font-bold tracking-wide drop-shadow-lg sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
                {series.title}
              </h1>
            )}
            {series.orig_title && series.orig_title !== series.title && (
              <p className="mt-1.5 text-base" style={{ color: 'var(--text-secondary)' }}>{series.orig_title}</p>
            )}

            {/* 霓虹分隔线 */}
            <div className="my-3 h-[2px] w-24 rounded-full" style={{
              background: 'linear-gradient(90deg, var(--neon-blue), var(--neon-purple), transparent)',
              boxShadow: '0 0 8px var(--neon-blue-30)',
            }} />

            {/* 操作按钮组 */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {/* 播放按钮 */}
              {firstEpisode && (
                <Link
                  to={`/play/${firstEpisode.id}`}
                  className="group relative inline-flex items-center gap-2.5 rounded-3xl px-8 py-3.5 text-base font-bold transition-all duration-300 hover:-translate-y-0.5"
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

              {/* 收藏 */}
              <button
                onClick={onFavorite}
                className={clsx(
                  'btn-icon',
                  isFavorited && 'text-pink-400 !bg-pink-500/[0.12] !border-pink-500/20'
                )}
                title={isFavorited ? '取消收藏' : '收藏'}
              >
                {isFavorited ? <Heart size={20} fill="currentColor" /> : <Heart size={20} />}
              </button>

              {/* 标记为已观看 */}
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
                    onClick={() => { setShowPlaylistMenu(!showPlaylistMenu); setShowMoreMenu(false) }}
                    className="btn-icon"
                    title="添加到播放列表"
                  >
                    <ListPlus size={20} />
                  </button>

                  {showPlaylistMenu && (
                    <div className="absolute left-0 top-full z-50 mt-2 min-w-[220px] rounded-xl py-1 shadow-2xl"
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
                            onClick={() => { onAddToPlaylist?.(pl.id); setShowPlaylistMenu(false) }}
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
                    </div>
                  )}
                </div>
              )}

              {/* 更多操作 */}
              <div className="relative">
                <button
                  onClick={() => { setShowMoreMenu(!showMoreMenu); setShowPlaylistMenu(false) }}
                  className="btn-icon"
                >
                  <MoreHorizontal size={20} />
                </button>

                {showMoreMenu && (
                  <div className="absolute left-0 top-full z-20 mt-2 min-w-[200px] rounded-xl py-1 shadow-2xl"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--glass-border)',
                      backdropFilter: 'blur(20px)',
                    }}
                  >
                    {isAdmin && (
                      <>
                        <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>剧集管理</div>
                        <button
                          onClick={() => { onManualMatch(); setShowMoreMenu(false) }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Link2 size={14} />
                          手动匹配剧集
                        </button>
                        <button
                          onClick={() => { onUnmatch(); setShowMoreMenu(false) }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Unlink size={14} />
                          解除匹配剧集
                        </button>
                        <button
                          onClick={() => { onRefreshMetadata(); setShowMoreMenu(false) }}
                          disabled={scraping}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5 disabled:opacity-50"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <RefreshCw size={14} className={clsx(scraping && 'animate-spin')} />
                          {scraping ? '刷新中...' : '刷新元数据'}
                        </button>
                        <button
                          onClick={() => { onEditMetadata(); setShowMoreMenu(false) }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Pencil size={14} />
                          编辑元数据
                        </button>
                        <button
                          onClick={() => { onDelete(); setShowMoreMenu(false) }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                          删除剧集
                        </button>
                        <div className="my-1 mx-3 h-px" style={{ background: 'var(--border-default)' }} />
                      </>
                    )}
                    {/* 通用操作 */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href)
                          .then(() => toast.success('链接已复制'))
                          .catch(() => toast.error('复制链接失败，请手动复制'))
                        setShowMoreMenu(false)
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Share2 size={14} />
                      分享链接
                    </button>
                  </div>
                )}
              </div>

              {/* 右侧元数据标签 */}
              <div className="ml-auto flex-col items-end gap-1.5 hidden lg:flex">
                <div className="flex flex-wrap items-center gap-2">
                  {series.rating > 0 && (
                    <span className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold text-yellow-400"
                      style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.15)' }}
                    >
                      <Star size={13} fill="currentColor" />
                      {series.rating.toFixed(1)}
                    </span>
                  )}
                  {series.year > 0 && (
                    <span className="rounded-lg px-2.5 py-1 text-sm"
                      style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                    >
                      {series.year}
                    </span>
                  )}
                  <span className="rounded-lg px-2.5 py-1 text-sm"
                    style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                  >
                    {series.season_count} 季 · {series.episode_count} 集
                  </span>
                  {series.genres && series.genres.split(',').slice(0, 3).map((g) => (
                    <Link key={g} to={`/search?q=${encodeURIComponent(g.trim())}`}
                      className="rounded-lg px-2.5 py-1 text-sm transition-all duration-200 hover:scale-[1.04] hover:brightness-125 cursor-pointer"
                      style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                    >
                      {g.trim()}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* 移动端元数据标签 */}
            <div className="mb-3 flex flex-wrap items-center gap-2 lg:hidden">
              {series.rating > 0 && (
                <span className="flex items-center gap-1 text-sm font-bold text-yellow-400">
                  <Star size={14} fill="currentColor" />
                  {series.rating.toFixed(1)}
                </span>
              )}
              {series.year > 0 && (
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{series.year}</span>
              )}
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {series.season_count} 季 · {series.episode_count} 集
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 点击空白关闭弹出菜单 */}
      {(showMoreMenu || showPlaylistMenu) && (
        <div className="fixed inset-0 z-10" onClick={() => { setShowMoreMenu(false); setShowPlaylistMenu(false) }} />
      )}
    </div>
  )
})
