import { useState, useRef, useEffect } from 'react'
import { ChevronDown, GalleryHorizontal, List } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

interface SeasonHeaderProps {
  seasons: { season_num: number; episode_count: number }[]
  currentSeasonNum: number
  segments: { start: number; end: number }[]
  currentSegmentIndex: number
  displayMode: 'slide' | 'number'
  onSeasonChange: (seasonNum: number) => void
  onSegmentChange: (index: number) => void
  onDisplayModeChange: (mode: 'slide' | 'number') => void
}

export default function SeasonHeader({
  seasons,
  currentSeasonNum,
  segments,
  currentSegmentIndex,
  displayMode,
  onSeasonChange,
  onSegmentChange,
  onDisplayModeChange,
}: SeasonHeaderProps) {
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSeasonDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="mb-4 flex items-center gap-4">
      {/* 左侧：季选择下拉按钮 */}
      <div className="relative flex-shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
          }}
        >
          <span>{currentSeasonNum === 0 ? '特别篇' : `第 ${currentSeasonNum} 季`}</span>
          <ChevronDown size={14} className={clsx('transition-transform duration-200', showSeasonDropdown && 'rotate-180')} />
        </button>
        {/* 下拉菜单 */}
        <AnimatePresence>
          {showSeasonDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full z-50 mt-1 min-w-[120px] overflow-hidden rounded-lg"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-elevated)',
              }}
            >
              <div className="max-h-48 overflow-y-auto p-1">
                {seasons.map((s) => (
                  <button
                    key={s.season_num}
                    onClick={() => {
                      onSeasonChange(s.season_num)
                      setShowSeasonDropdown(false)
                    }}
                    className={clsx(
                      'flex w-full items-center px-3 py-2 text-sm transition-colors rounded-md',
                      currentSeasonNum === s.season_num ? '' : 'hover:bg-[var(--nav-hover-bg)]'
                    )}
                    style={{
                      background: currentSeasonNum === s.season_num ? 'var(--neon-blue-10)' : 'transparent',
                      color: currentSeasonNum === s.season_num ? 'var(--neon-blue)' : 'var(--text-secondary)',
                    }}
                  >
                    <span>{s.season_num === 0 ? '特别篇' : `第 ${s.season_num} 季`}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 中间：分段指示器 */}
      <div className="flex-1 flex items-center overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {segments.map((seg, index) => (
          <span key={index}>
            {index > 0 && <span className="mx-1" style={{ color: 'var(--text-muted)' }}>/</span>}
            <button
              onClick={() => onSegmentChange(index)}
              className="flex-shrink-0 px-3 py-1.5 text-sm font-medium transition-colors hover:text-neon-blue"
              style={index === currentSegmentIndex ? {
                color: 'var(--neon-blue)',
              } : {
                color: 'var(--text-secondary)',
              }}
            >
              {seg.start}-{seg.end}
            </button>
          </span>
        ))}
      </div>

      {/* 右侧：展示模式切换 */}
      <div className="flex items-center gap-1 rounded-lg p-0.5 flex-shrink-0" style={{ background: 'var(--bg-surface)' }}>
        <button
          onClick={() => onDisplayModeChange('slide')}
          className={clsx(
            'flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200',
            displayMode === 'slide' ? '' : 'hover:bg-[var(--nav-hover-bg)]'
          )}
          style={displayMode === 'slide' ? {
            background: 'var(--bg-card)',
            color: 'var(--neon-blue)',
            boxShadow: 'var(--shadow-elevated)',
          } : { color: 'var(--text-muted)' }}
          title="幻灯片模式"
        >
          <GalleryHorizontal size={14} />
        </button>
        <button
          onClick={() => onDisplayModeChange('number')}
          className={clsx(
            'flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200',
            displayMode === 'number' ? '' : 'hover:bg-[var(--nav-hover-bg)]'
          )}
          style={displayMode === 'number' ? {
            background: 'var(--bg-card)',
            color: 'var(--neon-blue)',
            boxShadow: 'var(--shadow-elevated)',
          } : { color: 'var(--text-muted)' }}
          title="序号模式"
        >
          <List size={14} />
        </button>
      </div>
    </div>
  )
}
