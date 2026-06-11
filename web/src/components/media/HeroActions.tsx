import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Play, Heart, Eye, ListPlus, MoreHorizontal, Check } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'
import type { Playlist } from '@/types'
import { formatDurationShort } from '@/utils/format'

interface HeroActionsProps {
  playUrl?: string
  isFavorited: boolean
  isWatched?: boolean
  scraping?: boolean
  isAdmin: boolean
  playlists?: Playlist[]
  watchProgressPosition?: number
  onFavorite: () => void
  onMarkWatched?: () => void
  onAddToPlaylist?: (playlistId: string) => void
  onManualMatch?: () => void
  onUnmatch?: () => void
  onRefreshMetadata?: () => void
  onEditMetadata?: () => void
  onDelete?: () => void
  onShowTrailer?: () => void
  hasTrailer?: boolean
  mediaId?: string
  mediaType?: string
  title?: string
}

export function HeroActions({
  playUrl,
  isFavorited,
  isWatched,
  scraping,
  isAdmin,
  playlists,
  watchProgressPosition,
  onFavorite,
  onMarkWatched,
  onAddToPlaylist,
  onManualMatch,
  onUnmatch,
  onRefreshMetadata,
  onEditMetadata,
  onDelete,
  onShowTrailer,
  hasTrailer,
  mediaId,
  mediaType,
  title,
}: HeroActionsProps) {
  const { t } = useTranslation()
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  const closePlaylistMenu = useCallback(() => setShowPlaylistMenu(false), [])
  const closeMoreMenu = useCallback(() => setShowMoreMenu(false), [])

  const handleAddToPlaylist = useCallback((playlistId: string) => {
    onAddToPlaylist?.(playlistId)
    closePlaylistMenu()
  }, [onAddToPlaylist, closePlaylistMenu])

  const shareLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {})
      .catch(() => {})
    closeMoreMenu()
  }, [closeMoreMenu])

  const getDeleteText = () => {
    if (mediaType === 'episode') return '删除本集'
    if (mediaType === 'series') return '删除剧集'
    return '删除影片'
  }

  const getManageText = () => {
    if (mediaType === 'episode') return '管理本集'
    if (mediaType === 'series') return '管理剧集'
    return '管理电影'
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 播放按钮 */}
      {playUrl && (
        <Link
          to={playUrl}
          className="group relative inline-flex items-center gap-2.5 rounded-3xl px-8 py-3.5 text-base font-bold transition-all duration-300 hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-blue-mid))',
            boxShadow: 'var(--shadow-neon), 0 4px 15px var(--neon-blue-15)',
            color: 'var(--text-on-neon)',
          }}
          aria-label={watchProgressPosition && watchProgressPosition > 0
            ? t('hero.continuePlay', { title })
            : t('hero.playTitle', { title })}
        >
          <Play size={22} fill="currentColor" />
          {watchProgressPosition && watchProgressPosition > 0
            ? t('hero.continuePlayAt', { time: formatDurationShort(watchProgressPosition) })
            : t('media.play')}
        </Link>
      )}

      {/* 预告片按钮 */}
      {hasTrailer && onShowTrailer && (
        <button
          onClick={onShowTrailer}
          className="btn-secondary inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold"
          aria-label={t('media.trailer')}
        >
          <span className="w-5 h-5 flex items-center justify-center" style={{ background: 'var(--neon-blue)', borderRadius: '50%' }}>
            <Play size={12} fill="currentColor" className="text-white" />
          </span>
          {t('media.trailer')}
        </button>
      )}

      {/* 收藏 */}
      <button
        onClick={onFavorite}
        className={clsx(
          'btn-icon',
          isFavorited && 'text-pink-400 !bg-pink-500/[0.12] !border-pink-500/20'
        )}
        title={isFavorited ? t('media.removeFavorite') : t('media.addFavorite')}
        aria-label={isFavorited ? t('media.removeFavorite') : t('media.addFavorite')}
        aria-pressed={isFavorited}
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
          title={isWatched ? '取消标记已观看' : t('hero.markWatched') || '标记为已观看'}
          aria-label={isWatched ? '取消标记已观看' : t('hero.markWatched') || '标记为已观看'}
          aria-pressed={isWatched}
        >
          {isWatched ? <Check size={20} fill="currentColor" /> : <Eye size={20} />}
        </button>
      )}

      {/* 添加到列表 */}
      {playlists && onAddToPlaylist && (
        <div className="relative">
          <button
            onClick={() => { setShowPlaylistMenu(!showPlaylistMenu); closeMoreMenu() }}
            className="btn-icon"
            title={t('hero.addToPlaylist')}
            aria-label={t('hero.addToPlaylist')}
            aria-expanded={showPlaylistMenu}
            aria-haspopup="true"
          >
            <ListPlus size={20} />
          </button>

          {showPlaylistMenu && (
            <div className="absolute left-0 top-full z-50 mt-2 min-w-[220px] rounded-xl py-1 shadow-2xl animate-scale-in"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(20px)',
              }}
              role="menu"
              aria-label={t('hero.playlists')}
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
                    {pl.items?.some(item => item.media_id === mediaId) && (
                      <Check size={14} className="ml-auto text-neon" />
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
          onClick={() => { setShowMoreMenu(!showMoreMenu); closePlaylistMenu() }}
          className="btn-icon"
          title={t('hero.moreActions')}
          aria-label={t('hero.moreActions')}
          aria-haspopup="true"
          aria-expanded={showMoreMenu}
        >
          <MoreHorizontal size={20} />
        </button>

        {showMoreMenu && (
          <div className="absolute left-0 top-full z-50 mt-2 min-w-[200px] rounded-xl py-1 shadow-2xl animate-scale-in"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(20px)',
            }}
            role="menu"
            aria-label={t('hero.moreActions')}
          >
            {/* 管理操作（仅管理员可见） */}
            {isAdmin && (
              <>
                <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {getManageText()}
                </div>
                {onManualMatch && (
                  <button
                    onClick={() => { onManualMatch(); closeMoreMenu() }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Link2Icon size={14} />
                    手动匹配
                  </button>
                )}
                {onUnmatch && (
                  <button
                    onClick={() => { onUnmatch(); closeMoreMenu() }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <UnlinkIcon size={14} />
                    解除匹配
                  </button>
                )}
                {onRefreshMetadata && (
                  <button
                    onClick={() => { onRefreshMetadata(); closeMoreMenu() }}
                    disabled={scraping}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5 disabled:opacity-50"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <RefreshCwIcon size={14} className={clsx(scraping && 'animate-spin')} />
                    刷新元数据
                  </button>
                )}
                {onEditMetadata && (
                  <button
                    onClick={() => { onEditMetadata(); closeMoreMenu() }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <PencilIcon size={14} />
                    编辑元数据
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => { onDelete(); closeMoreMenu() }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2Icon size={14} />
                    {getDeleteText()}
                  </button>
                )}
                <div className="my-1 mx-3 h-px" style={{ background: 'var(--border-default)' }} />
              </>
            )}
            <button
              onClick={shareLink}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Share2Icon size={14} />
              {t('hero.shareLink')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Link2Icon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function UnlinkIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="m21 8-7.59 7.59L13 16l4 4 8-8" />
      <path d="M16 13L21 8" />
    </svg>
  )
}

function RefreshCwIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}

function PencilIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}

function Trash2Icon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}

function Share2Icon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 16c-2 0-3.993.5-6 1.5S6 19 6 21" />
      <path d="M15 6V4c0-1.5-1.5-3-3-3S9 2.5 9 4v2" />
      <path d="M18 9a3 3 0 0 0-3-3H3" />
      <path d="M21 15v2c0 1.5-1.5 3-3 3s-3-1.5-3-3v-2" />
      <path d="M9 18a3 3 0 0 0 3 3h6" />
      <path d="M6 9a3 3 0 0 1 3-3h6" />
    </svg>
  )
}