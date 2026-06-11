import { Link, useNavigate } from 'react-router-dom'
import { Play, Tv, Film, Music, Heart, Eye, MoreHorizontal, Share2, RefreshCw, Link2, Unlink, Pencil, Trash2 } from 'lucide-react'
import { streamApi, musicApi, userApi, seriesApi, getAudioBookCoverUrl } from '@/api'
import type { Media, Series, MusicTrack, WatchHistory, AudioBook } from '@/types'
import { useRef, useCallback, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { springDefault } from '@/lib/motion'
import { usePosterVersion } from '@/stores/mediaRefresh'
import { useMusicPlayerStore } from '@/stores/musicPlayer'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/components/Toast'

type ContentType = 'movie' | 'series' | 'season' | 'episode'

interface MediaCardProps {
  media?: Media
  series?: Series
  music?: MusicTrack
  watchHistory?: WatchHistory
  audiobook?: AudioBook
  contentType?: ContentType
  watchedLabel?: (percent: number) => string
  onManualMatch?: (id: string) => void
  onUnmatch?: (id: string) => void
  onRefreshMetadata?: (id: string) => void
  onEditMetadata?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function MediaCard({ media, series, music, watchHistory, audiobook, contentType, watchedLabel, onManualMatch, onUnmatch, onRefreshMetadata, onEditMetadata, onDelete }: MediaCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { playTrack } = useMusicPlayerStore()
  const toast = useToast()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const [isFavorited, setIsFavorited] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (showMore && moreBtnRef.current) {
      const updatePosition = () => {
        const rect = moreBtnRef.current!.getBoundingClientRect()
        setDropdownPos({
          top: rect.bottom + 4,
          left: rect.left + rect.width / 2,
        })
      }
      // 使用 requestAnimationFrame 确保 DOM 已更新
      requestAnimationFrame(updatePosition)
    }
  }, [showMore])

  const formatDuration = (seconds: number) => {
    if (!seconds) return ''
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  const formatMusicDuration = (seconds: number) => {
    if (!seconds) return ''
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const navigate = useNavigate()

  const isWatchHistory = !!watchHistory
  const isSeries = !!series || !!(media?.series_id) || !!(watchHistory?.media.series_id)
  const isMusic = !!music
  const isAudioBook = !!audiobook
  const seriesData = series || media?.series || watchHistory?.media.series

  const watchedPercent = isWatchHistory 
    ? Math.round((watchHistory.position / watchHistory.duration) * 100) 
    : 0

  let detailTo: string
  let currentId: string
  if (isMusic) {
    detailTo = '/music'
    currentId = music?.id || ''
  } else if (isAudioBook && audiobook) {
    detailTo = `/library/${audiobook.library_id}`
    currentId = audiobook.id
  } else if (isWatchHistory) {
    detailTo = watchHistory.media.series_id 
      ? `/series/${watchHistory.media.series_id}` 
      : `/media/${watchHistory.media_id}`
    currentId = watchHistory.media_id
  } else if (series) {
    detailTo = `/series/${series.id}`
    currentId = series.id
  } else if (media && media.series_id) {
    detailTo = `/series/${media.series_id}`
    currentId = media.id
  } else if (media) {
    detailTo = `/media/${media.id}`
    currentId = media.id
  } else {
    detailTo = '/'
    currentId = ''
  }

  let playTo: string
  if (isMusic) {
    playTo = '/music'
  } else if (isAudioBook && audiobook) {
    playTo = `/library/${audiobook.library_id}`
  } else if (isWatchHistory) {
    playTo = `/play/${watchHistory.media_id}`
  } else if (series) {
    playTo = `/series/${series.id}`
  } else if (media && media.series_id) {
    playTo = `/series/${media.series_id}`
  } else if (media) {
    playTo = `/play/${media.id}`
  } else {
    playTo = '/'
  }

  let title: string
  let year: number
  let rating: number
  let posterUrl: string
  let hasPoster: boolean

  if (isMusic && music) {
    title = music.title || 'Unknown'
    year = music.year || 0
    rating = 0
    if (music.album_id) {
      posterUrl = musicApi.getAlbumCoverUrl(music.album_id)
      hasPoster = true
    } else if (music.cover_path) {
      posterUrl = musicApi.getCoverUrlFromPath(music.cover_path)
      hasPoster = true
    } else {
      posterUrl = ''
      hasPoster = false
    }
  } else if (isAudioBook && audiobook) {
    title = audiobook.title || 'Unknown'
    year = audiobook.year || 0
    rating = 0
    if (audiobook.cover_path) {
      posterUrl = getAudioBookCoverUrl(audiobook.id)
      hasPoster = true
    } else {
      posterUrl = ''
      hasPoster = false
    }
  } else if (isWatchHistory) {
    if (watchHistory.media.media_type === 'episode' && watchHistory.media.episode_title) {
      title = watchHistory.media.episode_title
    } else {
      title = watchHistory.media.title
    }
    year = watchHistory.media.year
    rating = watchHistory.media.rating
    const posterVersion = usePosterVersion()
    posterUrl = streamApi.getPosterUrl(watchHistory.media_id, posterVersion)
    hasPoster = !!watchHistory.media.poster_path
  } else {
    title = series ? series.title : (media ? media.title : 'Unknown')
    year = series ? series.year : (media ? media.year : 0)
    rating = series ? series.rating : (media ? media.rating : 0)
    const posterVersion = usePosterVersion()
    posterUrl = series
      ? streamApi.getSeriesPosterUrl(series.id, posterVersion)
      : media && media.series_id
        ? streamApi.getSeriesPosterUrl(media.series_id, posterVersion)
        : media
          ? streamApi.getPosterUrl(media.id, posterVersion)
          : ''

    hasPoster = series
      ? !!series.poster_path
      : media && media.series_id
        ? !!(media.series?.poster_path) || !!media.poster_path
        : media
          ? !!media.poster_path
          : false
  }

  const handlePlayClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isMusic && music) {
      playTrack(music, [music])
    } else {
      navigate(playTo)
    }
  }, [navigate, playTo, isMusic, music, playTrack])

  const mediaId = isMusic 
    ? (music ? music.id : '') 
    : isAudioBook 
      ? (audiobook ? audiobook.id : '') 
      : isWatchHistory 
        ? watchHistory.media_id 
        : series 
          ? series.id 
          : media 
            ? media.id 
            : ''

  useEffect(() => {
    if (!user || isMusic) return
    userApi.checkFavorite(mediaId).then((res) => {
      setIsFavorited(res.data.data)
    }).catch(() => {})
    if (!isSeries) {
      userApi.getProgress(mediaId).then((res) => {
        const progress = res.data.data
        if (progress && progress.position > 0 && progress.duration > 0) {
          setIsWatched(progress.position >= progress.duration * 0.9)
        }
      }).catch(() => {})
    }
  }, [mediaId, user, isMusic, isSeries, isWatchHistory])

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { toast.info('请先登录'); return }
    const apiCall = isFavorited ? userApi.removeFavorite(mediaId) : userApi.addFavorite(mediaId)
    apiCall.then(() => {
      setIsFavorited(!isFavorited)
      toast.success(isFavorited ? '已取消收藏' : '已加入收藏')
    }).catch(() => toast.error('操作失败'))
  }

  const handleMarkWatched = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { toast.info('请先登录'); return }
    if (media) {
      const duration = media.duration || 3600
      if (isWatched) {
        userApi.updateProgress(media.id, 0, duration).then(() => {
          setIsWatched(false)
          toast.success('已取消标记')
        }).catch(() => toast.error('操作失败'))
      } else {
        userApi.updateProgress(media.id, duration, duration).then(() => {
          setIsWatched(true)
          toast.success('已标记为已观看')
        }).catch(() => toast.error('操作失败'))
      }
    } else if (series) {
      try {
        let allEpisodes: Media[] = series.episodes || []
        if (allEpisodes.length === 0) {
          const seasonsRes = await seriesApi.seasons(series.id)
          const seasons = seasonsRes.data.data || []
          for (const s of seasons) {
            if (s.episodes && s.episodes.length > 0) {
              allEpisodes = allEpisodes.concat(s.episodes)
            }
          }
        }
        if (allEpisodes.length > 0) {
          if (isWatched) {
            await Promise.all(
              allEpisodes.map(ep => {
                const duration = ep.duration || 3600
                return userApi.updateProgress(ep.id, 0, duration)
              })
            )
            setIsWatched(false)
            toast.success(`已取消标记全部 ${allEpisodes.length} 集`)
          } else {
            await Promise.all(
              allEpisodes.map(ep => {
                const duration = ep.duration || 3600
                return userApi.updateProgress(ep.id, duration, duration)
              })
            )
            setIsWatched(true)
            toast.success(`已标记全部 ${allEpisodes.length} 集为已观看`)
          }
        } else {
          toast.info('暂无剧集信息')
        }
      } catch {
        toast.error('操作失败')
      }
    } else {
      toast.info('暂无法标记此内容')
    }
  }

  const handleMore = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 确保点击按钮时总是打开弹窗，不受遮罩层影响
    setShowMore(true)
  }

  return (
    <motion.div
      ref={cardRef}
      className="media-card group block"
      whileTap={{ y: 0 }}
      transition={springDefault}
    >
      <Link to={detailTo}>
        <div>
          <div className={`relative rounded-xl bg-theme-bg-surface isolate overflow-hidden ${
            isMusic ? 'aspect-square' : isWatchHistory ? 'aspect-[16/9]' : 'aspect-[2/3]'
          }`}>
            {hasPoster ? (
              <img
                src={posterUrl}
                alt={title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : null}
            <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(180deg, #1a1b2e 0%, #0f1019 100%)',
              }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))',
                  border: '1px solid rgba(59,130,246,0.1)',
                }}
              >
                {isMusic ? <Music size={24} style={{ color: '#4a5568' }} /> : isSeries ? <Tv size={24} style={{ color: '#4a5568' }} /> : <Film size={24} style={{ color: '#4a5568' }} />}
              </div>
              <span className="text-xs font-medium" style={{ color: '#4a5568' }}>
                {isMusic ? '暂无封面' : '暂无海报'}
              </span>
            </div>

            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <button
                onClick={handlePlayClick}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 hover:scale-125 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
                  boxShadow: 'var(--neon-glow-shadow-lg)',
                }}
                title={isMusic ? '播放音乐' : isSeries ? '查看系列' : '立即播放'}
              >
                <Play size={18} className="ml-0.5 text-white" fill="white" />
              </button>
            </div>

            {isMusic && (
              <div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              >
                <Music size={12} className="text-neon" />
              </div>
            )}

            {!isSeries && !isMusic && !isWatchHistory && media && media.resolution && (
              <span className="badge-neon absolute right-2 top-2 z-20" style={{ transform: 'translateZ(0)' }}>
                {media.resolution}
              </span>
            )}

            {!isMusic && rating > 0 && (
              <span className="absolute left-2 top-2 z-20 rounded-md px-2 py-0.5 text-xs font-medium backdrop-blur-md"
                style={{
                  background: 'rgba(0,0,0,0.65)',
                  color: '#FACC15',
                  border: '1px solid rgba(255,255,255,0.15)',
                  transform: 'translateZ(0)',
                }}
              >
                ★ {rating.toFixed(1)}
              </span>
            )}

            {isWatchHistory && (
              <>
                <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm z-20">
                  {watchedPercent}%
                </span>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-20">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${watchedPercent}%`,
                      background: 'linear-gradient(90deg, var(--neon-blue), var(--neon-purple))',
                      boxShadow: 'var(--neon-glow-shadow-sm)',
                    }}
                  />
                </div>
              </>
            )}

            {!isMusic && (
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 rounded-b-xl px-2 py-3 pt-8 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <button
                  onClick={handleFavorite}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
                  style={{ color: isFavorited ? '#EF4444' : '#ffffff' }}
                  title={isFavorited ? '取消收藏' : '加入收藏'}
                >
                  <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={handleMarkWatched}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
                  style={{ color: isWatched ? '#22C55E' : '#ffffff' }}
                  title={isWatched ? '取消标记' : '标记为已观看'}
                >
                  <Eye size={20} />
                </button>
                <div className="relative">
                  <button
                    ref={moreBtnRef}
                    onClick={handleMore}
                    className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
                    style={{ color: '#ffffff', zIndex: 51 }}
                    title="更多"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                  {showMore && (
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false) }} />
                  )}
                  {showMore && createPortal(
                    <div ref={dropdownRef}>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false) }} />
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
                            <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                              {contentType === 'movie' ? '管理电影' : contentType === 'series' ? '管理剧集' : contentType === 'season' ? '管理本季' : contentType === 'episode' ? '管理本集' : '管理'}
                            </div>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); if (onManualMatch) { onManualMatch(currentId) } else { toast.info('此功能暂不可用') } }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <Link2 size={14} />
                              手动匹配
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); if (onUnmatch) { onUnmatch(currentId) } else { toast.info('此功能暂不可用') } }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <Unlink size={14} />
                              解除匹配
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); if (onRefreshMetadata) { onRefreshMetadata(currentId) } else { toast.info('此功能暂不可用') } }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <RefreshCw size={14} />
                              刷新元数据
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); if (onEditMetadata) { onEditMetadata(currentId) } else { toast.info('此功能暂不可用') } }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <Pencil size={14} />
                              编辑元数据
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); if (onDelete) { onDelete(currentId) } else { toast.info('此功能暂不可用') } }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                            >
                              <Trash2 size={14} />
                              {contentType === 'movie' ? '删除影片' : contentType === 'series' ? '删除剧集' : contentType === 'season' ? '删除本季' : contentType === 'episode' ? '删除本集' : '删除'}
                            </button>
                            <div className="my-1 mx-3 h-px" style={{ background: 'var(--border-default)' }} />
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault(); e.stopPropagation(); setShowMore(false)
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

          <div className="px-2 pt-2.5 pb-2 text-center">
            <h3
              className="truncate text-sm font-medium leading-snug text-theme-primary transition-colors duration-200 group-hover:text-neon cursor-pointer"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(detailTo) }}
              title={title}
            >
              {title}
            </h3>
            {isWatchHistory && watchHistory.media.media_type === 'episode' && (watchHistory.media.season_num || watchHistory.media.episode_num) && (
              <p className="mt-0.5 truncate text-xs text-theme-secondary">
                第{watchHistory.media.season_num || 0}季 第{watchHistory.media.episode_num || 0}集
              </p>
            )}
            {!(isWatchHistory && watchHistory.media.media_type === 'episode') && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-theme-secondary overflow-hidden">
                {isMusic && music?.artist && <span className="flex-shrink-0 truncate">{music.artist}</span>}
                {isAudioBook && audiobook?.author && <span className="flex-shrink-0 truncate">{audiobook.author}</span>}
                {year > 0 && <span className="flex-shrink-0">{year}</span>}
                {isSeries && seriesData && seriesData.season_count > 0 && (
                  <>
                    <span className="text-neon-blue/30 flex-shrink-0">·</span>
                    <span className="flex-shrink-0">{seriesData.season_count} 季 · {seriesData.episode_count} 集</span>
                  </>
                )}
                {isMusic && music?.duration > 0 && (
                  <>
                    <span className="text-neon-blue/30 flex-shrink-0">·</span>
                    <span className="flex-shrink-0">{formatMusicDuration(music.duration)}</span>
                  </>
                )}
                {!isSeries && !isMusic && !isAudioBook && !isWatchHistory && media && media.duration > 0 && (
                  <>
                    <span className="text-neon-blue/30 flex-shrink-0">·</span>
                    <span className="flex-shrink-0">{formatDuration(media.duration)}</span>
                  </>
                )}
              </div>
            )}
            {isWatchHistory && watchedLabel && (
              <p className="mt-1 text-[11px] text-theme-tertiary">
                观看进度：{watchedLabel(watchedPercent)}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}