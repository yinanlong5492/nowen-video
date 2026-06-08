import { useState } from 'react'
import { musicApi } from '@/api'
import { useMusicPlayerStore } from '@/stores/musicPlayer'
import { Music, Play, Pause, SkipBack, SkipForward, Shuffle, List, Repeat } from 'lucide-react'

// 格式化时长为 mm:ss
const formatDuration = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function MusicPlayerBar() {
  const { 
    currentTrack, 
    isPlaying, 
    setIsPlaying, 
    playNext, 
    playPrevious, 
    playMode, 
    setPlayMode,
    currentTime,
    duration,
    setCurrentTime,
    isLoop,
    toggleLoop
  } = useMusicPlayerStore()

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const [failedCover, setFailedCover] = useState(false)

  const togglePlayMode = () => {
    if (isLoop) {
      toggleLoop()
    }
    setPlayMode(playMode === 'sequential' ? 'shuffle' : 'sequential')
  }

  const toggleLoopMode = () => {
    toggleLoop()
  }

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if ((window as any).seekMusic) {
      (window as any).seekMusic(time)
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="glass-panel-strong border-t flex flex-col" style={{ borderColor: 'var(--border-default)' }}>
      {/* 播放器控制 */}
      <div className="px-4 py-3 flex items-center gap-4">
        {currentTrack ? (
          <>
            {/* 左侧：歌曲信息 */}
            <div className="flex items-center gap-3 w-1/4">
              {!failedCover ? (
                <img
                  src={musicApi.getTrackCoverUrl(currentTrack.id)}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover"
                  onError={() => setFailedCover(true)}
                />
              ) : (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-surface)' }}>
                  <Music className="h-6 w-6 text-theme-tertiary" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-theme-primary truncate">{currentTrack.title}</p>
                <p className="text-xs text-theme-secondary truncate">{currentTrack.artist}</p>
              </div>
            </div>
            
            {/* 中间：播放控制（居中） */}
            <div className="flex items-center justify-center gap-3 flex-1">
              <button
                onClick={togglePlayMode}
                className="p-2 rounded-lg transition-colors"
                style={{ 
                  color: !isLoop && playMode === 'shuffle' ? 'var(--neon-purple)' : 'var(--text-secondary)',
                  background: !isLoop && playMode === 'shuffle' ? 'var(--neon-purple-10)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (isLoop || playMode !== 'shuffle') {
                    e.currentTarget.style.background = 'var(--nav-hover-bg)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (isLoop || playMode !== 'shuffle') {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
                title={isLoop ? '顺序播放' : (playMode === 'shuffle' ? '随机播放' : '顺序播放')}
              >
                {playMode === 'shuffle' ? <Shuffle className="h-5 w-5" /> : <List className="h-5 w-5" />}
              </button>
              <button
                onClick={playPrevious}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--nav-hover-bg)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
                title="上一首"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={togglePlay}
                className="p-3 rounded-full transition-colors"
                style={{ background: 'var(--neon-purple)', color: 'white' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
                title={isPlaying ? '暂停' : '播放'}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
              <button
                onClick={playNext}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--nav-hover-bg)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
                title="下一首"
              >
                <SkipForward className="h-5 w-5" />
              </button>
              <button
                onClick={toggleLoopMode}
                className="p-2 rounded-lg transition-colors"
                style={{ 
                  color: isLoop ? 'var(--neon-purple)' : 'var(--text-secondary)',
                  background: isLoop ? 'var(--neon-purple-10)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isLoop) {
                    e.currentTarget.style.background = 'var(--nav-hover-bg)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoop) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
                title={isLoop ? '取消单曲循环' : '单曲循环'}
              >
                <Repeat className="h-5 w-5" />
              </button>
            </div>
            
            {/* 右侧：占位，保持平衡 */}
            <div className="w-1/4" />
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-surface)' }}>
              <Music className="h-6 w-6 text-theme-tertiary" />
            </div>
            <div className="text-theme-secondary">
              暂无播放
            </div>
          </div>
        )}
      </div>

      {/* 进度条 */}
      <div className="px-4 pb-3">
        {currentTrack && (
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs text-theme-secondary min-w-[40px] text-right">
              {formatDuration(currentTime)}
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
                  background: `linear-gradient(to right, var(--neon-blue) 0%, var(--neon-purple) ${progress}%, var(--progress-track-bg) ${progress}%, var(--progress-track-bg) 100%)`
                }}
              />
            </div>
            <span className="text-xs text-theme-secondary min-w-[40px]">
              {formatDuration(duration || currentTrack.duration)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
