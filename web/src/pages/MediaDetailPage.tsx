import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { mediaApi, userApi, streamApi, playlistApi, adminApi, subtitleApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/components/Toast'
import type { Media, MediaPlayInfo, Playlist, MediaPerson, WatchHistory, TechSpecs, FileDetail, SubtitleTrack } from '@/types'
import { HeroSection, MediaInfoSection, TrailerModal, CastGrid, CollectionCarousel } from '@/components/media'
import EditMetadataModal from '@/components/EditMetadataModal'
import RefreshSingleModal from '@/components/RefreshSingleModal'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import { bumpPosterVersion } from '@/stores/mediaRefresh'
import { useTranslation } from '@/i18n'
import { formatErrMsg } from '@/utils/error'
import { motion, AnimatePresence } from 'framer-motion'
import { easeSmooth, durations } from '@/lib/motion'
import { FileText, Monitor } from 'lucide-react'
import { formatSize, formatDuration, formatDate } from '@/utils/format'

export default function MediaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const toast = useToast()
  const { t } = useTranslation()

  // 核心数据
  const [media, setMedia] = useState<Media | null>(null)
  const [playInfo, setPlayInfo] = useState<MediaPlayInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // 用户相关
  const [isFavorited, setIsFavorited] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [watchProgress, setWatchProgress] = useState<WatchHistory | null>(null)

  // 附加数据
  const [persons, setPersons] = useState<MediaPerson[]>([])

  // 增强详情数据
  const [techSpecs, setTechSpecs] = useState<TechSpecs | null>(null)
  const [fileInfo, setFileInfo] = useState<FileDetail | null>(null)
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([])

  // UI 状态
  const [scraping, setScraping] = useState(false)
  const [showTrailer, setShowTrailer] = useState(false)
  // 海报/背景图版本号：手动匹配/刷新元数据/编辑保存成功后递增，用于绕过浏览器图片缓存
  const [posterVersion, setPosterVersion] = useState<number>(() => Date.now())

  // 管理功能状态
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false)
  const [showRefreshModal, setShowRefreshModal] = useState(false)
  const [matchQuery, setMatchQuery] = useState('')
  const [matchResults, setMatchResults] = useState<any[]>([])
  const [matchSearching, setMatchSearching] = useState(false)
  const [matchSource, setMatchSource] = useState<'tmdb' | 'douban'>('tmdb')
  const [matchSelectedId, setMatchSelectedId] = useState<number | string | null>(null)
  const [matchApplying, setMatchApplying] = useState(false)
  const [editForm, setEditForm] = useState<{
    title: string; orig_title: string; year: number; overview: string;
    rating: number; genres: string; country: string; language: string;
    tagline: string; studio: string
  }>({ title: '', orig_title: '', year: 0, overview: '', rating: 0, genres: '', country: '', language: '', tagline: '', studio: '' })

  // ==================== 数据加载 ====================
  useEffect(() => {
    if (!id) return
    const abortController = new AbortController()
    setLoading(true)
    setPersons([])
    setWatchProgress(null)

    Promise.all([
      mediaApi.detail(id),
      streamApi.getPlayInfo(id),
      playlistApi.list(),
    ])
      .then(([mediaRes, playInfoRes, playlistRes]) => {
        if (abortController.signal.aborted) return
        const mediaData = mediaRes.data.data
        setMedia(mediaData)
        setPlayInfo(playInfoRes.data.data)
        setPlaylists(playlistRes.data.data || [])

        // 非首屏请求：收藏状态、演职人员、观看进度
        userApi.checkFavorite(mediaData.id)
          .then((res) => { if (!abortController.signal.aborted) setIsFavorited(res.data.data) })
          .catch(() => {})
        mediaApi.getPersons(mediaData.id)
          .then((res) => { if (!abortController.signal.aborted) setPersons(res.data.data || []) })
          .catch(() => {})
        userApi.getProgress(mediaData.id)
          .then((res) => { 
            if (!abortController.signal.aborted) {
              setWatchProgress(res.data.data)
              // 判断是否已观看（进度 >= 时长的 90% 视为已观看）
              const progress = res.data.data
              if (progress && progress.position > 0 && mediaData.duration > 0) {
                setIsWatched(progress.position >= mediaData.duration * 0.9)
              }
            }
          })
          .catch(() => {})

        // 增强详情（分块加载，不阻塞首屏）
        mediaApi.detailEnhanced(mediaData.id)
          .then((res) => {
            if (abortController.signal.aborted) return
            const data = res.data.data
            setTechSpecs(data.tech_specs)
            setFileInfo(data.file_info)
          })
          .catch(() => {})

        // 字幕轨道
        subtitleApi.getTracks(mediaData.id)
          .then((res) => {
            if (!abortController.signal.aborted) {
              setSubtitleTracks(res.data.data?.embedded || [])
            }
          })
          .catch(() => {})
      })
      .catch(() => {
        if (abortController.signal.aborted) return
        toast.error(t('mediaDetail.loadFailed'))
        navigate('/')
      })
      .finally(() => { if (!abortController.signal.aborted) setLoading(false) })

    return () => abortController.abort()
  }, [id, navigate])

  // ==================== 事件处理 ====================
  const handleFavorite = async () => {
    if (!id) return
    try {
      if (isFavorited) {
        await userApi.removeFavorite(id)
        setIsFavorited(false)
      } else {
        await userApi.addFavorite(id)
        setIsFavorited(true)
      }
    } catch {
      toast.error(t('mediaDetail.favoriteFailed'))
    }
  }

  const handleMarkWatched = async () => {
    if (!id || !media) return
    try {
      const duration = media.duration || 3600
      if (isWatched) {
        // 取消标记已观看
        await userApi.updateProgress(id, 0, duration)
        setIsWatched(false)
        toast.success('已取消标记')
      } else {
        // 标记为已观看
        await userApi.updateProgress(id, duration, duration)
        setIsWatched(true)
        toast.success('已标记为已观看')
      }
    } catch {
      toast.error('操作失败')
    }
  }

  const handleScrape = async () => {
    if (!id) return
    setScraping(true)
    try {
      await mediaApi.scrape(id)
      const res = await mediaApi.detail(id)
      setMedia(res.data.data)
      toast.success(t('mediaDetail.scrapeSuccess'))
    } catch (err) {
      toast.error(formatErrMsg(err, t('mediaDetail.scrapeFailed')))
    } finally {
      setScraping(false)
    }
  }

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!id) return
    try {
      await playlistApi.addItem(playlistId, id)
      toast.success(t('mediaDetail.addToPlaylistSuccess'))
    } catch {
      toast.error(t('mediaDetail.addToPlaylistFailed'))
    }
  }

  // ==================== 管理功能事件处理 ====================
  const handleManualMatch = () => {
    if (!media) return
    setMatchQuery(media.title)
    setMatchResults([])
    setMatchSource('tmdb')
    setMatchSelectedId(null)
    setShowMatchModal(true)
  }

  // 重新拉取详情相关数据（元数据替换/刷新后调用）
  const refreshMediaDetail = async (mediaId: string) => {
    try {
      const [detailRes, enhancedRes, personsRes] = await Promise.all([
        mediaApi.detail(mediaId),
        mediaApi.detailEnhanced(mediaId).catch(() => null),
        mediaApi.getPersons(mediaId).catch(() => null),
      ])
      setMedia(detailRes.data.data)
      if (enhancedRes) {
        const data = enhancedRes.data.data
        setTechSpecs(data.tech_specs)
        setFileInfo(data.file_info)
      }
      if (personsRes) setPersons(personsRes.data.data || [])
    } catch {
      // 详情刷新失败不致命，已提示成功
    }
  }

  const handleMatchSearch = async () => {
    if (!matchQuery.trim()) return
    setMatchSearching(true)
    try {
      if (matchSource === 'tmdb') {
        const mediaType = 'movie'
        const res = await adminApi.searchMetadata(matchQuery, mediaType, media?.year || undefined)
        setMatchResults(res.data.data || [])
        if ((res.data.data || []).length === 0) {
          toast.info(t('mediaDetail.tmdbNoResult'))
        }
      } else if (matchSource === 'douban') {
        const res = await adminApi.searchDouban(matchQuery, media?.year || undefined)
        setMatchResults(res.data.data || [])
        if ((res.data.data || []).length === 0) {
          toast.info(t('mediaDetail.doubanNoResult'))
        }
      }
    } catch (err) {
      const errorMap: Record<string, string> = {
        tmdb: t('mediaDetail.tmdbSearchFailed'),
        douban: t('mediaDetail.doubanSearchFailed'),
      }
      toast.error(formatErrMsg(err, errorMap[matchSource] || t('mediaDetail.matchFailed')))
    } finally {
      setMatchSearching(false)
    }
  }

  // 选中一个搜索结果（仅高亮，不提交）
  const handleMatchSelect = (resultId: number | string) => {
    setMatchSelectedId(resultId)
  }

  // 点击"应用"按钮：提交替换元数据并刷新详情
  const handleMatchApply = async () => {
    if (!id || matchSelectedId === null) return
    setMatchApplying(true)
    try {
      const sourceNameMap: Record<string, string> = { tmdb: 'TMDb', douban: '豆瓣' }
      if (matchSource === 'tmdb') {
        await adminApi.matchMetadata(id, matchSelectedId as number)
      } else if (matchSource === 'douban') {
        await adminApi.matchMediaDouban(id, matchSelectedId as string)
      }
      await refreshMediaDetail(id)
      // 海报/背景 URL 不变但服务端图片已替换，递增版本号触发浏览器重新加载
                                              setPosterVersion(Date.now())
                bumpPosterVersion()
                bumpPosterVersion()
                bumpPosterVersion()
                bumpPosterVersion()
      setShowMatchModal(false)
      setMatchSelectedId(null)
      toast.success(t('mediaDetail.matchSuccess', { source: sourceNameMap[matchSource] }))
    } catch (err) {
      toast.error(formatErrMsg(err, t('mediaDetail.matchFailed')))
    } finally {
      setMatchApplying(false)
    }
  }

  const handleUnmatch = async () => {
    if (!id) return
    try {
      await adminApi.unmatchMetadata(id)
      const res = await mediaApi.detail(id)
      setMedia(res.data.data)
      setPosterVersion(Date.now())
      setShowUnmatchConfirm(false)
      toast.success(t('mediaDetail.unmatchSuccess'))
    } catch {
      toast.error(t('mediaDetail.unmatchFailed'))
    }
  }

  const handleRefreshMetadata = () => {
    setShowRefreshModal(true)
  }

  const handleRefreshSuccess = async () => {
    if (!id) return
    try {
      const res = await mediaApi.detail(id)
      setMedia(res.data.data)
      setPosterVersion(Date.now())
      toast.success(t('mediaDetail.refreshSuccess'))
    } catch {
      // ignore
    }
  }

  const handleEditMetadata = () => {
    if (!media) return
    setEditForm({
      title: media.title || '',
      orig_title: media.orig_title || '',
      year: media.year || 0,
      overview: media.overview || '',
      rating: media.rating || 0,
      genres: media.genres || '',
      country: media.country || '',
      language: media.language || '',
      tagline: media.tagline || '',
      studio: media.studio || '',
    })
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    if (!id) return
    try {
      await adminApi.updateMediaMetadata(id, editForm)
      const res = await mediaApi.detail(id)
      setMedia(res.data.data)
      setPosterVersion(Date.now())
      setShowEditModal(false)
      toast.success(t('mediaDetail.editSuccess'))
    } catch {
      toast.error(t('mediaDetail.editFailed'))
    }
  }

  const handleDelete = async (deleteFiles: boolean) => {
    if (!id) return
    try {
      await adminApi.deleteMedia(id, deleteFiles)
      setShowDeleteConfirm(false)
      toast.success(t('mediaDetail.deleteSuccess'))
      navigate(-1)
    } catch {
      toast.error(t('mediaDetail.deleteFailed'))
    }
  }

  // ==================== 骨架屏 / 内容 — AnimatePresence 平滑过渡 ====================
  if (loading || !media) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: durations.fast }}
          className="space-y-6"
        >
          <div className="skeleton h-[420px] rounded-2xl" />
          <div className="flex gap-6 pt-4">
            <div className="skeleton hidden h-72 w-48 rounded-xl sm:block" />
            <div className="flex-1 space-y-4">
              <div className="skeleton h-10 w-2/3 rounded-lg" />
              <div className="skeleton h-5 w-1/3 rounded-lg" />
              <div className="flex gap-3">
                <div className="skeleton h-12 w-28 rounded-xl" />
                <div className="skeleton h-12 w-24 rounded-xl" />
                <div className="skeleton h-12 w-28 rounded-xl" />
              </div>
              <div className="skeleton h-20 w-full rounded-xl" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // ==================== 视频流/音频流提取 ====================
  const videoStreams = techSpecs?.streams?.filter((s) => s.codec_type === 'video') || []
  const audioStreams = techSpecs?.streams?.filter((s) => s.codec_type === 'audio') || []

  // ==================== 渲染 ====================
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.page, ease: easeSmooth as unknown as [number, number, number, number] }}
      className="relative -mx-4 -mt-16 sm:-mx-6 lg:-mx-8"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* 英雄区 */}
      <HeroSection
        media={media}
        playInfo={playInfo}
        isFavorited={isFavorited}
        isWatched={isWatched}
        watchProgress={watchProgress}
        playlists={playlists}
        scraping={scraping}
        isAdmin={user?.role === 'admin'}
        posterVersion={posterVersion}
        subtitleTracks={subtitleTracks}
        audioStreams={audioStreams}
        onFavorite={handleFavorite}
        onMarkWatched={handleMarkWatched}
        onScrape={handleScrape}
        onAddToPlaylist={handleAddToPlaylist}
        onShowTrailer={media.trailer_url ? () => setShowTrailer(true) : undefined}
        onManualMatch={handleManualMatch}
        onUnmatch={() => setShowUnmatchConfirm(true)}
        onRefreshMetadata={handleRefreshMetadata}
        onEditMetadata={handleEditMetadata}
        onDelete={() => setShowDeleteConfirm(true)}
        onPreprocess={() => {
          adminApi.submitPreprocess(id!).then(() => {
            toast.success('已提交预处理任务')
          }).catch(() => {
            toast.error('提交预处理失败')
          })
        }}
        onTranscode={() => {
          adminApi.submitTranscode(id!).then(() => {
            toast.success('已提交强制转码任务')
          }).catch(() => {
            toast.error('提交转码失败')
          })
        }}
      />

      {/* 内容区 */}
      <div className="mx-auto space-y-8 px-4 pt-6 sm:px-6 lg:px-8" style={{ background: 'var(--bg-base)' }}>
        {/* 媒体信息（简介 + 类型 + 演职） */}
        <MediaInfoSection
          media={media}
          playInfo={playInfo}
        />

        {/* 演职人员 */}
        <CastGrid persons={persons} />

        {/* 文件信息 */}
        {fileInfo && (
          <section>
            <h3
              className="mb-4 flex items-center gap-2 font-display text-base font-semibold tracking-wide"
              style={{ color: 'var(--text-primary)' }}
            >
              <FileText size={16} className="text-neon/60" />
              {t('mediaInfo.fileInfo')}
            </h3>
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}
            >
              {/* 文件位置 - 单独占一行 */}
              <div className="mb-3 flex items-start gap-3">
                <span className="shrink-0 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('mediaInfo.filePath')}</span>
                <code className="flex-1 truncate text-xs" style={{ color: 'var(--text-secondary)' }} title={fileInfo.file_dir + '/' + fileInfo.file_name}>
                  {fileInfo.file_dir + '/' + fileInfo.file_name}
                </code>
              </div>
              {/* 文件大小、创建时间、修改时间、时长、扩展名 - 占一行 */}
              <div className="grid grid-cols-5 gap-x-4 gap-y-2 text-xs">
                <InfoItem label={t('fileInfo.fileSize')} value={formatSize(fileInfo.file_size)} highlight />
                <InfoItem label={t('fileInfo.createdAt')} value={formatDate(fileInfo.created_at)} />
                <InfoItem label={t('fileInfo.modifiedAt')} value={formatDate(fileInfo.modified_at)} />
                <InfoItem label={t('mediaInfo.runtime')} value={formatDuration(media.duration)} />
                <InfoItem label={t('fileInfo.fileExt')} value={fileInfo.file_ext.replace('.', '').toUpperCase()} />
              </div>
              {fileInfo.md5 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-default)' }}>
                  <div className="flex items-start gap-3 text-xs">
                    <span className="shrink-0 font-medium" style={{ color: 'var(--text-muted)' }}>{t('fileInfo.md5')}</span>
                    <code className="break-all font-mono" style={{ color: 'var(--text-secondary)' }}>{fileInfo.md5}</code>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 视频信息 */}
        {videoStreams.length > 0 && (
          <section>
            <h3
              className="mb-4 flex items-center gap-2 font-display text-base font-semibold tracking-wide"
              style={{ color: 'var(--text-primary)' }}
            >
              <Monitor size={16} className="text-neon/60" />
              {t('videoInfo.title')}
            </h3>
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}
            >
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs sm:grid-cols-3 lg:grid-cols-4">
                <InfoItem label={t('videoInfo.codec')} value={formatCodecName(videoStreams[0].codec_name, videoStreams[0].codec_long_name)} />
                <InfoItem label={t('videoInfo.resolution')} value={videoStreams[0].width && videoStreams[0].height ? `${videoStreams[0].width} × ${videoStreams[0].height}` : '-'} highlight />
                <InfoItem label={t('videoInfo.frameRate')} value={videoStreams[0].frame_rate ? `${parseFloat(videoStreams[0].frame_rate).toFixed(2)} fps` : '-'} />
                <InfoItem label={t('videoInfo.bitRate')} value={formatBitRate(videoStreams[0].bit_rate)} />
                {videoStreams[0].bit_depth && <InfoItem label={t('videoInfo.bitDepth')} value={`${videoStreams[0].bit_depth} bit`} />}
                <InfoItem label={t('videoInfo.pixelFormat')} value={videoStreams[0].pix_fmt || '-'} />
                {videoStreams[0].aspect_ratio && <InfoItem label={t('videoInfo.aspectRatio')} value={videoStreams[0].aspect_ratio} />}
                <InfoItem label={t('videoInfo.hdr')} value={getHDRLabel(videoStreams[0])} />
              </div>
            </div>
          </section>
        )}

        {/* 系列合集（自动识别同系列电影） */}
        {id && (
          <CollectionCarousel mediaId={id} />
        )}

      </div>

      {/* 预告片弹窗 */}
      {showTrailer && media.trailer_url && (
        <TrailerModal
          trailerUrl={media.trailer_url}
          onClose={() => setShowTrailer(false)}
        />
      )}

      {/* ==================== 手动匹配弹窗 ==================== */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
            <h3 className="mb-4 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('mediaDetail.manualMatch')}</h3>
            {/* 数据源切换 */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => { setMatchSource('tmdb'); setMatchResults([]); setMatchSelectedId(null) }}
                className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all"
                style={{
                  background: matchSource === 'tmdb' ? 'linear-gradient(135deg, var(--neon-blue), var(--neon-blue-mid))' : 'var(--bg-surface)',
                  color: matchSource === 'tmdb' ? '#fff' : 'var(--text-secondary)',
                  border: matchSource === 'tmdb' ? 'none' : '1px solid var(--border-default)',
                }}
              >
                🎬 TMDb
              </button>
              <button
                onClick={() => { setMatchSource('douban'); setMatchResults([]); setMatchSelectedId(null) }}
                className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all"
                style={{
                  background: matchSource === 'douban' ? 'linear-gradient(135deg, #00b414, #009910)' : 'var(--bg-surface)',
                  color: matchSource === 'douban' ? '#fff' : 'var(--text-secondary)',
                  border: matchSource === 'douban' ? 'none' : '1px solid var(--border-default)',
                }}
              >
                🎯 {t('mediaDetail.doubanLabel')}
              </button>
            </div>
            <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              {{
                tmdb: t('mediaDetail.tmdbDesc'),
                douban: t('mediaDetail.doubanDesc'),
              }[matchSource]}
            </p>
            <div className="mb-4 flex gap-2">
              <input
                value={matchQuery}
                onChange={(e) => setMatchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMatchSearch()}
                placeholder={t('mediaDetail.searchPlaceholder')}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                autoFocus
              />
              <button
                onClick={handleMatchSearch}
                disabled={matchSearching}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: { tmdb: 'linear-gradient(135deg, var(--neon-blue), var(--neon-blue-mid))', douban: 'linear-gradient(135deg, #00b414, #009910)' }[matchSource] }}
              >
                {matchSearching ? t('mediaDetail.searching') : t('mediaDetail.searchBtn')}
              </button>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {matchResults.map((result: any) => {
                // 多数据源结果的统一展示
                let displayTitle = '', displayOrigTitle = '', displayYear = '', displayOverview = '', posterUrl: string | null = null
                let displayRating = 0, resultKey: string | number = result.id

                if (matchSource === 'tmdb') {
                  displayTitle = result.title || result.name
                  displayOrigTitle = result.original_title || result.original_name
                  displayYear = (result.release_date || result.first_air_date)?.split('-')[0] || ''
                  displayRating = result.vote_average || 0
                  displayOverview = result.overview || ''
                  posterUrl = result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : null
                } else if (matchSource === 'douban') {
                  displayTitle = result.title
                  displayYear = result.year > 0 ? String(result.year) : ''
                  displayRating = result.rating || 0
                  displayOverview = result.overview || ''
                  posterUrl = result.cover || null
                  resultKey = result.id
                }

                const isSelected = matchSelectedId === result.id
                return (
                  <button
                    key={resultKey}
                    onClick={() => handleMatchSelect(result.id)}
                    disabled={matchApplying}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background: isSelected ? 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.06))' : 'var(--bg-surface)',
                      border: isSelected ? '1px solid var(--neon-blue, #38bdf8)' : '1px solid var(--border-default)',
                      boxShadow: isSelected ? '0 0 0 2px rgba(56,189,248,0.25)' : undefined,
                    }}
                  >
                    {posterUrl ? (
                      <img src={posterUrl} alt="" className="h-16 w-11 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 w-11 items-center justify-center rounded-lg" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                        <span className="text-xs">N/A</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {displayTitle}
                        </div>
                        {matchSource === 'douban' && result.genres && (
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'rgba(0,180,20,0.12)', color: '#00b414' }}>
                            {result.genres.split(',')[0]}
                          </span>
                        )}
                      </div>
                      {displayOrigTitle && displayOrigTitle !== displayTitle && (
                        <div className="truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>{displayOrigTitle}</div>
                      )}
                      <div className="mt-0.5 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {displayYear && <span>{displayYear}</span>}
                        {displayRating > 0 && (
                          <span className="text-yellow-400">★ {displayRating.toFixed(1)}</span>
                        )}
                      </div>
                      {displayOverview && (
                        <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>{displayOverview}</p>
                      )}
                    </div>
                  </button>
                )
              })}
              {matchResults.length === 0 && !matchSearching && (
                <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('mediaDetail.searchHint', { source: ' ' + { tmdb: 'TMDb', douban: '豆瓣' }[matchSource] })}
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {matchSelectedId !== null ? '已选中 1 项，点击右侧“应用”即可替换元数据' : '提示：先选中搜索结果，再点击“应用”'}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMatchModal(false)}
                  disabled={matchApplying}
                  className="rounded-xl px-5 py-2 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                  style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleMatchApply}
                  disabled={matchSelectedId === null || matchApplying}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: { tmdb: 'linear-gradient(135deg, var(--neon-blue), var(--neon-blue-mid))', douban: 'linear-gradient(135deg, #00b414, #009910)' }[matchSource] }}
                >
                  {matchApplying && (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {matchApplying ? '应用中...' : '应用'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUnmatchConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
            <h3 className="mb-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('mediaDetail.unmatchTitle')}</h3>
            <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('mediaDetail.unmatchDesc')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUnmatchConfirm(false)}
                className="rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleUnmatch}
                className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-500"
              >
                {t('mediaDetail.unmatchConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 编辑元数据弹窗 ==================== */}
      {showEditModal && (
        <EditMetadataModal
          type="media"
          id={id!}
          tmdbId={media.tmdb_id}
          mediaType={'movie'}
          editForm={editForm}
          setEditForm={setEditForm}
          currentPoster={streamApi.getPosterUrl(media.id, posterVersion)}
          currentBackdrop={streamApi.getBackdropUrl(media.id, posterVersion)}
          hasPoster={!!media.poster_path}
          hasBackdrop={!!media.backdrop_path}
          onSave={handleEditSave}
          onClose={() => setShowEditModal(false)}
          hasTagline
        />
      )}

      <RefreshSingleModal
        open={showRefreshModal}
        mediaId={id!}
        mediaTitle={media?.title || ''}
        onClose={() => setShowRefreshModal(false)}
        onSuccess={handleRefreshSuccess}
      />

      {/* ==================== 删除确认弹窗 ==================== */}
      <DeleteConfirmModal
        open={showDeleteConfirm}
        title="删除影片"
        description="从媒体库移除后，所选视频文件将不再被扫描添加到当前媒体库中。请确认是否同时删除关联的视频文件。"
        hint="删除影片将移除当前影片的记录及缓存文件。"
        onClose={() => setShowDeleteConfirm(false)}
        onDelete={handleDelete}
      />
    </motion.div>
  )
}

// ==================== 视频/文件信息工具 ====================

/** 格式化编码器名称 */
function formatCodecName(codec?: string, longName?: string): string {
  if (!codec) return '-'
  return longName || codec.toUpperCase()
}

/** 格式化码率 */
function formatBitRate(bitRate?: string): string {
  if (!bitRate) return '-'
  const num = parseInt(bitRate)
  if (isNaN(num)) return bitRate
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)} Mbps`
  if (num >= 1000) return `${(num / 1000).toFixed(0)} Kbps`
  return `${num} bps`
}

/** 获取 HDR 标签 */
function getHDRLabel(stream: { color_transfer?: string; video_range?: string }): string {
  if (!stream) return 'SDR'
  const transfer = stream.color_transfer?.toLowerCase() || ''
  if (transfer === 'smpte2084' || transfer === 'smpte 2084') return 'HDR10 (PQ)'
  if (transfer === 'arib-std-b67' || transfer === 'hlg') return 'HLG'
  if (transfer === 'smpte2094' || transfer === 'smpte 2094') return 'HDR10+'
  if (stream.video_range === 'HDR') return 'HDR'
  if (stream.video_range === 'DOVI') return 'Dolby Vision'
  return 'SDR'
}

/** 信息条目 */
function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="shrink-0 font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="truncate font-semibold" style={{ color: highlight ? 'var(--neon-blue)' : 'var(--text-primary)' }} title={value}>
        {value}
      </span>
    </div>
  )
}
