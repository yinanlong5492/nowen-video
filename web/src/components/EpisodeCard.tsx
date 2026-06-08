import { Link } from 'react-router-dom'
import { streamApi } from '@/api'
import type { Media, WatchHistory } from '@/types'
import { Play, Clock, ChevronRight, Check } from 'lucide-react'
import clsx from 'clsx'

export default function EpisodeCard({ episode: ep, seriesTitle, historyRecord }: { episode: Media; seriesTitle: string; historyRecord?: WatchHistory }) {
  const watchStatus = (() => {
    if (!historyRecord) return { watched: false, progress: 0 }
    return {
      watched: historyRecord.completed || (historyRecord.duration > 0 && historyRecord.position / historyRecord.duration > 0.9),
      progress: historyRecord.duration > 0 ? Math.round((historyRecord.position / historyRecord.duration) * 100) : 0,
    }
  })()

  const formatDuration = (seconds: number) => {
    if (!seconds) return ''
    const m = Math.floor(seconds / 60)
    return `${m}分钟`
  }

  return (
    <Link
      to={`/media/${ep.id}`}
      className="glass-panel-subtle group flex items-center gap-4 rounded-xl p-3 transition-all duration-300 hover:border-neon-blue/20 hover:shadow-card-hover"
    >
      {/* 缩略图区域 */}
      <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg" style={{ background: 'var(--bg-surface)' }}>
        {ep.poster_path ? (
          <img
            src={streamApi.getPosterUrl(ep.id)}
            alt={ep.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ color: 'var(--text-muted)' }}>
            <Play size={20} />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Play size={20} className="text-white" fill="white" />
        </div>
        {/* 已观看覆盖层 */}
        {watchStatus.watched && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))' }}>
              <Check size={14} className="text-white" />
            </div>
          </div>
        )}
        {/* 观看进度条（未看完时显示） */}
        {!watchStatus.watched && watchStatus.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
            <div
              className="h-full"
              style={{
                width: `${watchStatus.progress}%`,
                background: 'linear-gradient(90deg, var(--neon-blue), var(--neon-purple))',
                boxShadow: '0 0 6px var(--neon-blue-30)',
              }}
            />
          </div>
        )}
      </div>

      {/* 信息 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="badge-neon text-[10px]">
            S{String(ep.season_num).padStart(2, '0')}E{String(ep.episode_num).padStart(2, '0')}
          </span>
          <h4 className={clsx(
            'truncate text-sm font-medium transition-colors group-hover:text-neon'
          )} style={watchStatus.watched ? { color: 'var(--text-muted)' } : { color: 'var(--text-primary)' }}>
            {ep.episode_title || (ep.episode_num > 0 ? `第 ${ep.episode_num} 集` : seriesTitle)}
          </h4>
          {watchStatus.watched && (
            <span className="flex-shrink-0 text-[10px] text-green-400/70">✓ 已看</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {ep.duration > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDuration(ep.duration)}
            </span>
          )}
          {!watchStatus.watched && watchStatus.progress > 0 && (
            <span className="text-neon/60">{watchStatus.progress}%</span>
          )}
          {ep.resolution && (
            <span className="badge-neon text-[10px] !py-0">
              {ep.resolution}
            </span>
          )}
          {ep.video_codec && (
            <span className="badge-neon text-[10px] !py-0">
              {ep.video_codec}
            </span>
          )}
        </div>
        {/* 单集简介 */}
        {ep.overview && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            {ep.overview}
          </p>
        )}
      </div>

      {/* 箭头 */}
      <ChevronRight size={16} className="flex-shrink-0 transition-colors group-hover:text-neon" style={{ color: 'var(--text-muted)' }} />
    </Link>
  )
}
