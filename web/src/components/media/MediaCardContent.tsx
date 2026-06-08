import { Play, Tv, Film, Music, Heart, Eye, MoreHorizontal } from 'lucide-react'

import type { MouseEvent, Ref } from 'react'

interface MediaCardContentProps {
  title: string
  subtitle?: string
  posterUrl?: string
  hasPoster: boolean
  isSeries: boolean
  isMusic: boolean
  resolution?: string
  year?: number
  rating?: number
  duration?: string
  seriesInfo?: string
  isFavorited: boolean
  isWatched: boolean
  onPlayClick: (e: MouseEvent) => void
  onFavoriteClick: (e: MouseEvent) => void
  onWatchedClick: (e: MouseEvent) => void
  onMoreClick: (e: MouseEvent) => void
  moreBtnRef?: Ref<HTMLButtonElement>
  isWide?: boolean
}

export function MediaCardContent({
  title,
  subtitle,
  posterUrl,
  hasPoster,
  isSeries,
  isMusic,
  resolution,
  year,
  rating,
  duration,
  seriesInfo,
  isFavorited,
  isWatched,
  onPlayClick,
  onFavoriteClick,
  onWatchedClick,
  onMoreClick,
  moreBtnRef,
  isWide = false,
}: MediaCardContentProps) {
  return (
    <div className="relative">
      {/* 海报区域 */}
      <div className={`relative rounded-xl bg-theme-bg-surface isolate overflow-hidden ${isWide ? 'aspect-video' : 'aspect-[2/3]'}`}>
        {hasPoster && posterUrl && (
          <img
            src={posterUrl}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        )}
        {/* 占位（无海报或海报加载失败时可见） */}
        <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(180deg, #1a1b2e 0%, #0f1019 100%)',
          }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))',
              border: '1px solid rgba(59,130,246,0.1)',
            }}
          >
            {isMusic ? <Music size={24} style={{ color: '#4a5568' }} /> : isSeries ? <Tv size={24} style={{ color: '#4a5568' }} /> : <Film size={24} style={{ color: '#4a5568' }} />}
          </div>
          <span className="text-xs font-medium" style={{ color: '#4a5568' }}>
            {isMusic ? '暂无封面' : '暂无海报'}
          </span>
        </div>

        {/* 悬停暗色遮罩 + 播放按钮 */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <button
            onClick={onPlayClick}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 hover:scale-125 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
              boxShadow: 'var(--neon-glow-shadow-lg)',
            }}
            title={isMusic ? '播放音乐' : isSeries ? '查看系列' : '立即播放'}
          >
            <Play size={18} className="ml-0.5 text-white" fill="white" />
          </button>
        </div>

        {/* 音乐类型标识 */}
        {isMusic && (
          <div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          >
            <Music size={12} className="text-neon" />
          </div>
        )}

        {/* 分辨率标签（仅电影） */}
        {!isSeries && !isMusic && resolution && (
          <span className="badge-neon absolute right-2 top-2 z-20" style={{ transform: 'translateZ(0)' }}>
            {resolution}
          </span>
        )}

        {/* 评分标签 */}
        {!isMusic && rating !== undefined && rating !== null && rating > 0 && (
          <span className="absolute left-2 top-2 z-20 rounded-md px-2 py-0.5 text-xs font-medium backdrop-blur-md"
            style={{
              background: 'rgba(0,0,0,0.65)',
              color: '#FACC15',
              border: '1px solid rgba(255,255,255,0.15)',
              transform: 'translateZ(0)',
            }}
          >
            ★ {rating.toFixed(1)}
          </span>
        )}

        {/* 底部操作按钮 */}
        {!isMusic && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 rounded-b-xl px-2 py-3 pt-8 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button
              onClick={onFavoriteClick}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
              style={{ color: isFavorited ? '#EF4444' : '#ffffff' }}
              title={isFavorited ? '取消收藏' : '加入收藏'}
            >
              <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={onWatchedClick}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
              style={{ color: isWatched ? '#22C55E' : '#ffffff' }}
              title={isWatched ? '取消标记' : '标记为已观看'}
            >
              <Eye size={20} />
            </button>
            <button
              ref={moreBtnRef}
              onClick={onMoreClick}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
              style={{ color: '#ffffff' }}
              title="更多"
            >
              <MoreHorizontal size={20} />
            </button>
          </div>
        )}
      </div>

      {/* 信息区域 */}
      <div className="px-2 pt-2.5 pb-2 text-center">
        <h3 className="truncate text-sm font-medium leading-snug text-theme-primary transition-colors duration-200 hover:text-neon">
          {title}
        </h3>
        {subtitle && subtitle.length > 0 && (
          <p className="mt-0.5 truncate text-xs text-theme-tertiary">
            {subtitle}
          </p>
        )}
        {(!isMusic) && ((seriesInfo && seriesInfo.length > 0) || (year !== undefined && year !== null && year > 0) || (duration && duration.length > 0)) && (
          <span className="text-xs text-theme-muted">
            {seriesInfo && seriesInfo.length > 0 ? seriesInfo : ''}
            {(seriesInfo && seriesInfo.length > 0 && (year !== undefined && year !== null && year > 0 || duration && duration.length > 0)) ? ' • ' : ''}
            {year !== undefined && year !== null && year > 0 ? year : ''}
            {(year !== undefined && year !== null && year > 0 && duration && duration.length > 0) ? ' • ' : ''}
            {duration && duration.length > 0 ? duration : ''}
          </span>
        )}
      </div>
    </div>
  )
}