import { musicApi } from '@/api'
import { useMusicPlayerStore } from '@/stores/musicPlayer'
import { Music, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'

// 格式化时长为 mm:ss
const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

type SidebarTab = 'queue' | 'lyrics'

interface LyricLine {
  time: number
  text: string
}

// 解析LRC格式歌词
const parseLRC = (lyrics: string): LyricLine[] => {
  if (!lyrics) return []
  const lines: LyricLine[] = []
  const textLines = lyrics.split('\n')

  for (const line of textLines) {
    // 支持多种时间戳格式：[mm:ss], [mm:ss.xx], [mm:ss.xxx]
    const timeRegex = /\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\]/
    const match = line.match(timeRegex)
    
    let currentTime = -1 // 默认设为-1，表示无效

    if (match) {
      const min = parseInt(match[1]) || 0
      const sec = parseInt(match[2]) || 0
      const msStr = match[3] || ''
      let ms = 0
      
      // ✅ 修复毫秒计算
      if (msStr) {
        ms = parseInt(msStr)
        // 处理 2位 毫秒：xx → xx0
        if (msStr.length === 2) {
          ms = ms * 10
        }
        // 3位 毫秒直接用
      }
      
      currentTime = min * 60 + sec + ms / 1000
    }

    const text = line.replace(/\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\]/g, '').trim()
    // 只有当时间戳有效且有文本时才添加
    if (text && currentTime >= 0) {
      lines.push({ time: currentTime, text })
    }
  }
  
  // 按时间排序
  const sorted = lines.sort((a, b) => a.time - b.time)
  
  return sorted
}

export default function MusicPlayerSidebar() {
  const { currentTrack, playQueue, removeFromQueue, clearQueue, currentTime } = useMusicPlayerStore()
  const [activeTab, setActiveTab] = useState<SidebarTab>('queue')
  const [rawLyrics, setRawLyrics] = useState<string>('')
  const [loadingLyrics, setLoadingLyrics] = useState(false)
  const [failedCover, setFailedCover] = useState(false)

  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const activeLineRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const lastScrolledIndex = useRef(-1)
  const isProcessingClick = useRef(false)

  // 用户滚动控制（防止手动拖动被抢）
  const isUserScrolling = useRef(false)
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 缓存解析
  const lyricLines = useMemo(() => {
    activeLineRefs.current.clear()  // ✅ 歌词变化时清空引用
    return parseLRC(rawLyrics)
  }, [rawLyrics])

  // 实时计算当前歌词行
  const currentLineIndex = useMemo(() => {
    if (lyricLines.length === 0) return -1
    
    // ✅ 找到真正第一句歌词开始的时间（跳过时间戳为0的歌曲信息行）
    let firstValidLyricTime = 0
    for (let i = 0; i < lyricLines.length; i++) {
      if (lyricLines[i].time > 0) {
        firstValidLyricTime = lyricLines[i].time
        break
      }
    }
    
    if (currentTime < firstValidLyricTime - 0.05) {
      return -1
    }
    
    // 正常查找
    for (let i = lyricLines.length - 1; i >= 0; i--) {
      if (currentTime >= lyricLines[i].time - 0.05) {
        return i
      }
    }
    return -1
  }, [currentTime, lyricLines])

  // 核心：唯一滚动逻辑（无冲突！）
  useEffect(() => {
    const container = lyricsContainerRef.current
    if (!container || activeTab !== 'lyrics') return

    // 1. 无歌词 / 未播放 → 强制置顶
    if (lyricLines.length === 0 || currentLineIndex < 0) {
      container.scrollTop = 0
      lastScrolledIndex.current = -1
      return
    }

    // 2. 用户手动滚动时不干预
    if (isUserScrolling.current) return

    // 3. 同一行不重复滚动
    if (currentLineIndex === lastScrolledIndex.current) return

    // 4. 执行正常居中滚动
    lastScrolledIndex.current = currentLineIndex
    requestAnimationFrame(() => {
      const line = activeLineRefs.current.get(currentLineIndex)
      if (!line) return

      const ch = container.clientHeight
      const lh = line.offsetHeight
      const containerRect = container.getBoundingClientRect()
      const lineRect = line.getBoundingClientRect()
      const lineTopInContainer = lineRect.top - containerRect.top + container.scrollTop
      const top = lineTopInContainer - ch / 2 + lh / 2
      const maxScroll = container.scrollHeight - ch
      const finalTop = Math.max(0, Math.min(top, maxScroll))

      if (Math.abs(container.scrollTop - finalTop) > 20) {
        container.scrollTop = finalTop
      }
    })
  }, [currentLineIndex, activeTab, lyricLines.length])

  // 用户滚动监听
  useEffect(() => {
    const el = lyricsContainerRef.current
    if (!el) return

    const onScroll = () => {
      isUserScrolling.current = true
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
      scrollTimeout.current = setTimeout(() => {
        isUserScrolling.current = false
      }, 2000)
    }

    el.addEventListener('scroll', onScroll)
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    }
  }, [])

  // 切换歌曲 → 重置歌词 + 滚动条 + 封面状态
  useEffect(() => {
    setRawLyrics('')
    setFailedCover(false)
    lastScrolledIndex.current = -1
    isUserScrolling.current = false
    activeLineRefs.current.clear()  // ✅ 清空引用Map

    // 重置滚动位置
    if (lyricsContainerRef.current && activeTab === 'lyrics') {
      lyricsContainerRef.current.scrollTop = 0
    }

    if (activeTab === 'lyrics' && currentTrack?.id) {
      loadLyrics(currentTrack.id)
    }
  }, [currentTrack?.id, activeTab])

  // 加载歌词
  const loadLyrics = useCallback(async (trackId: string) => {
    if (!trackId) return
    setLoadingLyrics(true)
    try {
      const res = await musicApi.getLyrics(trackId)
      if (res && res.data && typeof res.data.data === 'string') {
        setRawLyrics(res.data.data)
      } else {
        setRawLyrics('')
      }
    } catch (err) {
      console.error('Failed to load lyrics:', err)
      setRawLyrics('')
    } finally {
      setLoadingLyrics(false)
    }
  }, [])

  // 标签切换
  const handleTabChange = useCallback((tab: SidebarTab, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isProcessingClick.current) return
    isProcessingClick.current = true
    setTimeout(() => (isProcessingClick.current = false), 300)
    setActiveTab(tab)
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden glass-panel-strong" style={{ width: 280, borderLeft: '1px solid var(--border-default)' }}>
      {/* 正在播放 */}
      <div className="pt-6">
        <h2 className="text-sm font-semibold text-theme-primary tracking-wide font-display mb-4 pl-3">正在播放</h2>
        {currentTrack ? (
          <div className="px-4">
            {!failedCover ? (
              <img src={musicApi.getTrackCoverUrl(currentTrack.id)} alt="" className="w-full aspect-square rounded-lg object-cover mb-4" onError={() => setFailedCover(true)} />
            ) : (
              <div className="w-full aspect-square rounded-lg flex items-center justify-center mb-4 bg-surface">
                <Music className="h-16 w-16 text-theme-tertiary" />
              </div>
            )}
            <h3 className="text-theme-primary font-medium truncate">{currentTrack.title}</h3>
            <p className="text-theme-secondary text-sm truncate">{currentTrack.artist}</p>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Music className="h-12 w-12 text-theme-tertiary mx-auto mb-3" />
            <p className="text-theme-secondary">暂无播放</p>
          </div>
        )}
      </div>

      {/* 标签 */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <button onClick={(e) => handleTabChange('queue', e)}
            className={clsx('px-3 py-2 text-xs font-medium rounded-md transition-all', activeTab === 'queue' && 'bg-neon-purple/20 text-neon-purple')}>
            播放队列
          </button>
          <button onClick={(e) => handleTabChange('lyrics', e)}
            className={clsx('px-3 py-2 text-xs font-medium rounded-md transition-all', activeTab === 'lyrics' && 'bg-neon-purple/20 text-neon-purple')}>
            歌词
          </button>
          {playQueue.length > 0 && (
            <button onClick={() => clearQueue()}
              className="ml-auto p-1.5 rounded-md text-theme-tertiary hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="清空播放队列">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 flex flex-col pt-4 overflow-hidden">
        {activeTab === 'queue' && (
          <div className="flex-1 overflow-y-auto space-y-1 pr-2">
            {playQueue.map((track, index) => (
              <div key={`${track.id}-${index}`} className={clsx('flex items-center gap-3 rounded-lg py-2 px-2 transition-colors cursor-pointer group', currentTrack?.id === track.id && 'bg-neon-purple/10')} onClick={() => useMusicPlayerStore.getState().playTrack(track)}>
                {currentTrack?.id === track.id && <div className="w-2 h-2 bg-neon-purple rounded-full animate-pulse" />}
                {currentTrack?.id !== track.id && <div className="w-2" />}
                {track.cover_path ? <img src={musicApi.getTrackCoverUrl(track.id)} className="w-8 h-8 rounded-lg object-cover" /> : (
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center"><Music className="h-3 w-3 text-theme-tertiary" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-theme-primary truncate">{track.title}</p>
                  <p className="text-xs text-theme-secondary truncate">{track.artist}</p>
                </div>
                <p className="text-xs text-theme-secondary">{formatDuration(track.duration)}</p>
                <button onClick={(e) => { e.stopPropagation(); removeFromQueue(index) }} className="p-1 text-theme-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {playQueue.length === 0 && (
              <div className="text-center py-8 text-theme-tertiary"><Music className="h-8 w-8 mx-auto mb-2 opacity-20" /><p className="text-sm">队列为空</p></div>
            )}
          </div>
        )}

        {/* 歌词区域 */}
        {activeTab === 'lyrics' && (
          <div ref={lyricsContainerRef} className="flex-1 overflow-y-auto px-2 flex flex-col" style={{ minHeight: '100%' }}>
            {loadingLyrics ? (
              <div className="text-center text-sm text-theme-tertiary m-auto">加载中...</div>
            ) : lyricLines.length > 0 ? (
              <div className="space-y-3 w-full">
                {lyricLines.map((line, idx) => (
                  <div key={idx}
                    ref={(el) => el ? activeLineRefs.current.set(idx, el) : activeLineRefs.current.delete(idx)}
                    className={clsx('text-center py-2 px-3',
                      idx === currentLineIndex ? 'text-neon-purple'
                        : idx < currentLineIndex ? 'text-theme-secondary/60'
                          : 'text-theme-secondary/80'
                    )}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-theme-tertiary text-sm m-auto">暂无歌词</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}