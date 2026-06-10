import { ArrowUpDown, ChevronDown, Filter, X, Grid3X3, LayoutList } from 'lucide-react'
import clsx from 'clsx'
import { SORT_OPTIONS } from '../utils/libraryHelpers'

interface LibraryToolbarProps {
  sortValue: string
  showSortDropdown: boolean
  filterGenre: string | null
  showFilters: boolean
  viewMode: 'grid' | 'list'
  currentSortLabel: string
  searchQuery: string
  filteredCount: number
  onSortChange: (value: string) => void
  onShowSortDropdown: (show: boolean) => void
  onShowFilters: (show: boolean) => void
  onViewModeChange: (mode: 'grid' | 'list') => void
  onClearFilters: () => void
}

export default function LibraryToolbar({
  sortValue,
  showSortDropdown,
  filterGenre,
  showFilters,
  viewMode,
  currentSortLabel,
  searchQuery,
  filteredCount,
  onSortChange,
  onShowSortDropdown,
  onShowFilters,
  onViewModeChange,
  onClearFilters,
}: LibraryToolbarProps) {
  return (
    <div className="mb-6 space-y-4">
      {/* 第一行：排序 + 筛选 + 视图 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 排序下拉 */}
        <div className="relative">
          <button
            onClick={() => onShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition-all"
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            <ArrowUpDown size={14} />
            {currentSortLabel}
            <ChevronDown size={12} />
          </button>
          {showSortDropdown && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => onShowSortDropdown(false)} />
              <div
                className="absolute left-0 top-full z-40 mt-1 w-40 overflow-hidden rounded-xl py-1 animate-slide-up"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  boxShadow: 'var(--shadow-elevated)',
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onSortChange(opt.value)
                      onShowSortDropdown(false)
                    }}
                    className={clsx(
                      'w-full px-3 py-2 text-left text-sm transition-colors',
                      sortValue === opt.value
                        ? 'text-neon bg-[var(--nav-active-bg)]'
                        : 'hover:bg-[var(--nav-hover-bg)]'
                    )}
                    style={sortValue !== opt.value ? { color: 'var(--text-secondary)' } : undefined}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 筛选按钮 */}
        <button
          onClick={() => onShowFilters(!showFilters)}
          className={clsx(
            'flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium transition-all',
            filterGenre && 'text-neon'
          )}
          style={{
            border: `1px solid ${filterGenre ? 'var(--border-hover)' : 'var(--border-default)'}`,
            color: filterGenre ? 'var(--neon-blue)' : 'var(--text-secondary)',
            background: filterGenre ? 'var(--nav-active-bg)' : 'transparent',
          }}
        >
          <Filter size={14} />
          筛选
          {filterGenre && (
            <span
              className="ml-1 rounded-full px-1.5 text-[10px] font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
                color: 'var(--text-on-neon)',
              }}
            >
              1
            </span>
          )}
        </button>

        {/* 视图切换 */}
        <div
          className="flex items-center rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border-default)' }}
        >
          <button
            onClick={() => onViewModeChange('grid')}
            className="p-2 transition-all"
            style={{
              background: viewMode === 'grid' ? 'var(--nav-active-bg)' : 'transparent',
              color: viewMode === 'grid' ? 'var(--neon-blue)' : 'var(--text-tertiary)',
            }}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className="p-2 transition-all"
            style={{
              background: viewMode === 'list' ? 'var(--nav-active-bg)' : 'transparent',
              color: viewMode === 'list' ? 'var(--neon-blue)' : 'var(--text-tertiary)',
            }}
          >
            <LayoutList size={16} />
          </button>
        </div>
      </div>

      {/* 搜索结果提示 */}
      {(searchQuery || filterGenre) && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <span>
            找到 <strong className="text-neon">{filteredCount}</strong> 个结果
          </span>
          {(searchQuery || filterGenre) && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-[var(--nav-hover-bg)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X size={12} />
              清除筛选
            </button>
          )}
        </div>
      )}
    </div>
  )
}
