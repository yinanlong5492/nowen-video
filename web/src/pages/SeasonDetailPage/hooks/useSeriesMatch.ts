import { useState } from 'react'
import { adminApi, seriesApi } from '@/api'
import { useToast } from '@/components/Toast'
import { formatErrMsg } from '@/utils/error'
import type { Series } from '@/types'

interface UseSeriesMatchProps {
  seriesId: string | undefined
  series: Series | null
  setSeries: React.Dispatch<React.SetStateAction<Series | null>>
  setSeasons: React.Dispatch<React.SetStateAction<{ season_num: number; episode_count: number }[]>>
  setPosterVersion: React.Dispatch<React.SetStateAction<number>>
  setShowMoreMenu: React.Dispatch<React.SetStateAction<boolean>>
}

interface UseSeriesMatchReturn {
  showMatchModal: boolean
  matchQuery: string
  matchResults: Array<{
    id: number | string
    name?: string
    title?: string
    original_name?: string
    original_title?: string
    first_air_date?: string
    release_date?: string
    vote_average?: number
    overview?: string
    poster_path?: string
    year?: number | string
    rating?: number | { total: number; score: number; rank: number } | null
    cover?: string
    seriesName?: string
    originalName?: string
    firstAired?: string
    image?: string
    poster?: string
    name_cn?: string
    air_date?: string
    images?: { common?: string; medium?: string; large?: string; small?: string; grid?: string } | null
    genres?: string
  }>
  matchSearching: boolean
  matchSelecting: boolean
  matchSource: 'tmdb' | 'douban'
  setShowMatchModal: React.Dispatch<React.SetStateAction<boolean>>
  setMatchQuery: React.Dispatch<React.SetStateAction<string>>
  handleManualMatch: () => void
  handleMatchSearch: () => Promise<void>
  handleMatchSelect: (resultId: number | string) => Promise<void>
}

export function useSeriesMatch({
  seriesId,
  series,
  setSeries,
  setSeasons,
  setPosterVersion,
  setShowMoreMenu,
}: UseSeriesMatchProps): UseSeriesMatchReturn {
  const toast = useToast()

  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchQuery, setMatchQuery] = useState('')
  const [matchResults, setMatchResults] = useState<Array<{
    id: number | string
    name?: string
    title?: string
    original_name?: string
    original_title?: string
    first_air_date?: string
    release_date?: string
    vote_average?: number
    overview?: string
    poster_path?: string
    year?: number | string
    rating?: number | { total: number; score: number; rank: number } | null
    cover?: string
    seriesName?: string
    originalName?: string
    firstAired?: string
    image?: string
    poster?: string
    name_cn?: string
    air_date?: string
    images?: { common?: string; medium?: string; large?: string; small?: string; grid?: string } | null
    genres?: string
  }>>([])
  const [matchSearching, setMatchSearching] = useState(false)
  const [matchSelecting, setMatchSelecting] = useState(false)
  const [matchSource, setMatchSource] = useState<'tmdb' | 'douban'>('tmdb')

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

  return {
    showMatchModal,
    matchQuery,
    matchResults,
    matchSearching,
    matchSelecting,
    matchSource,
    setShowMatchModal,
    setMatchQuery,
    handleManualMatch,
    handleMatchSearch,
    handleMatchSelect,
  }
}
