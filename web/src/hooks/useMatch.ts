import { useState, useCallback } from 'react'
import { adminApi } from '@/api'
import { useToast } from '@/components/Toast'
import { formatErrMsg } from '@/utils/error'

export interface MatchStrategy {
  search: (query: string) => Promise<any[]>
  apply: (mediaId: string, selectedId: string | number) => Promise<void>
}

export interface MatchResult {
  id: string | number
  title: string
  year?: string | number
  rating?: number
  posterUrl?: string
}

export interface MovieTmdbStrategy {
  type: 'movie'
  source: 'tmdb'
}

export interface TvTmdbStrategy {
  type: 'tv'
  source: 'tmdb'
}

export interface MovieDoubanStrategy {
  type: 'movie'
  source: 'douban'
}

export interface TvDoubanStrategy {
  type: 'tv'
  source: 'douban'
}

export type MatchStrategyType = MovieTmdbStrategy | TvTmdbStrategy | MovieDoubanStrategy | TvDoubanStrategy

function createStrategy(strategyType: MatchStrategyType, mediaId: string): MatchStrategy {
  const { type, source } = strategyType

  const search = async (query: string): Promise<any[]> => {
    if (source === 'tmdb') {
      const res = await adminApi.searchMetadata(query, type)
      return res.data.data || []
    } else {
      const res = await adminApi.searchDouban(query)
      return res.data.data || []
    }
  }

  const apply = async (mediaId: string, selectedId: string | number): Promise<void> => {
    if (source === 'tmdb') {
      if (type === 'tv') {
        await adminApi.matchSeriesMetadata(mediaId, selectedId as number)
      } else {
        await adminApi.matchMetadata(mediaId, selectedId as number)
      }
    } else {
      if (type === 'tv') {
        await adminApi.matchSeriesDouban(mediaId, selectedId as string)
      } else {
        await adminApi.matchMediaDouban(mediaId, selectedId as string)
      }
    }
  }

  return { search, apply }
}

export function useMatch(mediaId: string, strategyType: MatchStrategyType, onSuccess: () => void) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MatchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [applying, setApplying] = useState(false)
  const toast = useToast()
  const strategy = createStrategy(strategyType, mediaId)

  const search = useCallback(async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const rawResults = await strategy.search(query)
      const formattedResults: MatchResult[] = rawResults.map(result => {
        const { source } = strategyType
        const displayTitle = source === 'tmdb' ? (result.name || result.title) : result.title
        const displayYear = source === 'tmdb'
          ? (result.first_air_date || result.release_date)?.split('-')[0]
          : (result.year > 0 ? String(result.year) : '')
        const displayRating = source === 'tmdb' ? result.vote_average : (result.rating || 0)
        const posterUrl = source === 'tmdb'
          ? (result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : null)
          : (result.cover || null)

        return {
          id: result.id,
          title: displayTitle,
          year: displayYear,
          rating: displayRating,
          posterUrl,
        }
      })
      setResults(formattedResults)
      if (!formattedResults.length) {
        toast.info(`${strategyType.source === 'tmdb' ? 'TMDb' : '豆瓣'} 未找到匹配结果`)
      }
    } catch (err) {
      toast.error(formatErrMsg(err, `${strategyType.source} 搜索失败`))
    } finally {
      setSearching(false)
    }
  }, [query, strategy, strategyType.source, toast])

  const apply = useCallback(async (selectedId: string | number) => {
    setApplying(true)
    try {
      await strategy.apply(mediaId, selectedId)
      await onSuccess()
      toast.success(`匹配成功（来源：${strategyType.source === 'tmdb' ? 'TMDb' : '豆瓣'}）`)
      return true
    } catch {
      toast.error('匹配失败')
      return false
    } finally {
      setApplying(false)
    }
  }, [mediaId, strategy, onSuccess, strategyType.source, toast])

  const reset = useCallback(() => {
    setResults([])
    setQuery('')
  }, [])

  return {
    query,
    setQuery,
    results,
    setResults,
    searching,
    applying,
    search,
    apply,
    reset,
    source: strategyType.source,
  }
}
