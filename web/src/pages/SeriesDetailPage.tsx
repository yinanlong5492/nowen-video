import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { seriesApi, userApi, adminApi, streamApi, playlistApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/components/Toast'
import EditMetadataModal from '@/components/EditMetadataModal'
import RefreshSingleModal from '@/components/RefreshSingleModal'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import { CastGrid, SeriesHeroSection, SeasonGrid } from '@/components/media'
import { formatErrMsg } from '@/utils/error'
import type { Series, SeasonInfo, MediaPerson, Playlist } from '@/types'
import {
  RefreshCw,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { easeSmooth, durations } from '@/lib/motion'

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const toast = useToast()
  const [series, setSeries] = useState<Series | null>(null)
  const [seasons, setSeasons] = useState<SeasonInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [isFavorited, setIsFavorited] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [watchedSeasonNums, setWatchedSeasonNums] = useState<Set<number>>(new Set())
  // 演职人员
  const [persons, setPersons] = useState<MediaPerson[]>([])
  // 图片缓存版本号：元数据更新后递增以强制刷新图片
  const [posterVersion, setPosterVersion] = useState<number>(() => Date.now())

  // 播放列表状态
  const [playlists, setPlaylists] = useState<Playlist[]>([])

  // 管理功能状态
  const [scraping] = useState(false)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false)
  const [showRefreshModal, setShowRefreshModal] = useState(false)
  const [matchQuery, setMatchQuery] = useState('')
  const [matchResults, setMatchResults] = useState<Array<{
    id: number | string;
    name?: string;
    title?: string;
    original_name?: string;
    original_title?: string;
    first_air_date?: string;
    release_date?: string;
    vote_average?: number;
    overview?: string;
    poster_path?: string;
    year?: number | string;
    rating?: number | { total: number; score: number; rank: number } | null;
    cover?: string;
    seriesName?: string;
    originalName?: string;
    firstAired?: string;
    image?: string;
    poster?: string;
    name_cn?: string;
    air_date?: string;
    images?: { common?: string; medium?: string; large?: string; small?: string; grid?: string } | null;
  }>>([])
  const [matchSearching, setMatchSearching] = useState(false)
  const [matchSelecting, setMatchSelecting] = useState(false)
  const [matchSource, setMatchSource] = useState<'tmdb' | 'douban'>('tmdb')
  const [editForm, setEditForm] = useState<{
    title: string; orig_title: string; year: number | undefined; overview: string;
    rating: number | undefined; genres: string; country: string; language: string; studio: string
  }>({ title: '', orig_title: '', year: undefined, overview: '', rating: undefined, genres: '', country: '', language: '', studio: '' })
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!id) return
    const abortController = new AbortController()
    setLoading(true)
    setPersons([])
    setIsFavorited(false)
    Promise.all([
      seriesApi.detail(id),
      seriesApi.seasons(id),
    ])
      .then(([seriesRes, seasonsRes]) => {
        if (abortController.signal.aborted) return
        setSeries(seriesRes.data.data)
        const seasonData = seasonsRes.data.data || []
        setSeasons(seasonData)
        setLoading(false)

        // 批量获取各季观看状态（避免每个卡片独立请求导致429）
        if (user) {
          const watchedNums = new Set<number>()
          const progressPromises = seasonData
            .filter(s => s.episodes?.length > 0)
            .map(s => {
              const firstEp = s.episodes[0]
              return userApi.getProgress(firstEp.id)
                .then(res => {
                  if (abortController.signal.aborted) return
                  const progress = res.data.data
                  const duration = firstEp.duration || 3600
                  if (progress && progress.position >= duration * 0.9) {
                    watchedNums.add(s.season_num)
                  }
                })
                .catch(() => {})
            })
          Promise.all(progressPromises).then(() => {
            if (!abortController.signal.aborted) {
              setWatchedSeasonNums(watchedNums)
              const allHaveEpisodes = seasonData.every(s => s.episodes?.length > 0)
              setIsWatched(allHaveEpisodes && watchedNums.size === seasonData.length)
            }
          })
        }
      })
      .catch(() => {
        if (abortController.signal.aborted) return
        toast.error('加载剧集详情失败')
        navigate('/')
        setLoading(false)
      })

    // 非首屏：演职人员 + 收藏状态（不阻塞页面渲染）
    if (!abortController.signal.aborted) {
      seriesApi.getPersons(id)
        .then((res) => { if (!abortController.signal.aborted) setPersons(res.data.data || []) })
        .catch(() => {})
    }
    if (!abortController.signal.aborted && user) {
      userApi.checkFavorite(id)
        .then((res) => { if (!abortController.signal.aborted) setIsFavorited(res.data.data) })
        .catch(() => {})
    }

    // 获取播放列表
    if (!abortController.signal.aborted) {
      playlistApi.list()
        .then((res) => { if (!abortController.signal.aborted) setPlaylists(res.data.data || []) })
        .catch(() => {})
    }

    return () => abortController.abort()
  }, [id, navigate, toast, user])

  // 获取第一集用于播放
  const firstEpisode = seasons.length > 0 && seasons[0].episodes?.length > 0
    ? seasons[0].episodes[0]
    : null

  const handleFavorite = async () => {
    if (!series) return
    try {
      if (isFavorited) {
        await userApi.removeFavorite(series.id)
        setIsFavorited(false)
      } else {
        await userApi.addFavorite(series.id)
        setIsFavorited(true)
      }
    } catch {
      toast.error('收藏操作失败')
    }
  }

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!series) return
    try {
      await playlistApi.addItem(playlistId, series.id)
      toast.success('已添加到播放列表')
    } catch {
      toast.error('添加到播放列表失败')
    }
  }

  const handleMarkWatched = async () => {
    if (!id) return
    try {
      let allEpisodes: Array<{id: string; duration?: number}> = []
      for (const season of seasons) {
        if (season.episodes && season.episodes.length > 0) {
          allEpisodes = allEpisodes.concat(season.episodes)
        }
      }
      if (allEpisodes.length === 0) {
        toast.info('暂无剧集信息')
        return
      }
      if (isWatched) {
        await Promise.all(
          allEpisodes.map(ep => {
            const duration = ep.duration || 3600
            return userApi.updateProgress(ep.id, 0, duration)
          })
        )
        setIsWatched(false)
        setWatchedSeasonNums(new Set())
        toast.success(`已取消标记全部 ${allEpisodes.length} 集`)
      } else {
        await Promise.all(
          allEpisodes.map(ep => {
            const duration = ep.duration || 3600
            return userApi.updateProgress(ep.id, duration, duration)
          })
        )
        setIsWatched(true)
        setWatchedSeasonNums(new Set(seasons.filter(s => s.episodes?.length > 0).map(s => s.season_num)))
        toast.success(`已标记全部 ${allEpisodes.length} 集为已观看`)
      }
    } catch {
      toast.error('操作失败')
    }
  }

  const handleMarkSeasonWatched = async (seasonNum: number, watched: boolean) => {
    const targetSeason = seasons.find(s => s.season_num === seasonNum)
    if (!targetSeason?.episodes?.length) return
    try {
      if (watched) {
        await Promise.all(
          targetSeason.episodes.map(ep => {
            const duration = ep.duration || 3600
            return userApi.updateProgress(ep.id, duration, duration)
          })
        )
        setWatchedSeasonNums(prev => {
          const next = new Set(prev)
          next.add(seasonNum)
          return next
        })
        toast.success(`已标记第 ${seasonNum} 季为已观看`)
      } else {
        await Promise.all(
          targetSeason.episodes.map(ep => {
            const duration = ep.duration || 3600
            return userApi.updateProgress(ep.id, 0, duration)
          })
        )
        setWatchedSeasonNums(prev => {
          const next = new Set(prev)
          next.delete(seasonNum)
          return next
        })
        toast.success(`已取消标记第 ${seasonNum} 季`)
      }
    } catch {
      toast.error('操作失败')
    }
  }

  // ==================== 管理功能事件处理 ====================
  const handleManualMatch = () => {
    if (!series) return
    setMatchQuery(series.title)
    setMatchResults([])
    setMatchSource('tmdb')
    setShowMatchModal(true)
  }

  const handleMatchSearch = async () => {
    if (!matchQuery.trim()) return
    setMatchSearching(true)
    try {
      if (matchSource === 'tmdb') {
        const res = await adminApi.searchMetadata(matchQuery, 'tv')
        setMatchResults(res.data.data || [])
        if ((res.data.data || []).length === 0) {
          toast.info('TMDb 未找到匹配结果，请尝试其他关键词或切换到其他数据源')
        }
      } else if (matchSource === 'douban') {
        const res = await adminApi.searchDouban(matchQuery, series?.year || undefined)
        setMatchResults(res.data.data || [])
        if ((res.data.data || []).length === 0) {
          toast.info('豆瓣未找到匹配结果，请尝试其他关键词')
        }
      }
    } catch (err) {
      const errorMap: Record<string, string> = {
        tmdb: '搜索失败，请检查 TMDb API Key 或网络/代理配置',
        douban: '豆瓣搜索失败',
      }
      toast.error(formatErrMsg(err, errorMap[matchSource] || '搜索失败'))
    } finally {
      setMatchSearching(false)
    }
  }

  const handleMatchSelect = async (resultId: number | string) => {
    if (!id) return
    setMatchSelecting(true)
    try {
      const sourceNameMap: Record<string, string> = { tmdb: 'TMDb', douban: '豆瓣' }
      if (matchSource === 'tmdb') {
        await adminApi.matchSeriesMetadata(id, resultId as number)
      } else if (matchSource === 'douban') {
        await adminApi.matchSeriesDouban(id, resultId as string)
      }
      // 重新获取剧集详情和季信息以刷新页面
      const [seriesRes, seasonsRes] = await Promise.all([
        seriesApi.detail(id),
        seriesApi.seasons(id),
      ])
      setSeries(seriesRes.data.data)
      const seasonData = seasonsRes.data.data || []
      setSeasons(seasonData)
      setShowMatchModal(false)
      setPosterVersion(Date.now())
      toast.success(`剧集匹配成功（来源：${sourceNameMap[matchSource]}）`)
    } catch {
      toast.error('匹配失败')
    } finally {
      setMatchSelecting(false)
    }
  }

  const handleUnmatch = async () => {
    if (!id) return
    try {
      await adminApi.unmatchSeriesMetadata(id)
      const res = await seriesApi.detail(id)
      setSeries(res.data.data)
      setShowUnmatchConfirm(false)
      toast.success('已解除匹配')
    } catch {
      toast.error('解除匹配失败')
    }
  }

  const handleRefreshMetadata = () => {
    setShowRefreshModal(true)
  }

  const handleRefreshSuccess = async () => {
    if (!id) return
    try {
      const res = await seriesApi.detail(id)
      setSeries(res.data.data)
      setPosterVersion(Date.now())
      toast.success('元数据刷新成功')
    } catch {
      // ignore
    }
  }

  const handleEditMetadata = () => {
    if (!series) return
    setEditForm({
      title: series.title || '',
      orig_title: series.orig_title || '',
      year: series.year > 0 ? series.year : undefined,
      overview: series.overview || '',
      rating: series.rating > 0 ? series.rating : undefined,
      genres: series.genres || '',
      country: series.country || '',
      language: series.language || '',
      studio: series.studio || '',
    })
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    if (!id) return
    try {
      await adminApi.updateSeriesMetadata(id, editForm)
      const res = await seriesApi.detail(id)
      setSeries(res.data.data)
      setShowEditModal(false)
      setPosterVersion(Date.now())
      toast.success('元数据已更新')
    } catch {
      toast.error('更新元数据失败')
    }
  }

  const handleDelete = async (deleteFiles: boolean) => {
    if (!id) return
    try {
      await adminApi.deleteSeries(id, deleteFiles)
      setShowDeleteConfirm(false)
      toast.success('剧集已删除')
      navigate(-1)
    } catch {
      toast.error('删除剧集失败')
    }
  }

  if (loading || !series) {
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
              </div>
              <div className="skeleton h-20 w-full rounded-xl" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.page, ease: easeSmooth }}
      className="relative -mx-4 -mt-16 sm:-mx-6 lg:-mx-8"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ============================================================
          英雄区 —— 全宽背景图 + Logo + 信息
          ============================================================ */}
      <SeriesHeroSection
        key={series.id}
        series={series}
        isFavorited={isFavorited}
        isWatched={isWatched}
        scraping={scraping}
        isAdmin={isAdmin}
        firstEpisode={firstEpisode}
        posterVersion={posterVersion}
        playlists={playlists}
        onFavorite={handleFavorite}
        onMarkWatched={handleMarkWatched}
        onAddToPlaylist={handleAddToPlaylist}
        onRefreshMetadata={handleRefreshMetadata}
        onManualMatch={handleManualMatch}
        onUnmatch={() => setShowUnmatchConfirm(true)}
        onEditMetadata={handleEditMetadata}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      {/* ============================================================
          内容区
          ============================================================ */}
      <div className="mx-auto space-y-8 px-4 pt-6 sm:px-6 lg:px-8">

        {/* 剧情简介 */}
        {series.overview && (
          <section>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {series.overview}
            </p>
          </section>
        )}

        {/* 季列表 */}
        <SeasonGrid
          seriesId={series.id}
          seasons={seasons}
          isFavorited={isFavorited}
          watchedSeasonNums={watchedSeasonNums}
          onFavorite={handleFavorite}
          onMarkSeasonWatched={handleMarkSeasonWatched}
          onManualMatch={handleManualMatch}
          onUnmatch={() => setShowUnmatchConfirm(true)}
          onRefreshMetadata={() => setShowRefreshModal(true)}
          onEditMetadata={handleEditMetadata}
          onDelete={() => setShowDeleteConfirm(true)}
        />

        {/* 演职人员 */}
        <CastGrid persons={persons} />
      </div>

      {/* ==================== 手动匹配弹窗 ==================== */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="relative w-full max-w-2xl rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
            <h3 className="mb-4 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>手动匹配剧集</h3>
            {/* 数据源切换 */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => { setMatchSource('tmdb'); setMatchResults([]) }}
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
                onClick={() => { setMatchSource('douban'); setMatchResults([]) }}
                className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all"
                style={{
                  background: matchSource === 'douban' ? 'linear-gradient(135deg, #00b414, #009910)' : 'var(--bg-surface)',
                  color: matchSource === 'douban' ? '#fff' : 'var(--text-secondary)',
                  border: matchSource === 'douban' ? 'none' : '1px solid var(--border-default)',
                }}
              >
                🎯 豆瓣
              </button>

            </div>
            <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              {{
                tmdb: '搜索 TMDb 数据库，适合欧美电视剧。',
                douban: '搜索豆瓣数据库，适合国产剧集和电影。',
              }[matchSource]}
            </p>
            <div className="mb-4 flex gap-2">
              <input
                value={matchQuery}
                onChange={(e) => setMatchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMatchSearch()}
                placeholder="输入剧集名称搜索..."
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
                {matchSearching ? '搜索中...' : '搜索'}
              </button>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {matchResults.map((result: any) => {
                let displayTitle = '', displayOrigTitle = '', displayYear = '', displayOverview = '', posterUrl: string | null = null
                let displayRating = 0, resultKey: string | number = result.id

                if (matchSource === 'tmdb') {
                  displayTitle = result.name || result.title
                  displayOrigTitle = result.original_name || result.original_title
                  displayYear = (result.first_air_date || result.release_date)?.split('-')[0] || ''
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

                return (
                  <button
                    key={resultKey}
                    onClick={() => handleMatchSelect(result.id)}
                    disabled={matchSelecting}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
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
                  输入关键词搜索 {{ tmdb: 'TMDb', douban: '豆瓣' }[matchSource]} 数据库
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowMatchModal(false)}
                disabled={matchSelecting}
                className="rounded-xl px-5 py-2 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
              >
                取消
              </button>
            </div>
            {/* 匹配中 loading 遮罩 */}
            {matchSelecting && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                <RefreshCw size={32} className="animate-spin text-neon mb-3" />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>正在匹配元数据...</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>请稍候，正在获取并同步剧集信息</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 解除匹配确认弹窗 ==================== */}
      {showUnmatchConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
            <h3 className="mb-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>解除匹配剧集</h3>
            <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
              确定要解除此剧集的元数据匹配吗？这将清除所有从 TMDb/豆瓣获取的信息（简介、海报、评分等），但保留原始的剧集名称。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUnmatchConfirm(false)}
                className="rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
              >
                取消
              </button>
              <button
                onClick={handleUnmatch}
                className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-500"
              >
                确认解除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 编辑元数据弹窗 ==================== */}
      {showEditModal && (
        <EditMetadataModal
          type="series"
          id={id!}
          tmdbId={series.tmdb_id}
          mediaType="tv"
          editForm={editForm}
          setEditForm={setEditForm}
          currentPoster={streamApi.getSeriesPosterUrl(series.id)}
          currentBackdrop={streamApi.getSeriesBackdropUrl(series.id)}
          hasPoster={!!series.poster_path}
          hasBackdrop={!!series.backdrop_path}
          onSave={handleEditSave}
          onClose={() => setShowEditModal(false)}
        />
      )}

      <RefreshSingleModal
        open={showRefreshModal}
        mediaId={id!}
        mediaTitle={series?.title || ''}
        onClose={() => setShowRefreshModal(false)}
        onSuccess={handleRefreshSuccess}
        onScrape={adminApi.scrapeSeriesMetadata}
      />

      {/* ==================== 删除确认弹窗 ==================== */}
      <DeleteConfirmModal
        open={showDeleteConfirm}
        title="删除剧集"
        description="从媒体库移除后，所选视频文件将不再被扫描添加到当前媒体库中。请确认是否同时删除关联的视频文件。"
        hint="删除剧集合集将同时移除该系列下所有季和集的记录及缓存文件。"
        onClose={() => setShowDeleteConfirm(false)}
        onDelete={handleDelete}
      />
    </motion.div>
  )
}


