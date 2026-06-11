import EpisodeSlideCard from '@/components/EpisodeSlideCard'
import EpisodeGrid from '@/components/EpisodeGrid'
import { HorizontalScrollRow } from '@/components/common/layout/HorizontalScrollRow'
import { motion } from 'framer-motion'
import { staggerContainerVariants } from '@/lib/motion'
import type { Media, WatchHistory } from '@/types'

interface EpisodeListProps {
  displayMode: 'slide' | 'number'
  displayedEpisodes: Media[]
  historyMap: Record<string, WatchHistory>
  clickedEpisodeIds: Set<string>
  seriesId: string | undefined
  seasonNum: number
  onPlay: (id: string) => void
  onManualMatch?: (episodeId: string) => void
  onUnmatch?: (episodeId: string) => void
  onRefreshMetadata?: (episodeId: string) => void
  onEditMetadata?: (episodeId: string) => void
  onDelete?: (episodeId: string) => void
}

export default function EpisodeList({
  displayMode,
  displayedEpisodes,
  historyMap,
  clickedEpisodeIds,
  seriesId,
  seasonNum,
  onPlay,
  onManualMatch,
  onUnmatch,
  onRefreshMetadata,
  onEditMetadata,
  onDelete,
}: EpisodeListProps) {
  // 幻灯片模式
  if (displayMode === 'slide') {
    return (
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="overflow-hidden"
      >
        <HorizontalScrollRow gap={12}>
          {displayedEpisodes.map((ep) => (
            <EpisodeSlideCard
              key={ep.id}
              episode={ep}
              historyRecord={historyMap[ep.id]}
              seriesId={seriesId}
              seasonNum={seasonNum}
              onManualMatch={() => onManualMatch?.(ep.id)}
              onUnmatch={() => onUnmatch?.(ep.id)}
              onRefreshMetadata={() => onRefreshMetadata?.(ep.id)}
              onEditMetadata={() => onEditMetadata?.(ep.id)}
              onDelete={() => onDelete?.(ep.id)}
            />
          ))}
        </HorizontalScrollRow>
      </motion.div>
    )
  }

  // 序号模式
  return (
    displayedEpisodes.length === 0 ? (
      <div className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>
        该分段暂无剧集
      </div>
    ) : (
      <EpisodeGrid
        episodes={displayedEpisodes}
        historyMap={historyMap}
        clickedEpisodeIds={clickedEpisodeIds}
        onPlay={onPlay}
      />
    )
  )
}