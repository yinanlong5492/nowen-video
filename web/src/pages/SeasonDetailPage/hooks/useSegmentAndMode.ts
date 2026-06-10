import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useLocation, useParams } from 'react-router-dom'
import type { Media } from '@/types'
import { calculateSegments, getDisplayedEpisodes, findSegmentIndex } from '../utils/seasonUtils'

interface UseSegmentAndModeReturn {
  displayMode: 'slide' | 'number'
  currentSegmentIndex: number
  segments: { start: number; end: number }[]
  currentSegment: { start: number; end: number }
  displayedEpisodes: Media[]
  clickedEpisodeIds: Set<string>
  setDisplayMode: (mode: 'slide' | 'number') => void
  setCurrentSegmentIndex: (index: number) => void
  addClickedEpisodeId: (id: string) => void
}

export function useSegmentAndMode(episodes: Media[], seasonNum: string | undefined): UseSegmentAndModeReturn {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const params = useParams<{ seasonNum: string }>()

  const [displayModeState, setDisplayModeState] = useState<'slide' | 'number'>('slide')
  const [currentSegmentIndexState, setCurrentSegmentIndexState] = useState(0)

  // 从 URL 参数读取
  const urlSegmentIndex = parseInt(searchParams.get('segment') || '0', 10) || 0
  const urlDisplayMode = (searchParams.get('mode') || 'slide') as 'slide' | 'number'

  // 计算分段
  const segments = useMemo(() => calculateSegments(episodes), [episodes])

  // 当前分段
  const currentSegment = segments[currentSegmentIndexState] || { start: 1, end: 30 }

  // 当前分段显示的剧集
  const displayedEpisodes = useMemo(() => getDisplayedEpisodes(episodes, currentSegment), [episodes, currentSegment])

  // 已点击集数
  const CLICKED_KEY = `season_clicked_${params.seriesId}_${seasonNum || '1'}`
  const [clickedEpisodeIds, setClickedEpisodeIds] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem(CLICKED_KEY)
      if (stored) return new Set(JSON.parse(stored))
    } catch {}
    return new Set()
  })

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

  // 添加已点击集数
  const addClickedEpisodeId = (id: string) => {
    setClickedEpisodeIds(prev => {
      const next = new Set(prev).add(id)
      try { sessionStorage.setItem(CLICKED_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  // 从 URL 参数恢复分段索引
  useEffect(() => {
    if (urlSegmentIndex !== currentSegmentIndexState) {
      setCurrentSegmentIndexState(urlSegmentIndex)
    }
  }, [urlSegmentIndex, currentSegmentIndexState])

  // 从 URL 参数恢复显示模式
  useEffect(() => {
    if (urlDisplayMode !== displayModeState) {
      setDisplayModeState(urlDisplayMode)
    }
  }, [urlDisplayMode, displayModeState])

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
    const fetchHistory = async () => {
      // 这里可以添加重新加载播放历史的逻辑
      // 由于播放历史在 useSeasonDetail 中管理，这里可以留空或添加其他需要的逻辑
    }

    fetchHistory()
  }, [location.pathname])

  // 从历史状态中读取上一次播放的集数，自动定位到正确的分段
  useEffect(() => {
    if (segments.length === 0) return

    const episodeNumFromHistory = window.history.state?.episodeNum
    if (typeof episodeNumFromHistory === 'number' && episodeNumFromHistory > 0) {
      const targetIndex = findSegmentIndex(segments, episodeNumFromHistory)
      if (targetIndex >= 0 && targetIndex !== currentSegmentIndexState) {
        setCurrentSegmentIndex(targetIndex)
        window.history.replaceState({ ...window.history.state, episodeNum: undefined }, '')
      }
    }
  }, [segments, currentSegmentIndexState])

  return {
    displayMode: displayModeState,
    currentSegmentIndex: currentSegmentIndexState,
    segments,
    currentSegment,
    displayedEpisodes,
    clickedEpisodeIds,
    setDisplayMode,
    setCurrentSegmentIndex,
    addClickedEpisodeId,
  }
}
