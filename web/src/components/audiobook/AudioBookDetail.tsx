import { memo } from 'react'
import { Heart, MoreHorizontal, RefreshCw, Search, Sparkles, ArrowLeft, BookOpen, User, Mic, Headphones } from 'lucide-react'
import type { AudioBook, AudioBookChapter } from '@/types'
import { getAudioBookCoverUrl } from '@/api'

interface AudioBookDetailProps {
  book: AudioBook
  chapters: AudioBookChapter[]
  failedCovers: Set<string>
  isPlaying: boolean
  currentChapterIndex: number | null
  currentTime: number
  duration: number
  moreMenuOpen: boolean
  moreMenuRef: React.RefObject<HTMLDivElement>
  onSetMoreMenuOpen: (open: boolean) => void
  onToggleFavorite: (bookId: string, e: React.MouseEvent) => void
  onScrape: () => void
  onOpenScrapeDialog: () => void
  onRefreshMeta: () => void
  onPlayChapter: (chapter: AudioBookChapter) => void
  onPlayAll: () => void
  onCoverError: (bookId: string) => void
  onBack: () => void
  scraping: boolean
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m}分钟`
  return `${m}分钟`
}

const AudioBookDetail = memo(function AudioBookDetail({
  book,
  chapters,
  failedCovers,
  isPlaying,
  currentChapterIndex,
  currentTime,
  duration,
  moreMenuOpen,
  moreMenuRef,
  onSetMoreMenuOpen,
  onToggleFavorite,
  onScrape,
  onOpenScrapeDialog,
  onRefreshMeta,
  onPlayChapter,
  onPlayAll,
  onCoverError,
  onBack,
  scraping,
}: AudioBookDetailProps) {
  const coverFailed = failedCovers.has(book.id)

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-theme-secondary hover:text-theme-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回列表
      </button>

      <div className="flex flex-col md:flex-row gap-0 items-end">
        <div className="flex-shrink-0 w-full md:w-52 z-20 mb-[-1px] md:mb-0">
          <div className="aspect-square rounded-2xl overflow-hidden card-surface">
            {!coverFailed ? (
              <img
                src={getAudioBookCoverUrl(book.id)}
                alt={book.title}
                className="w-full h-full object-cover"
                onError={() => onCoverError(book.id)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-theme-tertiary" />
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0 p-4 md:pl-14 rounded-2xl md:-ml-6 card-surface z-10 w-full">
          <h2 className="text-2xl font-bold text-theme-primary">{book.title}</h2>
          <p className="text-theme-secondary my-3">
            {book.author && <span className="flex items-center gap-1"><User size={14} />{book.author}</span>}
            {book.narrator && (
              <span className="flex items-center gap-1 mt-1"><Mic size={14} />播音：{book.narrator}</span>
            )}
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-sm text-theme-secondary flex-wrap">
              {book.year > 0 && <span>年份：{book.year}</span>}
              <span className="mx-1 text-theme-tertiary">/</span>
              <span>{chapters.length} 个章节</span>
              {book.duration > 0 && <><span className="mx-1 text-theme-tertiary">/</span><span>{formatDuration(book.duration)}</span></>}
              {book.publisher && <><span className="mx-1 text-theme-tertiary">/</span><span>{book.publisher}</span></>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <button
                onClick={(e) => onToggleFavorite(book.id, e)}
                className="p-2 rounded-full transition-all hover:opacity-90 border border-[var(--border-default)] text-theme-secondary"
                title={book.is_favorite ? '取消收藏' : '加入收藏'}
              >
                <Heart size={16} className={book.is_favorite ? 'fill-red-500 text-red-500' : ''} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onScrape() }}
                disabled={scraping}
                className="p-2 rounded-full transition-all hover:opacity-90 border border-[var(--border-default)] text-theme-secondary disabled:opacity-50"
                title="刮削元数据"
              >
                <Sparkles size={16} className={scraping ? 'text-[#8B5CF6]' : ''} />
              </button>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); onSetMoreMenuOpen(!moreMenuOpen) }}
                  className="p-2 rounded-full transition-all hover:opacity-90 border border-[var(--border-default)] text-theme-secondary"
                  title="更多"
                >
                  <MoreHorizontal size={16} />
                </button>
                {moreMenuOpen && (
                  <div
                    ref={moreMenuRef}
                    onClick={e => e.stopPropagation()}
                    className="absolute right-0 top-full z-20 mt-2 min-w-[200px] rounded-xl py-1 shadow-2xl animate-scale-in glass-panel"
                  >
                    <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-theme-muted">有声书管理</div>
                    <button
                      onClick={() => { onRefreshMeta(); onSetMoreMenuOpen(false) }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-purple/5 text-theme-secondary"
                    >
                      <RefreshCw size={14} />
                      刷新元数据
                    </button>
                    <button
                      onClick={() => { onScrape(); onSetMoreMenuOpen(false) }}
                      disabled={scraping}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-purple/5 text-theme-secondary disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      {scraping ? '刮削中...' : '刮削元数据'}
                    </button>
                    <button
                      onClick={() => { onOpenScrapeDialog(); onSetMoreMenuOpen(false) }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-purple/5 text-theme-secondary"
                    >
                      <Search size={14} />
                      搜索喜马拉雅
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={onPlayAll}
                className={`px-5 py-2 rounded-full text-sm font-medium text-theme-on-neon transition-all hover:opacity-90 flex-shrink-0 bg-neon-purple ${chapters.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                播放全部
              </button>
            </div>
          </div>
        </div>
      </div>

      {book.description && (
        <div className="rounded-2xl p-4 card-surface">
          <p className="text-sm text-theme-secondary leading-relaxed">{book.description}</p>
        </div>
      )}

      <div className="space-y-1 rounded-2xl p-3 card-surface">
        {chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-theme-secondary">
            <Headphones className="h-10 w-10 text-theme-tertiary mb-3" />
            <p className="text-sm">暂无章节</p>
          </div>
        ) : (
          chapters.map((chapter, _idx) => {
            const isCurrentChapter = currentChapterIndex === chapter.index
            return (
              <div
                key={chapter.index}
                className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all group hover:bg-[var(--nav-hover-bg)]"
                onClick={() => onPlayChapter(chapter)}
              >
                <span className="text-xs text-theme-secondary w-6 text-right">
                  {isCurrentChapter && isPlaying ? (
                    <div className="flex items-end justify-center gap-0.5 h-3">
                      <span className="w-0.5 bg-neon-purple rounded animate-pulse" style={{ height: '60%' }} />
                      <span className="w-0.5 bg-neon-purple rounded animate-pulse" style={{ height: '100%', animationDelay: '0.1s' }} />
                      <span className="w-0.5 bg-neon-purple rounded animate-pulse" style={{ height: '40%', animationDelay: '0.2s' }} />
                    </div>
                  ) : (
                    chapter.index
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-theme-primary truncate">{chapter.title}</p>
                </div>
                <span className="text-xs text-theme-secondary">{formatTime(chapter.duration)}</span>
              </div>
            )
          })
        )}
      </div>

      {/* 播放进度 */}
      {isPlaying && currentChapterIndex !== null && (
        <div className="px-2">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #8B5CF6 ${(currentTime / (duration || 1)) * 100}%, var(--border-default) ${(currentTime / (duration || 1)) * 100}%)`,
              accentColor: '#8B5CF6',
            }}
            readOnly
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}
    </div>
  )
})

export default AudioBookDetail