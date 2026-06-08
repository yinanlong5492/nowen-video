import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { seriesApi, userApi, adminApi, streamApi, playlistApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/components/Toast'
import { SeasonHeroSection, CastGrid } from '@/components/media'
import EpisodeSlideCard from '@/components/EpisodeSlideCard'
import EpisodeGrid from '@/components/EpisodeGrid'
import RefreshSingleModal from '@/components/RefreshSingleModal'
import EditMetadataModal from '@/components/EditMetadataModal'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import { formatErrMsg } from '@/utils/error'
import type { Series, Media, WatchHistory, MediaPerson, Playlist } from '@/types'
import { ArrowLeft, ChevronRight, GalleryHorizontal, ChevronDown, List } from 'lucide-react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { easeSmooth, durations } from '@/lib/motion'

export default function SeasonDetailPage() {
  const { seriesId, seasonNum } = useParams<{ seriesId: string; seasonNum: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const user = useAuthStore((s) => s.user)
  const [series, setSeries] = useState<Series | null>(null)
  const [seasons, setSeasons] = useState<{ season_num: number; episode_count: number }[]>([])
  const [episodes, setEpisodes] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [displayMode, setDisplayModeState] = useState<'slide' | 'number'>('slide')
  const [currentSegmentIndex, setCurrentSegmentIndexState] = useState(0)
  const SEGMENT_SIZE = 30

  // 从 URL 参数读取分段索引和显示模式
  const urlSegmentIndex = parseInt(searchParams.get('segment') || '0', 10) || 0
  const urlDisplayMode = (searchParams.get('mode') || 'slide') as 'slide' | 'number'

  // 设置分段索引时同时更新 URL
  const setCurrentSegmentIndex = (index: number) => {
    setCurrentSegmentIndexState(index)
    const params = new URLSearchParams(searchParams)
    params.set('segment', index.toString())
    setSearchParams(params, { replace: true })
  }

  // 设置显示模式时同时更新 URL
  const setDisplayMode = (mode: 'slide' | 'number') => {
    setDisplayModeState(mode)
    const params = new URLSearchParams(searchParams)
    params.set('mode', mode)
    setSearchParams(params, { replace: true })
  }
  const [historyMap, setHistoryMap] = useState<Record<string, WatchHistory>>({})
  const [persons, setPersons] = useState<MediaPerson[]>([])
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [showRefreshModal, setShowRefreshModal] = useState(false)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false)
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
    genres?: string;
  }>>([])
  const [matchSearching, setMatchSearching] = useState(false)
  const [matchSelecting, setMatchSelecting] = useState(false)
  const [matchSource, setMatchSource] = useState<'tmdb' | 'douban'>('tmdb')
  const [editForm, setEditForm] = useState<{
    title: string; orig_title: string; year: number | undefined; overview: string;
    rating: number | undefined; genres: string; country: string; language: string; studio: string
  }>({ title: '', orig_title: '', year: undefined, overview: '', rating: undefined, genres: '', country: '', language: '', studio: '' })
  const [isFavorited, setIsFavorited] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const CLICKED_KEY = `season_clicked_${seriesId}_${seasonNum || '1'}`

  const [clickedEpisodeIds, setClickedEpisodeIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem(CLICKED_KEY)
      if (stored) return new Set(JSON.parse(stored))
    } catch {}
    return new Set()
  })
  const isAdmin = user?.role === 'admin'
  const [currentSeasonNum, setCurrentSeasonNum] = useState<number>(() => {
    const num = parseInt(seasonNum || '1')
    return isNaN(num) ? 1 : num
  })

  // 监听路由参数变化，同步更新状态
  useEffect(() => {
    const num = parseInt(seasonNum || '1')
    const newSeasonNum = isNaN(num) ? 1 : num
    if (newSeasonNum !== currentSeasonNum) {
      setCurrentSeasonNum(newSeasonNum)
      setCurrentSegmentIndex(0)
    }
  }, [seasonNum, currentSeasonNum])

  const slideContainerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [posterVersion, setPosterVersion] = useState<number>(() => Date.now())

  useEffect(() => {
    if (!seriesId) return
    
    const abortController = new AbortController()
    setLoading(true)

    Promise.all([
      seriesApi.detail(seriesId),
      seriesApi.seasons(seriesId),
      seriesApi.seasonEpisodes(seriesId, currentSeasonNum),
    ])
      .then(([seriesRes, seasonsRes, seasonRes]) => {
        if (abortController.signal.aborted) return
        
        const seriesData = seriesRes.data?.data
        if (!seriesData) {
          toast.error('剧集数据为空')
          navigate('/')
          setLoading(false)
          return
        }
        
        setSeries(seriesData)
        setSeasons(seasonsRes.data.data || [])
        setEpisodes(seasonRes.data.data || [])
        setLoading(false)
        
        // 获取观看进度状态（需要等待 seriesData 加载完成）
        if (user) {
          const episode = seriesData.episodes?.[0]
          if (episode) {
            userApi.getProgress(episode.id)
              .then((res) => {
                if (!abortController.signal.aborted) {
                  const progress = res.data.data
                  const duration = episode.duration || 3600
                  if (progress && progress.position >= duration * 0.9) {
                    setIsWatched(true)
                  }
                }
              })
              .catch(() => {})
          }
        }
      })
      .catch((error) => {
        if (abortController.signal.aborted) return
        console.error('加载季详情失败:', error)
        toast.error('加载季详情失败')
        navigate('/')
        setLoading(false)
      })

    // 非首屏：播放历史 + 演职人员（不阻塞页面渲染）
    const fetchHistory = async () => {
      try {
        // 仅登录用户请求播放历史
        if (!user) return
        
        const res = await userApi.history(1, 200)
        if (abortController.signal.aborted) return
        
        const map: Record<string, WatchHistory> = {}
        for (const h of (res.data.data || [])) {
          map[h.media_id] = h
        }
        setHistoryMap(map)
      } catch (error) {
        console.warn('加载播放历史失败:', error)
      }
    }

    const fetchPersons = async () => {
      try {
        const res = await seriesApi.getPersons(seriesId)
        if (abortController.signal.aborted) return
        
        setPersons(res.data.data || [])
      } catch (error) {
        console.warn('加载演职人员失败:', error)
      }
    }

    // 获取收藏状态
    const fetchFavoriteStatus = async () => {
      if (!user) return
      try {
        const res = await userApi.checkFavorite(seriesId)
        if (!abortController.signal.aborted) {
          setIsFavorited(res.data.data)
        }
      } catch {
        setIsFavorited(false)
      }
    }

    // 并行执行非首屏请求
    fetchHistory()
    fetchPersons()
    fetchFavoriteStatus()

    // 获取播放列表
    playlistApi.list()
      .then((res) => { if (!abortController.signal.aborted) setPlaylists(res.data.data || []) })
      .catch(() => {})

    return () => abortController.abort()
  }, [seriesId, currentSeasonNum, navigate, toast, user])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSeasonDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
  }, [])

  // 从 URL 参数恢复分段索引
  useEffect(() => {
    if (urlSegmentIndex !== currentSegmentIndex) {
      setCurrentSegmentIndexState(urlSegmentIndex)
    }
  }, [urlSegmentIndex, currentSegmentIndex])

  // 从 URL 参数恢复显示模式
  useEffect(() => {
    if (urlDisplayMode !== displayMode) {
      setDisplayModeState(urlDisplayMode)
    }
  }, [urlDisplayMode, displayMode])

  // 切换季/剧集时从 sessionStorage 恢复已点击集数
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(CLICKED_KEY)
      if (stored) {
        setClickedEpisodeIds(new Set(JSON.parse(stored)))
      } else {
        setClickedEpisodeIds(new Set())
      }
    } catch {}
  }, [CLICKED_KEY])

  // 监听路由变化，从播放页返回时重新加载播放历史
  useEffect(() => {
    if (!user) return
    
    const fetchHistory = async () => {
      try {
        const res = await userApi.history(1, 200)
        const map: Record<string, WatchHistory> = {}
        for (const h of (res.data.data || [])) {
          map[h.media_id] = h
        }
        setHistoryMap(map)
      } catch (error) {
        console.warn('重新加载播放历史失败:', error)
      }
    }
    
    fetchHistory()
  }, [location.pathname, user])

  // 计算分段 - 必须放在条件返回之前（React Hooks 规则）
  // 按集数（episode_num）的数字值分段，每30集一个区间，只显示包含有效集数的分段
  const segments = useMemo(() => {
    if (episodes.length === 0) {
      return []
    }
    
    // 获取所有有效集数（过滤负数、0和非数字）
    const episodeNums = new Set<number>()
    for (const ep of episodes) {
      const num = ep.episode_num
      if (typeof num === 'number' && !isNaN(num) && num > 0) {
        episodeNums.add(num)
      }
    }
    
    // 如果没有有效集数，返回空数组
    if (episodeNums.size === 0) {
      return []
    }
    
    // 找出最小和最大集数
    const minEp = Math.min(...episodeNums)
    const maxEp = Math.max(...episodeNums)
    
    const result: { start: number; end: number }[] = []
    
    // 计算第一个分段的起始值（对齐到30的倍数）
    let currentStart = Math.floor((minEp - 1) / SEGMENT_SIZE) * SEGMENT_SIZE + 1
    
    while (currentStart <= maxEp) {
      const currentEnd = currentStart + SEGMENT_SIZE - 1
      
      // 检查这个区间是否包含有效集数
      let hasValidEpisode = false
      for (let num = currentStart; num <= Math.min(currentEnd, maxEp); num++) {
        if (episodeNums.has(num)) {
          hasValidEpisode = true
          break
        }
      }
      
      if (hasValidEpisode) {
        result.push({
          start: currentStart,
          end: Math.min(currentEnd, maxEp)
        })
      }
      
      currentStart = currentEnd + 1
    }
    
    return result
  }, [episodes])

  // 从历史状态中读取上一次播放的集数，自动定位到正确的分段
  useEffect(() => {
    if (loading || episodes.length === 0 || segments.length === 0) return
    
    const episodeNumFromHistory = window.history.state?.episodeNum
    if (typeof episodeNumFromHistory === 'number' && episodeNumFromHistory > 0) {
      // 找到该集数所在的分段索引
      const targetIndex = segments.findIndex(seg => 
        episodeNumFromHistory >= seg.start && episodeNumFromHistory <= seg.end
      )
      if (targetIndex >= 0 && targetIndex !== currentSegmentIndex) {
        setCurrentSegmentIndex(targetIndex)
        // 清除历史状态中的集数，避免再次返回时重复定位
        window.history.replaceState({ ...window.history.state, episodeNum: undefined }, '')
      }
    }
  }, [loading, episodes, segments, currentSegmentIndex])

  // 当前分段的集数
  const currentSegment = segments[currentSegmentIndex] || { start: 1, end: SEGMENT_SIZE }
  
  // 按集数（episode_num）过滤并按数字顺序排序
  const displayedEpisodes = useMemo(() => {
    return episodes
      .filter(ep => ep.episode_num >= currentSegment.start && ep.episode_num <= currentSegment.end)
      .sort((a, b) => a.episode_num - b.episode_num)
  }, [episodes, currentSegment])

  const handleSeasonChange = (seasonNum: number) => {
    setShowSeasonDropdown(false)
    navigate(`/series/${seriesId}/season/${seasonNum}`, { replace: true })
  }

  const handleFavorite = async () => {
    if (!seriesId) return
    try {
      if (isFavorited) {
        await userApi.removeFavorite(seriesId)
        setIsFavorited(false)
      } else {
        await userApi.addFavorite(seriesId)
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
    if (!series) return
    try {
      if (episodes.length === 0) {
        toast.info('暂无剧集信息')
        return
      }
      if (isWatched) {
        await Promise.all(
          episodes.map(ep => {
            const duration = ep.duration || 3600
            return userApi.updateProgress(ep.id, 0, duration)
          })
        )
        setIsWatched(false)
        toast.success(`已取消标记全部 ${episodes.length} 集`)
      } else {
        await Promise.all(
          episodes.map(ep => {
            const duration = ep.duration || 3600
            return userApi.updateProgress(ep.id, duration, duration)
          })
        )
        setIsWatched(true)
        toast.success(`已标记全部 ${episodes.length} 集为已观看`)
      }
    } catch {
      toast.error('操作失败')
    }
  }

  const handleRefreshMetadata = () => {
    setShowMoreMenu(false)
    setShowRefreshModal(true)
  }

  const handleRefreshSuccess = () => {
    setPosterVersion(Date.now())
    toast.success('元数据刷新成功')
  }

  const handleManualMatch = () => {
    if (!series) return
    setMatchQuery(series.title)
    setMatchResults([])
    setMatchSource('tmdb')
    setShowMatchModal(true)
    setShowMoreMenu(false)
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
    if (!seriesId) return
    setMatchSelecting(true)
    try {
      const sourceNameMap: Record<string, string> = { tmdb: 'TMDb', douban: '豆瓣' }
      if (matchSource === 'tmdb') {
        await adminApi.matchSeriesMetadata(seriesId, resultId as number)
      } else if (matchSource === 'douban') {
        await adminApi.matchSeriesDouban(seriesId, resultId as string)
      }
      const [seriesRes, seasonsRes] = await Promise.all([
        seriesApi.detail(seriesId),
        seriesApi.seasons(seriesId),
      ])
      setSeries(seriesRes.data.data)
      setSeasons(seasonsRes.data.data || [])
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
    if (!seriesId) return
    try {
      await adminApi.unmatchSeriesMetadata(seriesId)
      const res = await seriesApi.detail(seriesId)
      setSeries(res.data.data)
      setShowUnmatchConfirm(false)
      setShowMoreMenu(false)
      setPosterVersion(Date.now())
      toast.success('已解除匹配')
    } catch {
      toast.error('解除匹配失败')
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
    setShowMoreMenu(false)
  }

  const handleEditSave = async () => {
    if (!seriesId) return
    try {
      await adminApi.updateSeriesMetadata(seriesId, editForm)
      const res = await seriesApi.detail(seriesId)
      setSeries(res.data.data)
      setShowEditModal(false)
      setPosterVersion(Date.now())
      toast.success('元数据已更新')
    } catch {
      toast.error('更新失败')
    }
  }

  const handleDelete = async (deleteFiles: boolean) => {
    if (!seriesId) return
    try {
      await adminApi.deleteSeason(seriesId, currentSeasonNum, deleteFiles)
      setShowDeleteConfirm(false)
      toast.success('本季已删除')
      navigate(-1)
    } catch {
      toast.error('删除失败')
    }
  }

  if (loading) {
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
          <div className="space-y-4 px-4">
            <div className="skeleton h-10 w-2/3 rounded-lg" />
            <div className="skeleton h-6 w-1/2 rounded-lg" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-48 rounded-xl" />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  if (!series) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
          无法加载剧集数据
        </div>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-6 py-2 rounded-lg"
          style={{
            background: 'var(--neon-blue)',
            color: 'var(--text-on-neon)',
          }}
        >
          返回首页
        </button>
      </div>
    )
  }

  const seasonNumber = currentSeasonNum
  const firstEpisodeId = episodes.length > 0 ? episodes[0].id : undefined

  const handlePlayEpisode = (id: string) => {
    setClickedEpisodeIds(prev => {
      const next = new Set(prev).add(id)
      try { sessionStorage.setItem(CLICKED_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
    setTimeout(() => {
      navigate(`/play/${id}`)
    }, 0)
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
          英雄区 —— 全宽背景图 + 季海报 + 季信息
          ============================================================ */}
      <SeasonHeroSection
        series={series}
        seasonNum={seasonNumber}
        episodeCount={episodes.length}
        posterVersion={posterVersion}
        firstEpisodeId={firstEpisodeId}
        overview={series.overview}
        isAdmin={isAdmin}
        showMoreMenu={showMoreMenu}
        showPlaylistMenu={showPlaylistMenu}
        playlists={playlists}
        onToggleMoreMenu={() => setShowMoreMenu(!showMoreMenu)}
        onTogglePlaylistMenu={() => setShowPlaylistMenu(!showPlaylistMenu)}
        onRefreshMetadata={handleRefreshMetadata}
        onManualMatch={handleManualMatch}
        onUnmatch={() => setShowUnmatchConfirm(true)}
        onEditMetadata={handleEditMetadata}
        onDelete={() => setShowDeleteConfirm(true)}
        isFavorite={isFavorited}
        isWatched={isWatched}
        onToggleFavorite={handleFavorite}
        onMarkWatched={handleMarkWatched}
        onAddToPlaylist={handleAddToPlaylist}
      />

      {/* ============================================================
          内容区
          ============================================================ */}
      <div className="mx-auto space-y-8 px-4 pt-6 sm:px-6 lg:px-8">
        {/* 集列表 */}
        <section>
          {/* 季选择器 + 分段指示器 + 展示模式切换 */}
          <div className="mb-4 flex items-center gap-4">
            {/* 左侧：季选择下拉按钮 */}
            <div className="relative flex-shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200"
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <span>{currentSeasonNum === 0 ? '特别篇' : `第 ${currentSeasonNum} 季`}</span>
                <ChevronDown size={14} className={clsx('transition-transform duration-200', showSeasonDropdown && 'rotate-180')} />
              </button>
              {/* 下拉菜单 */}
              <AnimatePresence>
                {showSeasonDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full z-50 mt-1 min-w-[120px] overflow-hidden rounded-lg"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-default)',
                      boxShadow: 'var(--shadow-elevated)',
                    }}
                  >
                    <div className="max-h-48 overflow-y-auto p-1">
                      {seasons.map((s) => (
                        <button
                          key={s.season_num}
                          onClick={() => handleSeasonChange(s.season_num)}
                          className={clsx(
                            'flex w-full items-center px-3 py-2 text-sm transition-colors rounded-md',
                            currentSeasonNum === s.season_num ? '' : 'hover:bg-[var(--nav-hover-bg)]'
                          )}
                          style={{
                            background: currentSeasonNum === s.season_num ? 'var(--neon-blue-10)' : 'transparent',
                            color: currentSeasonNum === s.season_num ? 'var(--neon-blue)' : 'var(--text-secondary)',
                          }}
                        >
                          <span>{s.season_num === 0 ? '特别篇' : `第 ${s.season_num} 季`}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 中间：分段指示器 */}
            <div className="flex-1 flex items-center overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {segments.map((seg, index) => (
                <span key={index}>
                  {index > 0 && <span className="mx-1" style={{ color: 'var(--text-muted)' }}>/</span>}
                  <button
                    onClick={() => setCurrentSegmentIndex(index)}
                    className="flex-shrink-0 px-3 py-1.5 text-sm font-medium transition-colors hover:text-neon-blue"
                    style={index === currentSegmentIndex ? {
                      color: 'var(--neon-blue)',
                    } : {
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {seg.start}-{seg.end}
                  </button>
                </span>
              ))}
            </div>

            {/* 右侧：展示模式切换 */}
            <div className="flex items-center gap-1 rounded-lg p-0.5 flex-shrink-0" style={{ background: 'var(--bg-surface)' }}>
              <button
                onClick={() => setDisplayMode('slide')}
                className={clsx(
                  'flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200',
                  displayMode === 'slide' ? '' : 'hover:bg-[var(--nav-hover-bg)]'
                )}
                style={displayMode === 'slide' ? {
                  background: 'var(--bg-card)',
                  color: 'var(--neon-blue)',
                  boxShadow: 'var(--shadow-elevated)',
                } : { color: 'var(--text-muted)' }}
                title="幻灯片模式"
              >
                <GalleryHorizontal size={14} />
              </button>
              <button
                onClick={() => setDisplayMode('number')}
                className={clsx(
                  'flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200',
                  displayMode === 'number' ? '' : 'hover:bg-[var(--nav-hover-bg)]'
                )}
                style={displayMode === 'number' ? {
                  background: 'var(--bg-card)',
                  color: 'var(--neon-blue)',
                  boxShadow: 'var(--shadow-elevated)',
                } : { color: 'var(--text-muted)' }}
                title="序号模式"
              >
                <List size={14} />
              </button>
            </div>
          </div>

          {/* 幻灯片模式 */}
          {displayMode === 'slide' && (
            <div className="relative group/slider">
              <button
                onClick={() => {
                  const el = slideContainerRef.current
                  if (el) el.scrollBy({ left: -320, behavior: 'smooth' })
                }}
                className="absolute -left-2 top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition-all duration-300 group-hover/slider:opacity-100 hover:scale-110"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                  boxShadow: 'var(--shadow-elevated)',
                }}
              >
                <ArrowLeft size={16} />
              </button>

              <div
                ref={slideContainerRef}
                className="flex gap-3 overflow-x-auto pb-2 px-2 -mx-2 scrollbar-hide"
                style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory' }}
              >
                {displayedEpisodes.map((ep) => (
                  <EpisodeSlideCard key={ep.id} episode={ep} historyRecord={historyMap[ep.id]} seriesId={seriesId} seasonNum={currentSeasonNum} onManualMatch={handleManualMatch} onUnmatch={() => setShowUnmatchConfirm(true)} onRefreshMetadata={() => setShowRefreshModal(true)} onEditMetadata={handleEditMetadata} onDelete={() => setShowDeleteConfirm(true)} />
                ))}
              </div>

              <button
                onClick={() => {
                  const el = slideContainerRef.current
                  if (el) el.scrollBy({ left: 320, behavior: 'smooth' })
                }}
                className="absolute -right-2 top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition-all duration-300 group-hover/slider:opacity-100 hover:scale-110"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                  boxShadow: 'var(--shadow-elevated)',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* 序号模式 */}
          {displayMode === 'number' && (
            displayedEpisodes.length === 0 ? (
              <div className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                该分段暂无剧集
              </div>
            ) : (
              <EpisodeGrid
                episodes={displayedEpisodes}
                historyMap={historyMap}
                clickedEpisodeIds={clickedEpisodeIds}
                onPlay={handlePlayEpisode}
              />
            )
          )}
        </section>

        {/* 演职人员 */}
        <CastGrid persons={persons} />
      </div>

      <RefreshSingleModal
        open={showRefreshModal}
        mediaId={seriesId!}
        mediaTitle={series?.title || ''}
        onClose={() => setShowRefreshModal(false)}
        onSuccess={handleRefreshSuccess}
        onScrape={(id, replaceImages) => adminApi.scrapeSeriesMetadata(id, replaceImages)}
      />

      {showMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="relative w-full max-w-2xl rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
            <h3 className="mb-4 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>手动匹配剧集</h3>
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
            </div>
            <button
              onClick={() => setShowMatchModal(false)}
              className="mt-4 w-full rounded-xl py-2.5 text-sm font-medium transition-colors"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              关闭
            </button>
          </div>
        </div>
      )}

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

      {showEditModal && (
        <EditMetadataModal
          type="series"
          id={seriesId!}
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

      <DeleteConfirmModal
        open={showDeleteConfirm}
        title="删除本季"
        description="从媒体库移除后，所选视频文件将不再被扫描添加到当前媒体库中。请确认是否同时删除关联的视频文件。"
        hint="删除本季将移除当前季下所有剧集的记录及缓存文件。"
        onClose={() => setShowDeleteConfirm(false)}
        onDelete={handleDelete}
      />
    </motion.div>
  )
}
