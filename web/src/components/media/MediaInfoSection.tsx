import { useState } from 'react'
import type { Media, MediaPlayInfo } from '@/types'
import {
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from '@/i18n'

interface MediaInfoSectionProps {
  media: Media
  playInfo: MediaPlayInfo | null
}

export default function MediaInfoSection({ media, playInfo: _playInfo }: MediaInfoSectionProps) {
  const { t } = useTranslation()
  const [plotExpanded, setPlotExpanded] = useState(false)
  const [origPlotExpanded, setOrigPlotExpanded] = useState(false)
  const isLongPlot = (media.overview?.length || 0) > 200
  const isLongOrigPlot = (media.original_plot?.length || 0) > 120
  // 单集详情页不折叠简介
  const isEpisode = media.media_type === 'episode'

  return (
    <>






      {/* 剧情摘要 (outline)：短摘要，总是全量展示 */}
      {media.outline && media.outline !== media.overview && (
        <section>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {t('mediaInfo.outline')}
          </h4>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {media.outline}
          </p>
        </section>
      )}

      {/* 详细剧情 (plot = overview)：可展开/收起 */}
      {media.overview && (
        <section>
          {media.outline && media.outline !== media.overview && (
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {t('mediaInfo.plot')}
            </h4>
          )}
          <div className="relative">
            <p className={clsx(
              'text-sm leading-relaxed transition-all duration-500',
              !isEpisode && !plotExpanded && isLongPlot && 'line-clamp-3'
            )} style={{ color: 'var(--text-secondary)' }}>
              {media.overview}
            </p>
            {!isEpisode && isLongPlot && !plotExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-8" style={{ background: `linear-gradient(to top, var(--bg-base), transparent)` }} />
            )}
          </div>
          {!isEpisode && isLongPlot && (
            <button
              onClick={() => setPlotExpanded(!plotExpanded)}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-neon transition-colors hover:text-neon-blue"
            >
              {plotExpanded ? (
                <><ChevronUp size={14} />{t('mediaInfo.collapse')}</>
              ) : (
                <><ChevronDown size={14} />{t('mediaInfo.expandAll')}</>
              )}
            </button>
          )}
        </section>
      )}

      {/* 原文剧情 (originalplot) */}
      {media.original_plot && (
        <section>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {t('mediaInfo.originalPlot')}
          </h4>
          <div className="relative">
            <p className={clsx(
              'text-sm leading-relaxed italic transition-all duration-500',
              !origPlotExpanded && isLongOrigPlot && 'line-clamp-2'
            )} style={{ color: 'var(--text-muted)' }}>
              {media.original_plot}
            </p>
          </div>
          {isLongOrigPlot && (
            <button
              onClick={() => setOrigPlotExpanded(!origPlotExpanded)}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-neon transition-colors hover:text-neon-blue"
            >
              {origPlotExpanded ? (
                <><ChevronUp size={14} />{t('mediaInfo.collapse')}</>
              ) : (
                <><ChevronDown size={14} />{t('mediaInfo.expandAll')}</>
              )}
            </button>
          )}
        </section>
      )}




    </>
  )
}
