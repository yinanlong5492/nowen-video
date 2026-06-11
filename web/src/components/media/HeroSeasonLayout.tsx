import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Heart, Eye, ListPlus, MoreHorizontal, Check, Star, Link2, Unlink, RefreshCw, Pencil, Trash2, Share2 } from 'lucide-react'
import clsx from 'clsx'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n'
import type { Playlist, Series } from '@/types'

interface HeroSeasonLayoutProps {
  series: Series
  seasonNum: number
  firstEpisodeId?: string
  overview?: string | null
  posterUrl: string
  title: string
  seasonTitle: string
  seasonInfo: string
  year?: number
  rating?: number
  isFavorited: boolean
  isWatched?: boolean
  scraping?: boolean
  isAdmin: boolean
  playlists?: Playlist[]
  onFavorite: () => void
  onMarkWatched?: () => void
  onAddToPlaylist?: (playlistId: string) => void
  onManualMatch?: () => void
  onUnmatch?: () => void
  onRefreshMetadata?: () => void
  onEditMetadata?: () => void
  onDelete?: () => void
  showMoreMenu?: boolean
  showPlaylistMenu?: boolean
  onToggleMoreMenu?: () => void
  onTogglePlaylistMenu?: () => void
}

export function HeroSeasonLayout({
  series,
  seasonNum,
  firstEpisodeId,
  overview,
  posterUrl,
  title,
  seasonTitle,
  seasonInfo,
  year,
  rating,
  isFavorited,
  isWatched,
  scraping,
  isAdmin,
  playlists,
  onFavorite,
  onMarkWatched,
  onAddToPlaylist,
  onManualMatch,
  onUnmatch,
  onRefreshMetadata,
  onEditMetadata,
  onDelete,
  showMoreMenu = false,
  showPlaylistMenu = false,
  onToggleMoreMenu,
  onTogglePlaylistMenu,
}: HeroSeasonLayoutProps) {
  const toast = useToast()
  const { t } = useTranslation()
  const [posterError, setPosterError] = useState(false)

  const playUrl = firstEpisodeId ? `/play/${firstEpisodeId}` : ''

  const closePlaylistMenu = () => {
    if (onTogglePlaylistMenu && showPlaylistMenu) {
      onTogglePlaylistMenu()
    }
  }

  const closeMoreMenu = () => {
    if (onToggleMoreMenu && showMoreMenu) {
      onToggleMoreMenu()
    }
  }

  const handleAddToPlaylist = (playlistId: string) => {
    onAddToPlaylist?.(playlistId)
    closePlaylistMenu()
  }

  const shareLink = () => {
    const url = `${window.location.origin}/series/${series.id}/season/${seasonNum}`
    navigator.clipboard.writeText(url)
      .then(() => toast.success(t('hero.linkCopied')))
      .catch(() => toast.error(t('hero.copyFailed')))
    closeMoreMenu()
  }

  return (
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
            src={posterUrl}
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
          {title}
        </h1>
        {/* 季标题 */}
        {seasonTitle && (
          <div className="mt-1 text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            {seasonTitle}
          </div>
        )}
        {/* 元数据标签 */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {seasonInfo && <span>{seasonInfo}</span>}
          {year && year > 0 && (
            <>
              <span className="opacity-40">·</span>
              <span>{year}</span>
            </>
          )}
          {rating && rating > 0 && (
            <>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1 font-bold text-yellow-400">
                <Star size={13} fill="currentColor" />
                {rating.toFixed(1)}
              </span>
            </>
          )}
        </div>

        {/* 操作按钮组 */}
        <div className="mt-3 flex items-center gap-2">
          {playUrl && (
            <Link
              to={playUrl}
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

          {/* 收藏 */}
          <button
            onClick={onFavorite}
            className={clsx(
              'btn-icon',
              isFavorited && 'text-pink-400 !bg-pink-500/[0.12] !border-pink-500/20'
            )}
            title={isFavorited ? t('media.removeFavorite') : t('media.addFavorite')}
          >
            <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>

          {/* 标记已观看 */}
          {onMarkWatched && (
            <button
              onClick={onMarkWatched}
              className={clsx(
                'btn-icon',
                isWatched ? 'bg-green-500/15 text-green-400 border-green-500/30' : ''
              )}
              title={isWatched ? '取消标记已观看' : t('hero.markWatched') || '标记为已观看'}
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
                title={t('hero.addToPlaylist')}
              >
                <ListPlus size={20} />
              </button>

              {showPlaylistMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { closePlaylistMenu(); closeMoreMenu(); }} aria-hidden="true" />
                  <div className="absolute left-0 top-full z-50 mt-2 min-w-[220px] rounded-xl py-1 shadow-2xl animate-scale-in"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--glass-border)',
                      backdropFilter: 'blur(20px)',
                    }}
                  >
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{t('hero.playlists')}</div>
                    {playlists.length === 0 ? (
                      <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{t('hero.noPlaylists')}</div>
                    ) : (
                      playlists.map((pl) => (
                        <button
                          key={pl.id}
                          onClick={() => handleAddToPlaylist(pl.id)}
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
                </>
              )}
            </div>
          )}

          {/* 更多操作 */}
          {isAdmin && (
            <div className="relative">
              <button
                onClick={onToggleMoreMenu}
                className="btn-icon"
              >
                <MoreHorizontal size={20} />
              </button>

              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { closeMoreMenu(); closePlaylistMenu(); }} aria-hidden="true" />
                  <div className="absolute left-0 top-full z-50 mt-2 min-w-[200px] rounded-xl py-1 shadow-2xl animate-scale-in"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--glass-border)',
                      backdropFilter: 'blur(20px)',
                    }}
                  >
                    <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>管理本季</div>
                    <button
                      onClick={() => { onManualMatch?.(); closeMoreMenu() }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Link2 size={14} />
                      手动匹配
                    </button>
                    <button
                      onClick={() => { onUnmatch?.(); closeMoreMenu() }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Unlink size={14} />
                      解除匹配
                    </button>
                    <button
                      onClick={() => { onRefreshMetadata?.(); closeMoreMenu() }}
                      disabled={scraping}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5 disabled:opacity-50"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <RefreshCw size={14} className={clsx(scraping && 'animate-spin')} />
                      刷新元数据
                    </button>
                    <button
                      onClick={() => { onEditMetadata?.(); closeMoreMenu() }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Pencil size={14} />
                      编辑元数据
                    </button>
                    <button
                      onClick={() => { onDelete?.(); closeMoreMenu() }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                      删除本季
                    </button>
                    <div className="my-1 mx-3 h-px" style={{ background: 'var(--border-default)' }} />
                    <button
                      onClick={shareLink}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Share2 size={14} />
                      {t('hero.shareLink')}
                    </button>
                  </div>
                </>
              )}
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
  )
}