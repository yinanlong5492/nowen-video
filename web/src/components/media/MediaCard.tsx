import { Link, useNavigate } from 'react-router-dom'
import { useRef, useCallback, useState, useEffect, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
import { springDefault } from '@/lib/motion'
import { streamApi, musicApi, userApi, seriesApi } from '@/api'
import type { Media, Series, MusicTrack } from '@/types'
import { usePosterVersion } from '@/stores/mediaRefresh'
import { useMusicPlayerStore } from '@/stores/musicPlayer'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/components/Toast'
import { MediaCardContent } from './MediaCardContent'
import { MediaCardMenu } from './MediaCardMenu'

interface MediaCardProps {
  media?: Media
  series?: Series
  music?: MusicTrack
  onManualMatch?: (id: string) => void
  onUnmatch?: (id: string) => void
  onRefreshMetadata?: (id: string) => void
  onEditMetadata?: (id: string) => void
  onDelete?: (id: string) => void
  isWide?: boolean
}

export default function MediaCard({
  media,
  series,
  music,
  onManualMatch,
  onUnmatch,
  onRefreshMetadata,
  onEditMetadata,
  onDelete,
  isWide = false,
}: MediaCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { playTrack } = useMusicPlayerStore()
  const toast = useToast()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const [isFavorited, setIsFavorited] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
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

  const navigate = useNavigate()

  // 确定链接目标和显示数据
  const isSeries = !!series || !!(media?.series_id)
  const isMusic = !!music

  // 详情页链接
  let detailTo: string
  let currentId: string
  if (isMusic) {
    detailTo = '/music'
    currentId = ''
  } else if (series) {
    detailTo = `/series/${series.id}`
    currentId = series.id
  } else if (media?.series_id) {
    detailTo = `/series/${media.series_id}`
    currentId = media.id
  } else {
    detailTo = `/media/${media!.id}`
    currentId = media!.id
  }

  // 播放链接
  let playTo: string
  if (isMusic) {
    playTo = '/music'
  } else if (series) {
    playTo = `/series/${series.id}`
  } else if (media?.series_id) {
    playTo = `/series/${media.series_id}`
  } else {
    playTo = `/play/${media!.id}`
  }

  // 标题、年份、评分、海报
  let title: string
  let year: number
  let rating: number
  let posterUrl: string
  let hasPoster: boolean
  let duration: string
  let seriesInfo: string = ''

  if (isMusic) {
    title = music!.title
    year = music!.year
    rating = 0
    posterUrl = musicApi.getTrackCoverUrl(music!.id)
    hasPoster = true
    duration = ''
  } else {
    title = series ? series.title : media!.title
    year = series ? series.year : media!.year
    rating = series ? series.rating : media!.rating
    const posterVersion = usePosterVersion()
    
    // 横板海报视图优先使用横幅海报（backdrop）
    if (isWide) {
      posterUrl = series
        ? streamApi.getSeriesBackdropUrl(series.id, posterVersion)
        : media!.series_id
          ? streamApi.getSeriesBackdropUrl(media!.series_id, posterVersion)
          : streamApi.getBackdropUrl(media!.id, posterVersion)

      hasPoster = series
        ? !!series.backdrop_path
        : media!.series_id
          ? !!(media!.series?.backdrop_path) || !!media!.backdrop_path
          : !!media!.backdrop_path
    } else {
      posterUrl = series
        ? streamApi.getSeriesPosterUrl(series.id, posterVersion)
        : media!.series_id
          ? streamApi.getSeriesPosterUrl(media!.series_id, posterVersion)
          : streamApi.getPosterUrl(media!.id, posterVersion)

      hasPoster = series
        ? !!series.poster_path
        : media!.series_id
          ? !!(media!.series?.poster_path) || !!media!.poster_path
          : !!media!.poster_path
    }

    duration = formatDuration(series ? (series.episodes?.[0]?.duration || 0) : (media!.duration || 0))

    // 计算剧集信息
    if (isSeries && series) {
      const episodes = series.episodes || []
      const seasonCount = series.season_count || 0
      const episodeCount = series.episode_count || episodes.length

      // 获取所有季号
      const seasonNums = new Set<number>()
      episodes.forEach(ep => {
        if (ep.season_num) {
          seasonNums.add(ep.season_num)
        }
      })

      // 如果 season_count 为0，使用从episodes中提取的季数
      const actualSeasonCount = seasonCount > 0 ? seasonCount : seasonNums.size
      const hasSeason1 = seasonNums.has(1) || (seasonCount === 1 && seasonNums.size === 0)

      if (actualSeasonCount === 1) {
        if (hasSeason1) {
          // 只有第1季，显示集数
          seriesInfo = `共${episodeCount}集`
        } else {
          // 只有1季且不是第1季，显示"第X季"
          const onlySeason = seasonNums.size > 0 ? [...seasonNums][0] : 1
          seriesInfo = `第${onlySeason}季`
        }
      } else if (actualSeasonCount > 1) {
        if (hasSeason1) {
          // 有多季且包含第1季，显示"共X季"
          seriesInfo = `共${actualSeasonCount}季`
        } else {
          // 有多季且不包含第1季，显示具体季号
          const sortedSeasons = [...seasonNums].sort((a, b) => a - b)
          
          // 如果没有从episodes中提取到季号，但有seasonCount，使用seasonCount作为回退
          if (sortedSeasons.length === 0) {
            seriesInfo = `共${actualSeasonCount}季`
          } else {
            // 检查是否连续
            let isContinuous = true
            for (let i = 1; i < sortedSeasons.length; i++) {
              if (sortedSeasons[i] !== sortedSeasons[i - 1] + 1) {
                isContinuous = false
                break
              }
            }

            if (isContinuous && sortedSeasons.length >= 2) {
              // 连续季号，显示"第X-Y季"
              seriesInfo = `第${sortedSeasons[0]}-${sortedSeasons[sortedSeasons.length - 1]}季`
            } else {
              // 不连续季号，显示"第X、Y季"
              seriesInfo = `第${sortedSeasons.join('、')}季`
            }
          }
        }
      }
    }
  }

  // 点击播放按钮
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
    setShowMore(!showMore)
  }

  const handleCloseMenu = () => {
    setShowMore(false)
  }

  return (
    <motion.div
      ref={cardRef}
      className="media-card group block"
      whileTap={{ y: 0 }}
      transition={springDefault}
    >
      <Link to={detailTo}>
        <MediaCardContent
          title={title}
          subtitle={undefined}
          posterUrl={posterUrl}
          hasPoster={hasPoster}
          isSeries={isSeries}
          isMusic={isMusic}
          resolution={media?.resolution}
          year={year}
          rating={rating}
          duration={duration}
          seriesInfo={seriesInfo}
          isFavorited={isFavorited}
          isWatched={isWatched}
          onPlayClick={handlePlayClick}
          onFavoriteClick={handleFavorite}
          onWatchedClick={handleMarkWatched}
          onMoreClick={handleMore}
          moreBtnRef={moreBtnRef}
          isWide={isWide}
        />
      </Link>
      {!isMusic && (
        <MediaCardMenu
          show={showMore}
          position={dropdownPos}
          isAdmin={isAdmin}
          isSeries={isSeries}
          currentId={currentId}
          detailUrl={detailTo}
          onClose={handleCloseMenu}
          onManualMatch={onManualMatch}
          onUnmatch={onUnmatch}
          onRefreshMetadata={onRefreshMetadata}
          onEditMetadata={onEditMetadata}
          onDelete={onDelete}
        />
      )}
    </motion.div>
  )
}