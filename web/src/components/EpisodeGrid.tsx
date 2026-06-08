import type { Media, WatchHistory } from '@/types'
import clsx from 'clsx'

interface EpisodeGridProps {
  episodes: Media[]
  historyMap: Record<string, WatchHistory>
  clickedEpisodeIds?: Set<string>
  onPlay: (id: string) => void
}

export default function EpisodeGrid({ episodes, historyMap, clickedEpisodeIds, onPlay }: EpisodeGridProps) {
  return (
    <div className="grid grid-cols-[repeat(27,minmax(0,1fr))] gap-3">
      {episodes.map((ep) => {
        const watched = historyMap[ep.id] || clickedEpisodeIds?.has(ep.id)
        return (
          <button
            key={ep.id}
            onClick={() => onPlay(ep.id)}
            className={clsx(
              'aspect-square rounded-lg flex items-center justify-center text-sm font-medium border transition-all hover:scale-105 hover:bg-[var(--neon-blue-10)]',
              watched
                ? 'text-[var(--neon-blue)] border-[var(--neon-blue)]'
                : 'text-[var(--text-secondary)] border-[var(--border-default)] active:text-[var(--neon-blue)] active:border-[var(--neon-blue)]',
            )}
            style={{ background: 'transparent' }}
          >
            {ep.episode_num}
          </button>
        )
      })}
    </div>
  )
}
