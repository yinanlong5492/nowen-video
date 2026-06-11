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
  
  // 检查媒体数据是否已加载
  const isLoaded = media && media.title
  
  // 预计算文本长度，避免重渲染时的抖动
  const overviewLength = media.overview?.length || 0
  const originalPlotLength = media.original_plot?.length || 0
  const isLongPlot = overviewLength > 200
  const isLongOrigPlot = originalPlotLength > 120
  // 单集详情页不折叠简介
  const isEpisode = media.media_type === 'episode'

  // 如果数据未加载，显示骨架屏
  if (!isLoaded) {
    return (
      <div className="space-y-6 min-h-[10rem]">
        <div className="space-y-2">
          <div className="skeleton h-6 w-16 rounded-md" />
          <div className="skeleton h-4 w-full rounded-md" />
          <div className="skeleton h-4 w-full rounded-md" />
          <div className="skeleton h-4 w-3/4 rounded-md" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 剧情摘要 (outline)：短摘要，总是全量展示 */}
      {media.outline && media.outline !== media.overview && (
        <section>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
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
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {t('mediaInfo.plot')}
            </h4>
          )}
          <div className="relative min-h-[4rem]">
            <p className={clsx(
              'text-sm leading-relaxed',
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
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {t('mediaInfo.originalPlot')}
          </h4>
          <div className="relative">
            <p className={clsx(
              'text-sm leading-relaxed italic',
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
    </div>
  )
}
