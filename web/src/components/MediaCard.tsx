import { Link, useNavigate } from 'react-router-dom'
import { Play, Tv, Film, Music, Heart, Eye, MoreHorizontal, Share2, RefreshCw, Link2, Unlink, Pencil, Trash2, Loader2 } from 'lucide-react'
import { streamApi, musicApi, userApi, seriesApi } from '@/api'
import type { Media, Series, MusicTrack } from '@/types'
import { useRef, useCallback, useState, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  contentType?: ContentType
  onManualMatch?: (id: string) => void
  onUnmatch?: (id: string) => void
  onRefreshMetadata?: (id: string) => void
  onEditMetadata?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function MediaCard({ media, series, music, contentType, onManualMatch, onUnmatch, onRefreshMetadata, onEditMetadata, onDelete }: MediaCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { playTrack } = useMusicPlayerStore()
  const toast = useToast()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const [isFavorited, setIsFavorited] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [favoriting, setFavoriting] = useState(false)
  const [markingWatched, setMarkingWatched] = useState(false)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (showMore && moreBtnRef.current) {
      const rect = moreBtnRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left + rect.width / 2,
      })
    }
  }, [showMore])

  // 格式化时长
  const formatDuration = (seconds: number) => {
    if (!seconds) return ''
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  // 格式化音乐时长（分:秒）
  const formatMusicDuration = (seconds: number) => {
    if (!seconds) return ''
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const navigate = useNavigate()

  // 确定链接目标和显示数据
  const isSeries = !!series || !!(media?.series_id)
  const isMusic = !!music
  const seriesData = series || media?.series

  // 详情页链接（点击名字/其他区域）
  let detailTo: string
  let currentId: string
  if (isMusic) {
    detailTo = '/music'
    currentId = ''
  } else if (series) {
    detailTo = `/series/${series.id}`
    currentId = series.id
  } else if (media!.series_id) {
    detailTo = `/series/${media!.series_id}`
    currentId = media!.id
  } else {
    detailTo = `/media/${media!.id}`
    currentId = media!.id
  }

  // 播放/阅读链接（点击封面中间的播放按钮）
  // 音乐直接播放，非系列的独立媒体直接进入播放页，系列进入详情页
  let playTo: string
  if (isMusic) {
    playTo = '/music'
  } else if (series) {
    playTo = `/series/${series.id}`
  } else if (media!.series_id) {
    playTo = `/series/${media!.series_id}`
  } else {
    playTo = `/play/${media!.id}`
  }

  let title: string
  let year: number
  let rating: number
  let posterUrl: string
  let hasPoster: boolean

  if (isMusic) {
    title = music!.title
    year = music!.year
    rating = 0
    posterUrl = musicApi.getTrackCoverUrl(music!.id)
    hasPoster = true
  } else {
    title = series ? series.title : media!.title
    year = series ? series.year : media!.year
    rating = series ? series.rating : media!.rating
    // 订阅全局海报版本戳：刮削完成/元数据替换后自动刷新图片缓存
    const posterVersion = usePosterVersion()
    posterUrl = series
      ? streamApi.getSeriesPosterUrl(series.id, posterVersion)
      : media!.series_id
        ? streamApi.getSeriesPosterUrl(media!.series_id, posterVersion)
        : streamApi.getPosterUrl(media!.id, posterVersion)

    // 检查是否有真实海报（poster_path 非空）
    hasPoster = series
      ? !!series.poster_path
      : media!.series_id
        ? !!(media!.series?.poster_path) || !!media!.poster_path
        : !!media!.poster_path
  }

  // 点击播放按钮 — 阻止冒泡，导航到播放页或直接播放音乐
  const handlePlayClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isMusic && music) {
      playTrack(music, [music])
    } else {
      navigate(playTo)
    }
  }, [navigate, playTo, isMusic, music, playTrack])

  const mediaId = isMusic ? music!.id : series ? series.id : media!.id

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
  }, [mediaId, user, isMusic, isSeries])

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { toast.info('请先登录'); return }
    if (favoriting) return
    
    setFavoriting(true)
    try {
      if (isFavorited) {
        await userApi.removeFavorite(mediaId)
        setIsFavorited(false)
        toast.success('已取消收藏')
      } else {
        await userApi.addFavorite(mediaId)
        setIsFavorited(true)
        toast.success('已加入收藏')
      }
    } catch {
      toast.error('操作失败')
    } finally {
      setFavoriting(false)
    }
  }

  const handleMarkWatched = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { toast.info('请先登录'); return }
    if (markingWatched) return
    
    setMarkingWatched(true)
    try {
      if (media) {
        const duration = media.duration || 3600
        if (isWatched) {
          await userApi.updateProgress(media.id, 0, duration)
          setIsWatched(false)
          toast.success('已取消标记')
        } else {
          await userApi.updateProgress(media.id, duration, duration)
          setIsWatched(true)
          toast.success('已标记为已观看')
        }
      } else if (series) {
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
      } else {
        toast.info('暂无法标记此内容')
      }
    } catch {
      toast.error('操作失败')
    } finally {
      setMarkingWatched(false)
    }
  }

  const handleMore = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMore(!showMore)
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
          {/* 海报区域 */}
          <div className="relative aspect-[2/3] rounded-xl bg-theme-bg-surface isolate overflow-hidden"
          >
            {hasPoster ? (
              <img
                src={posterUrl}
                alt={title}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : null}
            {/* 占位（无海报或海报加载失败时可见） */}
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

            {/* 悬停暗色遮罩 + 播放按钮 */}
            <div 
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              <button
                type="button"
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

            {/* 音乐类型标识 */}
            {isMusic && (
              <div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              >
                <Music size={12} className="text-neon" />
              </div>
            )}

            {/* 分辨率标签（仅电影） — 使用 isolate 隔离 3D 变换影响 */}
            {!isSeries && !isMusic && media!.resolution && (
              <span className="badge-neon absolute right-2 top-2 z-20" style={{ transform: 'translateZ(0)' }}>
                {media!.resolution}
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

            {!isMusic && (
              <div 
                className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 rounded-b-xl px-2 py-3 pt-8 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <button
                  type="button"
                  onClick={handleFavorite}
                  disabled={favoriting}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10 disabled:cursor-not-allowed"
                  style={{ color: isFavorited ? '#EF4444' : '#ffffff' }}
                  title={isFavorited ? '取消收藏' : '加入收藏'}
                >
                  {favoriting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleMarkWatched}
                  disabled={markingWatched}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10 disabled:cursor-not-allowed"
                  style={{ color: isWatched ? '#22C55E' : '#ffffff' }}
                  title={isWatched ? '取消标记' : '标记为已观看'}
                >
                  {markingWatched ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
                <div className="relative">
                  <button
                    type="button"
                    ref={moreBtnRef}
                    onClick={handleMore}
                    className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
                    style={{ color: '#ffffff' }}
                    title="更多"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                  <AnimatePresence>
                    {showMore && createPortal(
                      <div ref={dropdownRef}>
                        <motion.div
                          className="fixed inset-0 z-40"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false) }}
                        />
                        <motion.div
                          className="fixed z-50 min-w-[200px] rounded-xl py-1 shadow-2xl"
                          style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--glass-border)',
                            backdropFilter: 'blur(20px)',
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            transform: 'translateX(-50%)',
                          }}
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        >
                        {isAdmin && (
                          <>
                            <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                              {contentType === 'movie' ? '管理电影' : contentType === 'series' ? '管理剧集' : contentType === 'season' ? '管理本季' : contentType === 'episode' ? '管理本集' : '管理'}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onManualMatch ? onManualMatch(currentId) : navigate(detailTo) }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <Link2 size={14} />
                              手动匹配
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onUnmatch ? onUnmatch(currentId) : navigate(detailTo) }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <Unlink size={14} />
                              解除匹配
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onRefreshMetadata ? onRefreshMetadata(currentId) : navigate(detailTo) }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <RefreshCw size={14} />
                              刷新元数据
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onEditMetadata ? onEditMetadata(currentId) : navigate(detailTo) }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <Pencil size={14} />
                              编辑元数据
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMore(false); onDelete ? onDelete(currentId) : navigate(detailTo) }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                            >
                              <Trash2 size={14} />
                              {contentType === 'movie' ? '删除影片' : contentType === 'series' ? '删除剧集' : contentType === 'season' ? '删除本季' : contentType === 'episode' ? '删除本集' : '删除'}
                            </button>
                            <div className="my-1 mx-3 h-px" style={{ background: 'var(--border-default)' }} />
                          </>
                        )}
                        <button
                          type="button"
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
                      </motion.div>
                    </div>,
                    document.body
                  )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* 信息区域 */}
          <div className="px-2 pt-2.5 pb-2 text-center">
            <h3
              className="truncate text-sm font-medium leading-snug text-theme-primary transition-colors duration-200 hover:text-neon cursor-pointer"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(detailTo) }}
              title={title}
            >
              {title}
            </h3>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-theme-secondary overflow-hidden">
              {isMusic && music?.artist && <span className="flex-shrink-0 truncate">{music.artist}</span>}
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
              {!isSeries && !isMusic && media!.duration > 0 && (
                <>
                  <span className="text-neon-blue/30 flex-shrink-0">·</span>
                  <span className="flex-shrink-0">{formatDuration(media!.duration)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
