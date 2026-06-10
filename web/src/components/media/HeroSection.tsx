import { useState, useEffect, useCallback, memo } from 'react'
import { Link } from 'react-router-dom'
import { streamApi } from '@/api'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n'
import { formatDuration, formatDurationShort } from '@/utils/format'
import type { Media, MediaPlayInfo, Playlist, WatchHistory, SubtitleTrack, StreamDetail, Series } from '@/types'
import {
  Play,
  Heart,
  Clock,
  Star,
  Eye,
  RefreshCw,
  ListPlus,
  Check,
  MoreHorizontal,
  Share2,
  Link2,
  Unlink,
  Pencil,
  Trash2,
  Subtitles,
  AudioWaveform,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import clsx from 'clsx'

export type HeroSectionVariant = 'media' | 'series' | 'season'

interface HeroSectionCommonProps {
  variant: HeroSectionVariant
  isFavorited: boolean
  isWatched?: boolean
  scraping?: boolean
  isAdmin: boolean
  posterVersion?: number
  playlists?: Playlist[]
  onFavorite: () => void
  onMarkWatched?: () => void
  onAddToPlaylist?: (playlistId: string) => void
  onManualMatch?: () => void
  onUnmatch?: () => void
  onRefreshMetadata?: () => void
  onEditMetadata?: () => void
  onDelete?: () => void
  // 外部菜单状态控制（季详情页使用）
  showMoreMenu?: boolean
  showPlaylistMenu?: boolean
  onToggleMoreMenu?: () => void
  onTogglePlaylistMenu?: () => void
}

interface HeroSectionMediaProps extends HeroSectionCommonProps {
  variant: 'media'
  media: Media
  playInfo?: MediaPlayInfo | null
  watchProgress?: WatchHistory | null
  onShowTrailer?: () => void
  subtitleTracks?: SubtitleTrack[]
  audioStreams?: StreamDetail[]
  onSelectSubtitle?: (index: number) => void
  onSelectAudio?: (index: number) => void
}

interface HeroSectionSeriesProps extends HeroSectionCommonProps {
  variant: 'series'
  series: Series
  firstEpisode?: Media | null
}

interface HeroSectionSeasonProps extends HeroSectionCommonProps {
  variant: 'season'
  series: Series
  seasonNum: number
  episodeCount: number
  firstEpisodeId?: string
  overview?: string
}

export type HeroSectionProps =
  | HeroSectionMediaProps
  | HeroSectionSeriesProps
  | HeroSectionSeasonProps

export default memo(function HeroSection(props: HeroSectionProps) {
  const toast = useToast()
  const { t } = useTranslation()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [backdropError, setBackdropError] = useState(false)
  const [posterError, setPosterError] = useState(false)

  // 内部菜单状态（非季详情页使用）
  const [internalShowMoreMenu, setInternalShowMoreMenu] = useState(false)
  const [internalShowPlaylistMenu, setInternalShowPlaylistMenu] = useState(false)

  // 使用外部或内部状态
  const showMoreMenu = props.variant === 'season' ? props.showMoreMenu : internalShowMoreMenu
  const showPlaylistMenu = props.variant === 'season' ? props.showPlaylistMenu : internalShowPlaylistMenu
  const setShowMoreMenu = props.variant === 'season' ? props.onToggleMoreMenu : setInternalShowMoreMenu
  const setShowPlaylistMenu = props.variant === 'season' ? props.onTogglePlaylistMenu : setInternalShowPlaylistMenu

  // 直接关闭菜单的函数（用于遮罩层点击）
  const closeMoreMenu = useCallback(() => {
    if (props.variant === 'season') {
      // 季详情页模式：需要直接关闭，而不是toggle
      if (showMoreMenu) {
        props.onToggleMoreMenu?.()
      }
    } else {
      setInternalShowMoreMenu(false)
    }
  }, [props.variant, showMoreMenu, props.onToggleMoreMenu])

  const closePlaylistMenu = useCallback(() => {
    if (props.variant === 'season') {
      // 季详情页模式：需要直接关闭，而不是toggle
      if (showPlaylistMenu) {
        props.onTogglePlaylistMenu?.()
      }
    } else {
      setInternalShowPlaylistMenu(false)
    }
  }, [props.variant, showPlaylistMenu, props.onTogglePlaylistMenu])

  // 字幕/音轨选择状态（仅 media 类型）
  const [selectedSubtitleIdx, setSelectedSubtitleIdx] = useState(-1)
  const [selectedAudioIdx, setSelectedAudioIdx] = useState(-1)

  const mediaProps = props as HeroSectionMediaProps
  const seriesProps = props as HeroSectionSeriesProps
  const seasonProps = props as HeroSectionSeasonProps

  useEffect(() => {
    if (props.variant === 'media' && mediaProps.subtitleTracks && mediaProps.subtitleTracks.length > 0) {
      const def = mediaProps.subtitleTracks.find((t) => t.default)
      setSelectedSubtitleIdx(def ? def.index : mediaProps.subtitleTracks[0].index)
    }
  }, [props.variant, mediaProps.subtitleTracks])

  useEffect(() => {
    if (props.variant === 'media' && mediaProps.audioStreams && mediaProps.audioStreams.length > 0) {
      const def = mediaProps.audioStreams.find((s) => s.is_default)
      setSelectedAudioIdx(def ? def.index : mediaProps.audioStreams[0].index)
    }
  }, [props.variant, mediaProps.audioStreams])

  useEffect(() => {
    setImgLoaded(false)
    setLogoError(false)
    setBackdropError(false)
    setPosterError(false)
  }, [
    props.variant,
    props.variant === 'media' ? mediaProps.media?.id : undefined,
    props.variant !== 'media' ? seriesProps.series?.id : undefined,
  ])

  /** 语言代码 → 中文名称映射 */
  const langName = useCallback((code?: string) => {
    if (!code) return '-'
    const c = code.toLowerCase()
    const map: Record<string, string> = {
      chi: '中文', zho: '中文', chs: '简体中文', cht: '繁体中文',
      eng: '英语', jpn: '日语', jp: '日语', kor: '韩语', ko: '韩语',
      fre: '法语', fr: '法语', fra: '法语',
      ger: '德语', de: '德语', deu: '德语',
      spa: '西班牙语', es: '西班牙语', spa_2: '西班牙语',
      ita: '意大利语', it: '意大利语',
      por: '葡萄牙语', pt: '葡萄牙语',
      rus: '俄语', ru: '俄语',
      ara: '阿拉伯语', ar: '阿拉伯语',
      hin: '印地语', hi: '印地语',
      tha: '泰语', th: '泰语',
      vie: '越南语', vi: '越南语',
      ind: '印尼语', id: '印尼语',
      tur: '土耳其语', tr: '土耳其语',
      dut: '荷兰语', nl: '荷兰语', nld: '荷兰语',
      pol: '波兰语', pl: '波兰语',
      swe: '瑞典语', sv: '瑞典语',
      dan: '丹麦语', da: '丹麦语',
      fin: '芬兰语', fi: '芬兰语',
      nor: '挪威语', no: '挪威语',
      cze: '捷克语', cs: '捷克语',
      hun: '匈牙利语', hu: '匈牙利语',
      rum: '罗马尼亚语', ro: '罗马尼亚语',
      gre: '希腊语', el: '希腊语',
      heb: '希伯来语', he: '希伯来语',
      und: '未知语言',
    }
    return map[c] || code
  }, [])

  /** 从字符串中提取中文，若无中文返回空字符串 */
  const extractChinese = useCallback((s?: string): string => {
    if (!s) return ''
    const m = s.match(/[\u4e00-\u9fff\u3400-\u4dbf]+/g)
    return m ? m.join('') : ''
  }, [])

  const handleSelectSubtitle = useCallback((idx: number) => {
    setSelectedSubtitleIdx(idx)
    mediaProps.onSelectSubtitle?.(idx)
  }, [mediaProps.onSelectSubtitle])

  const handleSelectAudio = useCallback((idx: number) => {
    setSelectedAudioIdx(idx)
    mediaProps.onSelectAudio?.(idx)
  }, [mediaProps.onSelectAudio])

  const handleAddToPlaylist = useCallback((playlistId: string) => {
    props.onAddToPlaylist?.(playlistId)
    closePlaylistMenu()
  }, [props.onAddToPlaylist, closePlaylistMenu])

  const shareLink = useCallback(() => {
    let url = window.location.href
    if (props.variant === 'season' && seasonProps.series) {
      url = `${window.location.origin}/series/${seasonProps.series.id}/season/${seasonProps.seasonNum}`
    } else if (props.variant === 'series' && seriesProps.series) {
      url = `${window.location.origin}/series/${seriesProps.series.id}`
    }
    navigator.clipboard.writeText(url)
      .then(() => toast.success(t('hero.linkCopied')))
      .catch(() => toast.error(t('hero.copyFailed')))
    closeMoreMenu()
  }, [props.variant, seasonProps.series, seasonProps.seasonNum, seriesProps.series, toast, t, closeMoreMenu])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePlaylistMenu()
        closeMoreMenu()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closePlaylistMenu, closeMoreMenu])

  // 获取播放 URL
  const getPlayUrl = () => {
    if (props.variant === 'media') {
      return `/play/${mediaProps.media.id}`
    } else if (props.variant === 'series' && seriesProps.firstEpisode) {
      return `/play/${seriesProps.firstEpisode.id}`
    } else if (props.variant === 'season' && seasonProps.firstEpisodeId) {
      return `/play/${seasonProps.firstEpisodeId}`
    }
    return ''
  }

  // 获取标题
  const getTitle = () => {
    if (props.variant === 'media') {
      return mediaProps.media.media_type === 'episode'
        ? (mediaProps.media.episode_title || t('hero.episodeNum', { num: String(mediaProps.media.episode_num) }))
        : mediaProps.media.title
    } else if (props.variant === 'series') {
      return seriesProps.series.title
    } else {
      return seasonProps.series.title
    }
  }

  // 获取副标题/原标题
  const getSubtitle = () => {
    if (props.variant === 'media') {
      if (mediaProps.media.orig_title && mediaProps.media.orig_title !== mediaProps.media.title && mediaProps.media.media_type !== 'episode') {
        return mediaProps.media.orig_title
      }
    } else if (props.variant === 'series') {
      if (seriesProps.series.orig_title && seriesProps.series.orig_title !== seriesProps.series.title) {
        return seriesProps.series.orig_title
      }
    }
    return null
  }

  // 获取评分
  const getRating = () => {
    if (props.variant === 'media') {
      return mediaProps.media.rating
    } else {
      return seriesProps.series.rating
    }
  }

  // 获取年份
  const getYear = () => {
    if (props.variant === 'media') {
      return mediaProps.media.year
    } else {
      return seriesProps.series.year
    }
  }

  // 获取时长
  const getDuration = () => {
    if (props.variant === 'media') {
      return mediaProps.media.duration
    }
    return null
  }

  // 获取类型标签
  const getGenres = () => {
    if (props.variant === 'media') {
      return mediaProps.media.genres
    } else {
      return seriesProps.series.genres
    }
  }

  // 获取分辨率/编码
  const getResolution = () => {
    if (props.variant === 'media') {
      return mediaProps.media.resolution
    }
    return null
  }

  const getVideoCodec = () => {
    if (props.variant === 'media') {
      return mediaProps.media.video_codec
    }
    return null
  }

  // 获取播放信息
  const getPlayInfo = () => {
    if (props.variant === 'media') {
      return mediaProps.playInfo
    }
    return null
  }

  // 获取字幕/音轨
  const getSubtitleTracks = () => {
    if (props.variant === 'media') {
      return mediaProps.subtitleTracks
    }
    return null
  }

  const getAudioStreams = () => {
    if (props.variant === 'media') {
      return mediaProps.audioStreams
    }
    return null
  }

  // 获取背景图 URL
  const getBackdropUrl = () => {
    if (props.variant === 'media') {
      if (mediaProps.media.media_type === 'episode') {
        return streamApi.getPosterUrl(mediaProps.media.id, props.posterVersion)
      } else if (mediaProps.media.backdrop_path) {
        return streamApi.getBackdropUrl(mediaProps.media.id, props.posterVersion)
      }
      return streamApi.getPosterUrl(mediaProps.media.id, props.posterVersion)
    } else {
      return streamApi.getSeriesBackdropUrl(seriesProps.series.id, props.posterVersion)
    }
  }

  // 获取 Logo URL
  const getLogoUrl = () => {
    if (props.variant === 'media') {
      return streamApi.getLogoUrl(mediaProps.media.id, props.posterVersion)
    } else {
      return streamApi.getSeriesLogoUrl(seriesProps.series.id, props.posterVersion)
    }
  }

  // 获取海报 URL
  const getPosterUrl = () => {
    if (props.variant === 'media') {
      return streamApi.getPosterUrl(mediaProps.media.id, props.posterVersion)
    } else if (props.variant === 'season') {
      return streamApi.getSeasonPosterUrl(seasonProps.series.id, seasonProps.seasonNum)
    }
    return streamApi.getSeriesPosterUrl(seriesProps.series.id, props.posterVersion)
  }

  // 获取季信息
  const getSeasonInfo = () => {
    if (props.variant === 'series') {
      return `${seriesProps.series.season_count} 季 · ${seriesProps.series.episode_count} 集`
    } else if (props.variant === 'season') {
      return `${seasonProps.episodeCount} 集`
    }
    return null
  }

  // 获取季标题
  const getSeasonTitle = () => {
    if (props.variant === 'season') {
      return seasonProps.seasonNum === 0 ? '特别篇' : `第 ${seasonProps.seasonNum} 季`
    }
    return null
  }

  // 获取概览
  const getOverview = () => {
    if (props.variant === 'season') {
      return seasonProps.overview
    } else if (props.variant === 'media') {
      return mediaProps.media.tagline
    }
    return null
  }

  // 获取剧集面包屑
  const getBreadcrumb = () => {
    if (props.variant === 'media' && mediaProps.media.media_type === 'episode' && mediaProps.media.series_id) {
      return {
        seriesId: mediaProps.media.series_id,
        seriesTitle: mediaProps.media.series?.title || mediaProps.media.series?.orig_title || t('hero.unknownSeries'),
        seasonNum: mediaProps.media.season_num,
        episodeNum: mediaProps.media.episode_num,
      }
    }
    return null
  }

  const selectedSubtitle = getSubtitleTracks()?.find((t) => t.index === selectedSubtitleIdx)
  const selectedAudio = getAudioStreams()?.find((s) => s.index === selectedAudioIdx)
  const playUrl = getPlayUrl()
  const breadcrumb = getBreadcrumb()

  return (
    <>
      <div className="relative" style={{ background: 'var(--bg-base)' }}>
        {/* 背景图 */}
        <div className="relative overflow-hidden sm:h-[80vh]" style={{ background: 'var(--bg-base)' }}>
          <div className="absolute inset-0" style={{ background: 'var(--bg-surface)' }}>
            {/* 模糊背景图 */}
            <img
              src={getPosterUrl()}
              alt=""
              className="h-full w-full object-cover opacity-15 blur-2xl scale-110"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {/* 主要背景图 */}
            {!backdropError && (
              <img
                src={getBackdropUrl()}
                alt=""
                loading="lazy"
                className={clsx(
                  'absolute inset-0 h-full w-full object-cover transition-all duration-1000',
                  props.variant === 'media' && mediaProps.media.media_type === 'episode' ? '' : '',
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
              {/* 季详情页特殊布局：海报 + 信息并行 */}
              {props.variant === 'season' ? (
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
                        src={getPosterUrl()}
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
                      {getTitle()}
                    </h1>
                    {/* 季标题 */}
                    {getSeasonTitle() && (
                      <div className="mt-1 text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {getSeasonTitle()}
                      </div>
                    )}
                    {/* 元数据标签 */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {getSeasonInfo() && <span>{getSeasonInfo()}</span>}
                      {getYear() > 0 && (
                        <>
                          <span className="opacity-40">·</span>
                          <span>{getYear()}</span>
                        </>
                      )}
                      {getRating() > 0 && (
                        <>
                          <span className="opacity-40">·</span>
                          <span className="inline-flex items-center gap-1 font-bold text-yellow-400">
                            <Star size={13} fill="currentColor" />
                            {getRating().toFixed(1)}
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
                        onClick={props.onFavorite}
                        className={clsx(
                          'btn-icon',
                          props.isFavorited && 'text-pink-400 !bg-pink-500/[0.12] !border-pink-500/20'
                        )}
                        title={props.isFavorited ? t('media.removeFavorite') : t('media.addFavorite')}
                      >
                        <Heart size={20} fill={props.isFavorited ? 'currentColor' : 'none'} />
                      </button>

                      {/* 标记已观看 */}
                      {props.onMarkWatched && (
                        <button
                          onClick={props.onMarkWatched}
                          className={clsx(
                            'btn-icon',
                            props.isWatched ? 'bg-green-500/15 text-green-400 border-green-500/30' : ''
                          )}
                          title={props.isWatched ? '取消标记已观看' : t('hero.markWatched') || '标记为已观看'}
                        >
                          {props.isWatched ? <Check size={20} fill="currentColor" /> : <Eye size={20} />}
                        </button>
                      )}

                      {/* 添加到播放列表 */}
                      {props.playlists && props.onAddToPlaylist && (
                        <div className="relative">
                          <button
                            onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
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
                                {props.playlists.length === 0 ? (
                                  <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{t('hero.noPlaylists')}</div>
                                ) : (
                                  props.playlists.map((pl) => (
                                    <button
                                      key={pl.id}
                                      onClick={() => handleAddToPlaylist(pl.id)}
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                      style={{ color: 'var(--text-secondary)' }}
                                    >
                                      <ListPlus size={14} />
                                      {pl.name}
                                      {pl.items?.some(item => item.media_id === seasonProps.series.id) && (
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
                      {props.isAdmin && (
                        <div className="relative">
                          <button
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
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
                                  onClick={() => { props.onManualMatch?.(); closeMoreMenu() }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  <Link2 size={14} />
                                  手动匹配
                                </button>
                                <button
                                  onClick={() => { props.onUnmatch?.(); closeMoreMenu() }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  <Unlink size={14} />
                                  解除匹配
                                </button>
                                <button
                                  onClick={() => { props.onRefreshMetadata?.(); closeMoreMenu() }}
                                  disabled={props.scraping}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5 disabled:opacity-50"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  <RefreshCw size={14} className={clsx(props.scraping && 'animate-spin')} />
                                  刷新元数据
                                </button>
                                <button
                                  onClick={() => { props.onEditMetadata?.(); closeMoreMenu() }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  <Pencil size={14} />
                                  编辑元数据
                                </button>
                                <button
                                  onClick={() => { props.onDelete?.(); closeMoreMenu() }}
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
                    {getOverview() && (
                      <div className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {getOverview()}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // 电影/剧集详情页布局
                <>
                  {/* 剧集面包屑导航（仅 episode） */}
                  {breadcrumb && (
                    <Link
                      to={`/series/${breadcrumb.seriesId}`}
                      className="mb-2 inline-flex items-center gap-1 text-sm font-medium transition-colors hover:text-neon"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {breadcrumb.seriesTitle}
                      <ChevronRight size={14} />
                      <span style={{ color: 'var(--neon-blue)' }}>
                        第{breadcrumb.seasonNum}季第{breadcrumb.episodeNum}集
                      </span>
                    </Link>
                  )}

                  {/* 标题 / Logo */}
                  {!logoError ? (
                    <div className="mb-1">
                      <img
                        src={getLogoUrl()}
                        alt={getTitle()}
                        loading="lazy"
                        className="max-h-20 sm:max-h-24 w-auto object-contain drop-shadow-lg"
                        onError={() => setLogoError(true)}
                      />
                    </div>
                  ) : (
                    <h1 className="font-display text-3xl font-bold tracking-wide drop-shadow-lg sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
                      {getTitle()}
                    </h1>
                  )}
                  {getSubtitle() && (
                    <p className="mt-1.5 text-base" style={{ color: 'var(--text-secondary)' }}>{getSubtitle()}</p>
                  )}
                  {getOverview() && (
                    <p className="mt-1 text-sm italic" style={{ color: 'var(--text-tertiary)' }}>{getOverview()}</p>
                  )}

                  {/* 霓虹分隔线 */}
                  <div className="my-3 h-[2px] w-24 rounded-full" style={{
                    background: 'linear-gradient(90deg, var(--neon-blue), var(--neon-purple), transparent)',
                    boxShadow: '0 0 8px var(--neon-blue-30)',
                  }} />

                  {/* 操作按钮组 */}
                  <div className="mb-4 flex flex-wrap items-center gap-3">
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
                        aria-label={props.variant === 'media' && mediaProps.watchProgress && !mediaProps.watchProgress.completed && mediaProps.watchProgress.position > 0
                          ? t('hero.continuePlay', { title: getTitle() })
                          : t('hero.playTitle', { title: getTitle() })}
                      >
                        <Play size={22} fill="currentColor" />
                        {props.variant === 'media' && mediaProps.watchProgress && !mediaProps.watchProgress.completed && mediaProps.watchProgress.position > 0
                          ? t('hero.continuePlayAt', { time: formatDurationShort(mediaProps.watchProgress.position) })
                          : t('media.play')}
                      </Link>
                    )}

                    {/* 预告片按钮 */}
                    {props.variant === 'media' && mediaProps.media.trailer_url && mediaProps.onShowTrailer && (
                      <button
                        onClick={mediaProps.onShowTrailer}
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
                      onClick={props.onFavorite}
                      className={clsx(
                        'btn-icon',
                        props.isFavorited && 'text-pink-400 !bg-pink-500/[0.12] !border-pink-500/20'
                      )}
                      title={props.isFavorited ? t('media.removeFavorite') : t('media.addFavorite')}
                      aria-label={props.isFavorited ? t('media.removeFavorite') : t('media.addFavorite')}
                      aria-pressed={props.isFavorited}
                    >
                      {props.isFavorited ? <Heart size={20} fill="currentColor" /> : <Heart size={20} />}
                    </button>

                    {/* 标记为已观看 */}
                    {props.onMarkWatched && (
                      <button
                        onClick={props.onMarkWatched}
                        className={clsx(
                          'btn-icon',
                          props.isWatched ? 'bg-green-500/15 text-green-400 border-green-500/30' : ''
                        )}
                        title={props.isWatched ? '取消标记已观看' : t('hero.markWatched') || '标记为已观看'}
                        aria-label={props.isWatched ? '取消标记已观看' : t('hero.markWatched') || '标记为已观看'}
                        aria-pressed={props.isWatched}
                      >
                        {props.isWatched ? <Check size={20} fill="currentColor" /> : <Eye size={20} />}
                      </button>
                    )}

                    {/* 添加到列表 */}
                    {props.playlists && props.onAddToPlaylist && (
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
                            {props.playlists.length === 0 ? (
                              <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{t('hero.noPlaylists')}</div>
                            ) : (
                              props.playlists.map((pl) => (
                                <button
                                  key={pl.id}
                                  onClick={() => handleAddToPlaylist(pl.id)}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  <ListPlus size={14} />
                                  {pl.name}
                                  {pl.items?.some(item => item.media_id === (props.variant === 'media' ? mediaProps.media.id : seriesProps.series.id)) && (
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
                          {props.isAdmin && (
                            <>
                              <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                {props.variant === 'media' && mediaProps.media.media_type === 'episode' ? '管理本集' : props.variant === 'series' ? '管理剧集' : '管理电影'}
                              </div>
                              <button
                                onClick={() => { props.onManualMatch?.(); closeMoreMenu() }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                <Link2 size={14} />
                                手动匹配
                              </button>
                              <button
                                onClick={() => { props.onUnmatch?.(); closeMoreMenu() }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                <Unlink size={14} />
                                解除匹配
                              </button>
                              <button
                                onClick={() => { props.onRefreshMetadata?.(); closeMoreMenu() }}
                                disabled={props.scraping}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5 disabled:opacity-50"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                <RefreshCw size={14} className={clsx(props.scraping && 'animate-spin')} />
                                刷新元数据
                              </button>
                              <button
                                onClick={() => { props.onEditMetadata?.(); closeMoreMenu() }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                <Pencil size={14} />
                                编辑元数据
                              </button>
                              <button
                                onClick={() => { props.onDelete?.(); closeMoreMenu() }}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                              >
                                <Trash2 size={14} />
                                {props.variant === 'media' && mediaProps.media.media_type === 'episode' ? '删除本集' : props.variant === 'series' ? '删除剧集' : '删除影片'}
                              </button>
                              <div className="my-1 mx-3 h-px" style={{ background: 'var(--border-default)' }} />
                            </>
                          )}
                          <button
                            onClick={shareLink}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <Share2 size={14} />
                            {t('hero.shareLink')}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 右侧元数据标签 */}
                    <div className="ml-auto flex-col items-end gap-1.5 hidden lg:flex">
                      <div className="flex flex-wrap items-center gap-2">
                        {getRating() > 0 && (
                          <span className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold text-yellow-400"
                            style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.15)' }}
                          >
                            <Star size={13} fill="currentColor" />
                            {getRating().toFixed(1)}
                          </span>
                        )}
                        {getYear() > 0 && (
                          <span className="rounded-lg px-2.5 py-1 text-sm"
                            style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                          >
                            {getYear()}
                          </span>
                        )}
                        {getDuration() && getDuration() > 0 && (
                          <span className="rounded-lg px-2.5 py-1 text-sm"
                            style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                          >
                            {formatDuration(getDuration())}
                          </span>
                        )}
                        {getSeasonInfo() && (
                          <span className="rounded-lg px-2.5 py-1 text-sm"
                            style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                          >
                            {getSeasonInfo()}
                          </span>
                        )}
                        {getGenres() && getGenres().split(',').slice(0, 3).map((g) => (
                          <Link key={g} to={`/search?q=${encodeURIComponent(g.trim())}`}
                            className="rounded-lg px-2.5 py-1 text-sm transition-all duration-200 hover:scale-[1.04] hover:brightness-125 cursor-pointer"
                            style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                          >
                            {g.trim()}
                          </Link>
                        ))}
                        {getResolution() && <span className="badge-neon font-bold">{getResolution()}</span>}
                        {getVideoCodec() && <span className="badge-neon">{getVideoCodec()}</span>}
                        {getPlayInfo() && (
                          <span className={clsx(
                            'rounded-lg px-2.5 py-1 text-xs font-semibold',
                            getPlayInfo()!.is_strm
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : getPlayInfo()!.can_direct_play
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          )}>
                            {getPlayInfo()!.is_strm ? t('hero.strmRemote') : getPlayInfo()!.can_direct_play ? t('hero.directPlay') : t('hero.needTranscode')}
                          </span>
                        )}
                      </div>

                      {/* 字幕/音频按钮 — 元数据下方右对齐 */}
                      {props.variant === 'media' && (
                        <div className="flex flex-wrap items-center gap-2">
                          {/* 字幕按钮 */}
                          {getSubtitleTracks() && getSubtitleTracks()!.length > 0 ? (
                            <div className="group relative pb-2">
                              <button
                                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm transition-all duration-200 hover:brightness-110"
                                style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                              >
                                <Subtitles size={13} />
                                <span className="max-w-[160px] truncate">
                                  {selectedSubtitle
                                    ? `${extractChinese(selectedSubtitle.title) || langName(selectedSubtitle.language) || selectedSubtitle.title || t('subtitle.embedded')}`
                                    : t('hero.subtitle')}
                                </span>
                                <ChevronDown size={12} />
                              </button>
                              <div
                                className="absolute left-0 top-full z-50 mt-0.5 hidden min-w-[200px] rounded-lg p-2 shadow-xl group-hover:block"
                                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                              >
                                <div className="space-y-0.5">
                                  {getSubtitleTracks()!.map((track) => {
                                    const isSelected = track.index === selectedSubtitleIdx
                                    const subLabel = extractChinese(track.title) || langName(track.language) || track.title || t('subtitle.embedded')
                                    return (
                                      <button
                                        key={`sub-${track.index}`}
                                        type="button"
                                        onClick={() => handleSelectSubtitle(track.index)}
                                        className={clsx(
                                          'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors',
                                          isSelected
                                            ? ''
                                            : 'hover:bg-white/5'
                                        )}
                                        style={isSelected ? { background: 'rgba(99, 102, 241, 0.15)', color: 'var(--neon-blue)' } : { color: 'var(--text-primary)' }}
                                      >
                                        <span className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]"
                                          style={isSelected ? { background: 'rgba(99, 102, 241, 0.25)', color: 'var(--neon-blue)' } : { background: 'var(--neon-blue-4)', color: 'var(--text-secondary)' }}
                                        >
                                          #{track.index}
                                        </span>
                                        <span className="flex-1 truncate font-medium">
                                          {subLabel}
                                        </span>
                                        {isSelected && <Check size={14} />}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {/* 音频按钮 */}
                          {getAudioStreams() && getAudioStreams()!.length > 0 ? (
                            <div className="group relative pb-2">
                              <button
                                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm transition-all duration-200 hover:brightness-110"
                                style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                              >
                                <AudioWaveform size={13} />
                                <span className="max-w-[180px] truncate">
                                  {selectedAudio
                                    ? `${extractChinese(selectedAudio.title) || langName(selectedAudio.language) || selectedAudio.title || '-'}音频${selectedAudio.channels ? ` (${selectedAudio.channels}ch)` : ''}`
                                    : t('hero.audio')}
                                </span>
                                <ChevronDown size={12} />
                              </button>
                              <div
                                className="absolute left-0 top-full z-50 mt-0.5 hidden min-w-[220px] rounded-lg p-2 shadow-xl group-hover:block"
                                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                              >
                                <div className="space-y-0.5">
                                  {getAudioStreams()!.map((stream) => {
                                    const isSelected = stream.index === selectedAudioIdx
                                    const audioLabel = `${extractChinese(stream.title) || langName(stream.language) || stream.title || '-'}音频`
                                    return (
                                      <button
                                        key={`audio-${stream.index}`}
                                        type="button"
                                        onClick={() => handleSelectAudio(stream.index)}
                                        className={clsx(
                                          'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors',
                                          isSelected
                                            ? ''
                                            : 'hover:bg-white/5'
                                        )}
                                        style={isSelected ? { background: 'rgba(99, 102, 241, 0.15)', color: 'var(--neon-blue)' } : { color: 'var(--text-primary)' }}
                                      >
                                        <span className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]"
                                          style={isSelected ? { background: 'rgba(99, 102, 241, 0.25)', color: 'var(--neon-blue)' } : { background: 'var(--neon-blue-4)', color: 'var(--text-secondary)' }}
                                        >
                                          #{stream.index}
                                        </span>
                                        <span className="flex-1 truncate font-medium">
                                          {audioLabel}
                                        </span>
                                        {stream.channels && (
                                          <span className="shrink-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                            {stream.channels}ch
                                          </span>
                                        )}
                                        {isSelected && <Check size={14} />}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 移动端元数据标签 */}
                  <div className="mb-3 flex flex-wrap items-center gap-2 lg:hidden">
                    {getRating() > 0 && (
                      <span className="flex items-center gap-1 text-sm font-bold text-yellow-400">
                        <Star size={14} fill="currentColor" />
                        {getRating().toFixed(1)}
                      </span>
                    )}
                    {getYear() > 0 && (
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{getYear()}</span>
                    )}
                    {getDuration() && getDuration() > 0 && (
                      <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <Clock size={13} />
                        {formatDurationShort(getDuration())}
                      </span>
                    )}
                    {getSeasonInfo() && (
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{getSeasonInfo()}</span>
                    )}
                    {getResolution() && <span className="badge-neon text-[10px]">{getResolution()}</span>}
                    {getVideoCodec() && <span className="badge-neon text-[10px]">{getVideoCodec()}</span>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 点击空白关闭弹出菜单 */}
      {(showPlaylistMenu || showMoreMenu) && (
        <div className="fixed inset-0 z-40" onClick={() => { closePlaylistMenu(); closeMoreMenu(); }} aria-hidden="true" />
      )}
    </>
  )
})