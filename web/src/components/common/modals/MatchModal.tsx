import { useEffect, useState } from 'react'
import { X, Search } from 'lucide-react'
import { useMatch, MatchStrategyType } from '@/hooks/useMatch'

interface MatchModalProps {
  open: boolean
  onClose: () => void
  mediaId: string
  strategyType: MatchStrategyType
  defaultTitle?: string
  onMatchSuccess: () => void
}

export function MatchModal({ open, onClose, mediaId, strategyType, defaultTitle = '', onMatchSuccess }: MatchModalProps) {
  const [currentSource, setCurrentSource] = useState<'tmdb' | 'douban'>(strategyType.source)
  
  const currentStrategyType: MatchStrategyType = {
    ...strategyType,
    source: currentSource,
  }

  const { query, setQuery, results, setResults, searching, applying, search, apply } = useMatch(
    mediaId,
    currentStrategyType,
    onMatchSuccess
  )

  useEffect(() => {
    if (open) {
      setQuery(defaultTitle)
      setResults([])
      setCurrentSource(strategyType.source)
    }
  }, [open, defaultTitle, setQuery, setResults, strategyType.source])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  const handleSourceChange = (source: 'tmdb' | 'douban') => {
    if (source !== currentSource) {
      setCurrentSource(source)
      setResults([])
      setQuery('')
    }
  }

  if (!open) return null

  const isTv = strategyType.type === 'tv'
  const sourceLabel = currentSource === 'tmdb' ? 'TMDb' : '豆瓣'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="relative w-full max-w-2xl rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted hover:text-primary"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={20} />
        </button>
        <h3 className="mb-4 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          手动匹配{isTv ? '剧集' : '电影'}
        </h3>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => handleSourceChange('tmdb')}
            className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all"
            style={{
              background: currentSource === 'tmdb' ? 'linear-gradient(135deg, var(--neon-blue), var(--neon-blue-mid))' : 'var(--bg-surface)',
              color: currentSource === 'tmdb' ? '#fff' : 'var(--text-secondary)',
              border: currentSource === 'tmdb' ? 'none' : '1px solid var(--border-default)',
            }}
          >
            🎬 TMDb
          </button>
          <button
            onClick={() => handleSourceChange('douban')}
            className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all"
            style={{
              background: currentSource === 'douban' ? 'linear-gradient(135deg, #00b414, #009910)' : 'var(--bg-surface)',
              color: currentSource === 'douban' ? '#fff' : 'var(--text-secondary)',
              border: currentSource === 'douban' ? 'none' : '1px solid var(--border-default)',
            }}
          >
            🎯 豆瓣
          </button>
        </div>
        <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          {{
            tmdb: '搜索 TMDb 数据库，适合欧美电视剧和电影。',
            douban: '搜索豆瓣数据库，适合国产剧集和电影。',
          }[currentSource]}
        </p>

        <div className="mb-4 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
            placeholder={`搜索 ${isTv ? '剧集' : '电影'}...`}
            autoFocus
          />
          <button
            onClick={search}
            disabled={searching}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: currentSource === 'tmdb' ? 'linear-gradient(135deg, var(--neon-blue), var(--neon-blue-mid))' : 'linear-gradient(135deg, #00b414, #009910)' }}
          >
            {searching ? '搜索中...' : '搜索'}
          </button>
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => apply(result.id)}
              disabled={applying}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
              }}
            >
              {result.posterUrl ? (
                <img
                  src={result.posterUrl}
                  alt={result.title}
                  className="h-16 w-11 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="h-16 w-11 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--bg-card)' }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {result.title}
                </div>
                <div className="mt-0.5 flex gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{result.year}</span>
                  {result.rating && (
                    <span className="text-yellow-400">★ {result.rating.toFixed(1)}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {results.length === 0 && !searching && (
            <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {`${sourceLabel} 未找到匹配结果，请尝试其他关键词`}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl py-2.5 text-sm font-medium transition-colors"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
          }}
        >
          取消
        </button>
      </div>
    </div>
  )
}
