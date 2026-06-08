import { useState } from 'react'
import { X, Search } from 'lucide-react'
import { adminApi } from '@/api'
import { useToast } from '@/components/Toast'

interface MatchResult {
  id: number | string
  name?: string
  title?: string
  original_name?: string
  original_title?: string
  first_air_date?: string
  release_date?: string
  vote_average?: number
  rating?: number
  overview?: string
  poster_path?: string
  cover?: string
  genres?: string
  year?: number
}

interface MatchModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  matchType: 'media' | 'series' | 'episode'
  itemId: string
}

export function MatchModal({
  open,
  onClose,
  onSuccess,
  matchType,
  itemId,
}: MatchModalProps) {
  const toast = useToast()
  const [matchSource, setMatchSource] = useState<'tmdb' | 'douban'>('tmdb')
  const [matchQuery, setMatchQuery] = useState('')
  const [matchResults, setMatchResults] = useState<MatchResult[]>([])
  const [matchSearching, setMatchSearching] = useState(false)
  const [matchSelecting, setMatchSelecting] = useState(false)

  const handleMatchSearch = async () => {
    if (!matchQuery.trim()) {
      toast.error('请输入搜索关键词')
      return
    }
    setMatchSearching(true)
    try {
      let res
      if (matchSource === 'tmdb') {
        const tmdbType = matchType === 'series' || matchType === 'episode' ? 'tv' : 'movie'
        res = await adminApi.searchMetadata(matchQuery, tmdbType)
      } else {
        res = await adminApi.searchDouban(matchQuery)
      }
      setMatchResults(res.data.data || [])
      if (res.data.data.length === 0) {
        toast.info('未找到匹配结果')
      }
    } catch {
      toast.error('搜索失败')
    } finally {
      setMatchSearching(false)
    }
  }

  const handleMatchSelect = async (resultId: number | string) => {
    setMatchSelecting(true)
    try {
      const sourceNameMap: Record<string, string> = { tmdb: 'TMDb', douban: '豆瓣' }
      
      if (matchSource === 'tmdb') {
        if (matchType === 'series' || matchType === 'episode') {
          await adminApi.matchSeriesMetadata(itemId, resultId as number)
        } else {
          await adminApi.matchMetadata(itemId, resultId as number)
        }
      } else {
        if (matchType === 'series' || matchType === 'episode') {
          await adminApi.matchSeriesDouban(itemId, resultId as string)
        } else {
          // 电影的豆瓣匹配可能需要不同的 API
          await adminApi.matchMetadata(itemId, resultId as number)
        }
      }
      
      onClose()
      onSuccess()
      toast.success(`匹配成功（来源：${sourceNameMap[matchSource]}）`)
    } catch {
      toast.error('匹配失败')
    } finally {
      setMatchSelecting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="relative w-full max-w-2xl rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {matchType === 'series' || matchType === 'episode' ? '手动匹配剧集' : '手动匹配电影'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

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
            tmdb: '搜索 TMDb 数据库，适合欧美电影和电视剧。',
            douban: '搜索豆瓣数据库，适合国产剧集和电影。',
          }[matchSource]}
        </p>

        <div className="mb-4 flex gap-2">
          <input
            value={matchQuery}
            onChange={(e) => setMatchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleMatchSearch()}
            placeholder="输入名称搜索..."
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            autoFocus
          />
          <button
            onClick={handleMatchSearch}
            disabled={matchSearching}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: { tmdb: 'linear-gradient(135deg, var(--neon-blue), var(--neon-blue-mid))', douban: 'linear-gradient(135deg, #00b414, #009910)' }[matchSource] }}
          >
            <Search size={14} />
            {matchSearching ? '搜索中...' : '搜索'}
          </button>
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {matchResults.map((result) => {
            let displayTitle = '', displayOrigTitle = '', displayYear = '', displayOverview = '', posterUrl: string | null = null
            let displayRating = 0, resultKey: string | number = result.id

            if (matchSource === 'tmdb') {
              displayTitle = result.name || result.title || ''
              displayOrigTitle = result.original_name || result.original_title || ''
              displayYear = (result.first_air_date || result.release_date)?.split('-')[0] || ''
              displayRating = result.vote_average || 0
              displayOverview = result.overview || ''
              posterUrl = result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : null
            } else if (matchSource === 'douban') {
              displayTitle = result.title || ''
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
                    {displayYear && (
                      <span className="shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
                        ({displayYear})
                      </span>
                    )}
                  </div>
                  {displayOrigTitle && displayOrigTitle !== displayTitle && (
                    <div className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                      {displayOrigTitle}
                    </div>
                  )}
                  {displayOverview && (
                    <div className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {displayOverview}
                    </div>
                  )}
                </div>
                {displayRating > 0 && (
                  <div className="shrink-0 rounded px-2 py-1 text-xs font-medium" style={{ background: 'rgba(251,191,36,0.15)', color: '#FBBF24' }}>
                    {displayRating.toFixed(1)}
                  </div>
                )}
              </button>
            )
          })}
          {matchResults.length === 0 && !matchSearching && (
            <div className="flex flex-col items-center justify-center py-8" style={{ color: 'var(--text-muted)' }}>
              <Search size={32} className="mb-2 opacity-50" />
              <p className="text-sm">输入关键词开始搜索</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}