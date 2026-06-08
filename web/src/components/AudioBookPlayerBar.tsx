import { useState, useCallback } from 'react'
import { useAudioBookPlayerStore } from '@/stores/audioBookPlayer'
import { getAudioBookCoverUrl } from '@/api'
import { Play, Pause, SkipBack, SkipForward, Timer, X, BookOpen } from 'lucide-react'
import clsx from 'clsx'

function formatTime(seconds: number) {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AudioBookPlayerBar() {
  const {
    currentBook,
    currentChapter,
    isPlaying,
    currentTime,
    duration,
    sleepTimer,
    setIsPlaying,
    setCurrentTime,
    setSleepTimer,
    clearSleepTimer,
    playNextChapter,
    playPreviousChapter,
    stopBook,
  } = useAudioBookPlayerStore()

  const [failedCover, setFailedCover] = useState(false)

  const handleTogglePlay = () => {
    if (currentBook) {
      setIsPlaying(!isPlaying)
    }
  }

  const handleSkipBack = () => {
    if (currentTime > 5) {
      const time = Math.max(0, currentTime - 15)
      setCurrentTime(time)
      useAudioBookPlayerStore.setState({ pendingSeek: time })
    } else {
      playPreviousChapter()
    }
  }

  const handleSkipForward = () => {
    if (duration > 0 && currentTime + 30 < duration) {
      const time = currentTime + 30
      setCurrentTime(time)
      useAudioBookPlayerStore.setState({ pendingSeek: time })
    } else {
      playNextChapter()
    }
  }

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    useAudioBookPlayerStore.setState({ pendingSeek: time })
  }

  const handleSleepTimer = useCallback(() => {
    if (sleepTimer) {
      clearSleepTimer()
      return
    }
    setSleepTimer(15)
  }, [sleepTimer, clearSleepTimer, setSleepTimer])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="border-t flex flex-col" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}>
      <div className="px-4 py-3 flex items-center gap-4">
        {currentBook ? (
          <>
            <div className="flex items-center gap-3 w-1/4">
              {!failedCover ? (
                <img
                  src={getAudioBookCoverUrl(currentBook.id)}
                  alt={currentBook.title}
                  className="w-12 h-12 rounded-lg object-cover"
                  onError={() => setFailedCover(true)}
                />
              ) : (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#8B5CF6]/10">
                  <BookOpen className="h-6 w-6 text-[#8B5CF6]/40" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {currentBook.title}
                </p>
                {currentChapter && (
                  <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {currentChapter.title}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 flex-1">
              <button
                onClick={handleSkipBack}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                title="后退15秒"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={handleTogglePlay}
                className="p-3 rounded-full transition-colors"
                style={{ background: '#8B5CF6', color: 'white' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                title={isPlaying ? '暂停' : '播放'}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
              <button
                onClick={handleSkipForward}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                title="快进30秒"
              >
                <SkipForward className="h-5 w-5" />
              </button>
              <button
                onClick={handleSleepTimer}
                className={clsx('p-2 rounded-lg transition-colors')}
                style={{
                  color: sleepTimer ? '#8B5CF6' : 'var(--text-tertiary)',
                  background: sleepTimer ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                }}
                title={sleepTimer ? `睡眠定时: ${sleepTimer}分钟` : '设置睡眠定时'}
              >
                <Timer className="h-5 w-5" />
              </button>
              <button
                onClick={stopBook}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--nav-hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
                title="关闭播放"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="w-1/4" />
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-surface)' }}>
              <BookOpen className="h-6 w-6" style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              暂无播放
            </div>
          </div>
        )}
      </div>

      {currentBook && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs min-w-[40px] text-right" style={{ color: 'var(--text-secondary)' }}>
              {formatTime(currentTime)}
            </span>
            <div className="w-full max-w-2xl relative">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleProgressChange}
                className="music-player-range w-full"
                style={{
                  background: `linear-gradient(to right, #8B5CF6 0%, #A78BFA ${progress}%, var(--progress-track-bg) ${progress}%, var(--progress-track-bg) 100%)`
                }}
              />
            </div>
            <span className="text-xs min-w-[40px]" style={{ color: 'var(--text-secondary)' }}>
              {formatTime(duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}