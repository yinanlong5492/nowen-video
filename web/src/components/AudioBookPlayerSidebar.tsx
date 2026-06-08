import { useState, useCallback } from 'react'
import { useAudioBookPlayerStore } from '@/stores/audioBookPlayer'
import { getAudioBookCoverUrl } from '@/api'
import { BookOpen, Play, Music } from 'lucide-react'
import clsx from 'clsx'

function formatTime(seconds: number) {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AudioBookPlayerSidebar() {
  const {
    currentBook,
    currentChapter,
    chapters,
    isPlaying,
  } = useAudioBookPlayerStore()

  const [failedCover, setFailedCover] = useState(false)

  const handlePlayChapter = useCallback((chapter: typeof chapters[0]) => {
    const store = useAudioBookPlayerStore.getState()
    store.setCurrentChapter(chapter)
    store.setCurrentTime(0)
    store.setDuration(0)
    store.clearPendingSeek()
    store.setIsPlaying(true)
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{
      width: 280,
      borderLeft: '1px solid var(--border-default)',
      backgroundColor: 'var(--bg-card)',
    }}>
      <div className="pt-6">
        <h2 className="text-sm font-semibold tracking-wide pl-3 mb-4" style={{ color: 'var(--text-primary)' }}>正在播放</h2>
        {currentBook ? (
          <div className="px-4">
            {!failedCover ? (
              <img
                src={getAudioBookCoverUrl(currentBook.id)}
                alt={currentBook.title}
                className="w-full aspect-square rounded-lg object-cover mb-4"
                onError={() => setFailedCover(true)}
              />
            ) : (
              <div className="w-full aspect-square rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <BookOpen className="h-16 w-16" style={{ color: 'var(--text-tertiary)' }} />
              </div>
            )}
            <h3 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{currentBook.title}</h3>
            <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
              {currentBook.author && `${currentBook.author}`}
              {currentBook.narrator && ` · 播音: ${currentBook.narrator}`}
            </p>
            {currentChapter && (
              <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-tertiary)' }}>
                {currentChapter.title}
              </p>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>暂无播放</p>
          </div>
        )}
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-2 text-xs font-medium rounded-md" style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)', color: '#8B5CF6' }}>
            章节列表
          </span>
          <span className="text-xs ml-auto" style={{ color: 'var(--text-tertiary)' }}>
            {chapters.length} 章
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col pt-4 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-1 pr-2">
          {chapters.length === 0 && (
            <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
              <Music className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">暂无章节</p>
            </div>
          )}
          {chapters.map((chapter) => {
            const isCurrent = currentChapter?.index === chapter.index
            return (
              <div
                key={chapter.index}
                onClick={() => handlePlayChapter(chapter)}
                className={clsx(
                  'flex items-center gap-3 rounded-lg py-2 px-2 transition-colors cursor-pointer group',
                  isCurrent && 'bg-[#8B5CF6]/10'
                )}
              >
                {isCurrent && isPlaying ? (
                  <div className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-pulse flex-shrink-0" />
                ) : isCurrent ? (
                  <div className="w-2 h-2 bg-[#8B5CF6]/60 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-2 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm truncate"
                    style={{ color: isCurrent ? '#8B5CF6' : 'var(--text-primary)' }}
                  >
                    {chapter.title}
                  </p>
                  {chapter.duration > 0 && (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {formatTime(chapter.duration)}
                    </p>
                  )}
                </div>
                {!isCurrent && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlayChapter(chapter) }}
                    className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <Play className="h-3 w-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}