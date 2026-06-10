import { Heart, Eye, MoreHorizontal } from 'lucide-react'

interface MediaCardActionsProps {
  mediaId: string
  isFavorited: boolean
  isWatched: boolean
  showMarkWatched?: boolean
  onFavorite: () => void
  onMarkWatched: () => void
  onMoreClick: (e: React.MouseEvent) => void
  moreBtnRef?: React.RefObject<HTMLButtonElement>
}

export function MediaCardActions({
  mediaId,
  isFavorited,
  isWatched,
  showMarkWatched = true,
  onFavorite,
  onMarkWatched,
  onMoreClick,
  moreBtnRef,
}: MediaCardActionsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 rounded-b-xl px-2 py-3 pt-8 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
      <button
        onClick={onFavorite}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
        style={{ color: isFavorited ? '#EF4444' : '#ffffff' }}
        title={isFavorited ? '取消收藏' : '加入收藏'}
      >
        <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
      </button>
      {showMarkWatched && (
        <button
          onClick={onMarkWatched}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-white/10"
          style={{ color: isWatched ? '#22C55E' : '#ffffff' }}
          title={isWatched ? '取消标记' : '标记为已观看'}
        >
          <Eye size={20} />
        </button>
      )}
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
  )
}
