import { useState, useEffect, useCallback, memo } from 'react'
import { Link } from 'react-router-dom'
import { streamApi } from '@/api'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n'
import { formatDuration, formatDurationShort } from '@/utils/format'
import type { Media, MediaPlayInfo, Playlist, WatchHistory, SubtitleTrack, StreamDetail } from '@/types'
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
  Clapperboard,
  ChevronRight,
  ChevronDown,
  Pencil,
  Link2,
  Unlink,
  Trash2,
  Subtitles,
  AudioWaveform,
} from 'lucide-react'
import clsx from 'clsx'

interface HeroSectionProps {
  media: Media
  playInfo: MediaPlayInfo | null
  isFavorited: boolean
  isWatched?: boolean
  watchProgress: WatchHistory | null
  playlists?: Playlist[]
  scraping: boolean
  isAdmin: boolean
  /** 海报/背景图版本号：元数据更新后递增此值可强制刷新图片 */
  posterVersion?: number
  onFavorite: () => void
  onMarkWatched?: () => void
  onScrape?: () => void
  onAddToPlaylist?: (playlistId: string) => void
  onShowTrailer?: () => void
  onManualMatch?: () => void
  onUnmatch?: () => void
  onRefreshMetadata?: () => void
  onEditMetadata?: () => void
  onDelete?: () => void
  onPreprocess?: () => void
  onTranscode?: () => void
  /** 内嵌字幕列表 */
  subtitleTracks?: SubtitleTrack[]
  /** 音频流列表 */
  audioStreams?: StreamDetail[]
  /** 字幕切换回调 */
  onSelectSubtitle?: (index: number) => void
  /** 音频切换回调 */
  onSelectAudio?: (index: number) => void
}

export default memo(function HeroSection({
  media,
  playInfo,
  isFavorited,
  watchProgress,
  playlists,
  scraping,
  isAdmin,
  posterVersion,
  onFavorite,
  isWatched,
  onMarkWatched,
  onScrape: _onScrape,
  onAddToPlaylist,
  onShowTrailer,
  onManualMatch,
  onUnmatch,
  onRefreshMetadata,
  onEditMetadata,
  onDelete,
  onPreprocess: _onPreprocess,
  onTranscode: _onTranscode,
  subtitleTracks,
  audioStreams,
  onSelectSubtitle,
  onSelectAudio,
}: HeroSectionProps) {
  const toast = useToast()
  const { t } = useTranslation()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [selectedSubtitleIdx, setSelectedSubtitleIdx] = useState(() => {
    const tracks = subtitleTracks
    if (!tracks || tracks.length === 0) return -1
    const def = tracks.find((t) => t.default)
    return def ? def.index : tracks[0].index
  })
  const [selectedAudioIdx, setSelectedAudioIdx] = useState(() => {
    const streams = audioStreams
    if (!streams || streams.length === 0) return -1
    const def = streams.find((s) => s.is_default)
    return def ? def.index : streams[0].index
  })

  useEffect(() => {
    if (subtitleTracks && subtitleTracks.length > 0) {
      const def = subtitleTracks.find((t) => t.default)
      setSelectedSubtitleIdx(def ? def.index : subtitleTracks[0].index)
    }
  }, [subtitleTracks])

  useEffect(() => {
    if (audioStreams && audioStreams.length > 0) {
      const def = audioStreams.find((s) => s.is_default)
      setSelectedAudioIdx(def ? def.index : audioStreams[0].index)
    }
  }, [audioStreams])

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

  const selectedSubtitle = subtitleTracks?.find((t) => t.index === selectedSubtitleIdx)
  const selectedAudio = audioStreams?.find((s) => s.index === selectedAudioIdx)

  const handleSelectSubtitle = useCallback((idx: number) => {
    setSelectedSubtitleIdx(idx)
    onSelectSubtitle?.(idx)
  }, [onSelectSubtitle])

  const handleSelectAudio = useCallback((idx: number) => {
    setSelectedAudioIdx(idx)
    onSelectAudio?.(idx)
  }, [onSelectAudio])

  const [logoError, setLogoError] = useState(false)

  const handleAddToPlaylist = useCallback((playlistId: string) => {
    onAddToPlaylist?.(playlistId)
    setShowPlaylistMenu(false)
  }, [onAddToPlaylist])

  const shareLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => toast.success(t('hero.linkCopied')))
      .catch(() => { toast.error(t('hero.copyFailed')) })
    setShowMoreMenu(false)
  }, [toast, t])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPlaylistMenu(false)
        setShowMoreMenu(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [setShowPlaylistMenu, setShowMoreMenu])

  return (
    <>
      <div className="relative" style={{ background: 'var(--bg-base)' }}>
        {/* 背景图 */}
        <div className="relative overflow-hidden sm:h-[80vh]" style={{ background: 'var(--bg-base)' }}>
          <div className="absolute inset-0" style={{ background: 'var(--bg-surface)' }}>
            {media.media_type === 'episode' ? (
              <img
                src={streamApi.getPosterUrl(media.id, posterVersion)}
                alt=""
                loading="lazy"
                className={clsx(
                  'h-full w-full object-cover transition-all duration-1000',
                  imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                )}
                onLoad={() => setImgLoaded(true)}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; setImgLoaded(true) }}
              />
            ) : media.backdrop_path ? (
              <img
                src={streamApi.getBackdropUrl(media.id, posterVersion)}
                alt=""
                loading="lazy"
                className={clsx(
                  'h-full w-full object-cover transition-all duration-1000',
                  imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                )}
                onLoad={() => setImgLoaded(true)}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; setImgLoaded(true) }}
              />
            ) : (
              <img
                src={streamApi.getPosterUrl(media.id, posterVersion)}
                alt=""
                className="h-full w-full object-cover opacity-15 blur-2xl scale-110"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
          </div>
          <div className="absolute inset-0 gradient-overlay" />
        </div>

        {/* 信息叠加层 */}
        <div className="relative -mt-48 px-4 pb-2 sm:px-6 lg:px-8">
          <div className="mx-auto">
            {/* 信息区域 */}
            <div className="flex min-w-0 flex-col justify-end">
              {/* 剧集所属系列面包屑导航 */}
              {media.media_type === 'episode' && media.series_id && (
                <Link
                  to={`/series/${media.series_id}`}
                  className="mb-2 inline-flex items-center gap-1 text-sm font-medium transition-colors hover:text-neon"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {media.series?.title || media.series?.orig_title || t('hero.unknownSeries')}
                  <ChevronRight size={14} />
                  <span style={{ color: 'var(--neon-blue)' }}>
                    第{media.season_num}季第{media.episode_num}集
                  </span>
                </Link>
              )}

              {/* 标题 / Logo */}
              {media.media_type !== 'episode' && !logoError ? (
                <div className="mb-1">
                  <img
                    src={streamApi.getLogoUrl(media.id, posterVersion)}
                    alt={media.title}
                    loading="lazy"
                    className="max-h-20 sm:max-h-24 w-auto object-contain drop-shadow-lg"
                    onError={() => setLogoError(true)}
                  />
                </div>
              ) : (
                <h1 className="font-display text-3xl font-bold tracking-wide drop-shadow-lg sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
                  {media.media_type === 'episode'
                    ? (media.episode_title || t('hero.episodeNum', { num: String(media.episode_num) }))
                    : media.title
                  }
                </h1>
              )}
              {media.orig_title && media.orig_title !== media.title && media.media_type !== 'episode' && (
                <p className="mt-1.5 text-base" style={{ color: 'var(--text-secondary)' }}>{media.orig_title}</p>
              )}
              {media.tagline && (
                <p className="mt-1 text-sm italic" style={{ color: 'var(--text-tertiary)' }}>{media.tagline}</p>
              )}

              {/* 霓虹分隔线 */}
              <div className="my-3 h-[2px] w-24 rounded-full" style={{
                background: 'linear-gradient(90deg, var(--neon-blue), var(--neon-purple), transparent)',
                boxShadow: '0 0 8px var(--neon-blue-30)',
              }} />

              {/* 操作按钮组 */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                {/* 播放按钮 */}
                <Link
                  to={`/play/${media.id}`}
                  className="group relative inline-flex items-center gap-2.5 rounded-3xl px-8 py-3.5 text-base font-bold transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-blue-mid))',
                    boxShadow: 'var(--shadow-neon), 0 4px 15px var(--neon-blue-15)',
                    color: 'var(--text-on-neon)',
                  }}
                  aria-label={watchProgress && !watchProgress.completed && watchProgress.position > 0 ? t('hero.continuePlay', { title: media.title }) : t('hero.playTitle', { title: media.title })}
                >
                  <Play size={22} fill="currentColor" />
                  {watchProgress && !watchProgress.completed && watchProgress.position > 0
                    ? t('hero.continuePlayAt', { time: formatDurationShort(watchProgress.position) })
                    : t('media.play')}
                </Link>

                {/* 预告片按钮 */}
                {media.trailer_url && onShowTrailer && (
                  <button
                    onClick={onShowTrailer}
                    className="btn-secondary inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold"
                    aria-label={t('media.trailer')}
                  >
                    <Clapperboard size={18} />
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
                      onClick={() => { setShowPlaylistMenu(!showPlaylistMenu); setShowMoreMenu(false) }}
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
                              {pl.items?.some(item => item.media_id === media.id) && (
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
                    onClick={() => { setShowMoreMenu(!showMoreMenu); setShowPlaylistMenu(false) }}
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
                          <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>剧集管理</div>
                          <button
                            onClick={() => { onManualMatch?.(); setShowMoreMenu(false) }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <Link2 size={14} />
                            {t('hero.manualMatch')}剧集
                          </button>
                          <button
                            onClick={() => { onUnmatch?.(); setShowMoreMenu(false) }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <Unlink size={14} />
                            {t('hero.unmatch')}剧集
                          </button>
                          <button
                            onClick={() => { onRefreshMetadata?.(); setShowMoreMenu(false) }}
                            disabled={scraping}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5 disabled:opacity-50"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <RefreshCw size={14} className={clsx(scraping && 'animate-spin')} />
                            {scraping ? t('hero.refreshing') : t('hero.refreshMetadata')}
                          </button>
                          <button
                            onClick={() => { onEditMetadata?.(); setShowMoreMenu(false) }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <Pencil size={14} />
                            {t('hero.editMetadata')}
                          </button>
                          <button
                            onClick={() => { onDelete?.(); setShowMoreMenu(false) }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 size={14} />
                            {media.media_type === 'episode' ? '删除本集' : '删除影片'}
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
                  {media.rating > 0 && (
                    <span className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold text-yellow-400"
                      style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.15)' }}
                    >
                      <Star size={13} fill="currentColor" />
                      {media.rating.toFixed(1)}
                    </span>
                  )}
                  {media.year > 0 && (
                    <span className="rounded-lg px-2.5 py-1 text-sm"
                      style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                    >
                      {media.year}
                    </span>
                  )}
                  {media.duration > 0 && (
                    <span className="rounded-lg px-2.5 py-1 text-sm"
                      style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                    >
                      {formatDuration(media.duration)}
                    </span>
                  )}
                  {media.genres && media.genres.split(',').slice(0, 3).map((g) => (
                    <Link key={g} to={`/search?q=${encodeURIComponent(g.trim())}`}
                      className="rounded-lg px-2.5 py-1 text-sm transition-all duration-200 hover:scale-[1.04] hover:brightness-125 cursor-pointer"
                      style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                    >
                      {g.trim()}
                    </Link>
                  ))}
                  {media.resolution && <span className="badge-neon font-bold">{media.resolution}</span>}
                  {media.video_codec && <span className="badge-neon">{media.video_codec}</span>}
                  {playInfo && (
                    <span className={clsx(
                      'rounded-lg px-2.5 py-1 text-xs font-semibold',
                      playInfo.is_strm
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : playInfo.can_direct_play
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    )}>
                      {playInfo.is_strm ? t('hero.strmRemote') : playInfo.can_direct_play ? t('hero.directPlay') : t('hero.needTranscode')}
                    </span>
                  )}
                </div>

                {/* 字幕/音频按钮 — 元数据下方右对齐 */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* 字幕按钮 */}
                  {subtitleTracks && subtitleTracks.length > 0 ? (
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
                          {subtitleTracks.map((track) => {
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
                  {audioStreams && audioStreams.length > 0 ? (
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
                          {audioStreams.map((stream) => {
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
              </div>
            </div>

              {/* 移动端元数据标签 */}
              <div className="mb-3 flex flex-wrap items-center gap-2 lg:hidden">
                {media.rating > 0 && (
                  <span className="flex items-center gap-1 text-sm font-bold text-yellow-400">
                    <Star size={14} fill="currentColor" />
                    {media.rating.toFixed(1)}
                  </span>
                )}
                {media.year > 0 && (
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{media.year}</span>
                )}
                {media.duration > 0 && (
                  <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Clock size={13} />
                    {formatDurationShort(media.duration)}
                  </span>
                )}
                {media.resolution && <span className="badge-neon text-[10px]">{media.resolution}</span>}
                {media.video_codec && <span className="badge-neon text-[10px]">{media.video_codec}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 点击空白关闭弹出菜单 */}
      {(showPlaylistMenu || showMoreMenu) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowPlaylistMenu(false); setShowMoreMenu(false) }} aria-hidden="true" />
      )}
    </>
  )
})
