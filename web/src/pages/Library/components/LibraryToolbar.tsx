import { useState } from 'react'
import { Grid3X3, LayoutList, ArrowUpDown, ChevronDown, X, Filter, Search, XCircle } from 'lucide-react'
import clsx from 'clsx'

const SORT_OPTIONS = [
  { value: 'created_desc', label: '最近添加' },
  { value: 'created_asc', label: '最早添加' },
  { value: 'title_asc', label: '名称 A-Z' },
  { value: 'title_desc', label: '名称 Z-A' },
  { value: 'year_desc', label: '年份最新' },
  { value: 'year_asc', label: '年份最早' },
  { value: 'rating_desc', label: '评分最高' },
]

const VIEW_OPTIONS = [
  { value: 'grid', label: '竖版海报视图', icon: Grid3X3 },
  { value: 'wide', label: '横板海报视图', icon: LayoutList },
]

interface LibraryToolbarProps {
  searchQuery: string
  sortValue: string
  filterGenre: string | null
  viewMode: 'grid' | 'wide'
  allGenres: string[]
  onSearchChange: (query: string) => void
  onSortChange: (value: string) => void
  onFilterChange: (genre: string | null) => void
  onViewModeChange: (mode: 'grid' | 'wide') => void
  onClearFilters: () => void
}

export function LibraryToolbar({
  searchQuery,
  sortValue,
  filterGenre,
  viewMode,
  allGenres,
  onSearchChange,
  onSortChange,
  onFilterChange,
  onViewModeChange,
  onClearFilters,
}: LibraryToolbarProps) {
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showViewDropdown, setShowViewDropdown] = useState(false)

  const currentSortLabel = SORT_OPTIONS.find(opt => opt.value === sortValue)?.label || '排序'

  return (
    <div className="mb-4 space-y-3">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {/* 排序下拉 */}
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              background: 'var(--bg-surface)',
            }}
          >
            <ArrowUpDown size={14} />
            {currentSortLabel}
            <ChevronDown size={14} className={showSortDropdown ? 'rotate-180' : ''} />
          </button>

          {showSortDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
              <div
                className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-xl shadow-xl animate-slide-up"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
              >
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value)
                      setShowSortDropdown(false)
                    }}
                    className={clsx(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      sortValue === option.value && 'text-neon'
                    )}
                    style={{
                      color: sortValue === option.value ? undefined : 'var(--text-secondary)',
                      background: sortValue === option.value ? 'var(--nav-active-bg)' : 'transparent',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 筛选按钮 */}
        {allGenres.length > 0 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all',
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
        )}

        {/* 布局下拉菜单 */}
        <div className="relative">
          <button
            onClick={() => setShowViewDropdown(!showViewDropdown)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              background: 'var(--bg-surface)',
            }}
          >
            {viewMode === 'grid' ? <Grid3X3 size={14} /> : <LayoutList size={14} />}
            布局
            <ChevronDown size={14} className={showViewDropdown ? 'rotate-180' : ''} />
          </button>

          {showViewDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowViewDropdown(false)} />
              <div
                className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-xl shadow-xl animate-slide-up"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
              >
                {VIEW_OPTIONS.map((option) => {
                  const IconComponent = option.icon
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        onViewModeChange(option.value as 'grid' | 'wide')
                        setShowViewDropdown(false)
                      }}
                      className={clsx(
                        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                        viewMode === option.value && 'text-neon'
                      )}
                      style={{
                        color: viewMode === option.value ? undefined : 'var(--text-secondary)',
                        background: viewMode === option.value ? 'var(--nav-active-bg)' : 'transparent',
                      }}
                    >
                      <IconComponent size={14} />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* 搜索框 */}
        <div className="relative flex-1 min-w-[120px] max-w-[200px] sm:max-w-[240px]">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索..."
            className="w-full rounded-xl pl-8 pr-8 py-2 text-sm transition-colors"
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              background: 'var(--bg-surface)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors hover:text-[var(--text-secondary)]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <XCircle size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 类型筛选标签行 */}
      {showFilters && allGenres.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-xl p-3 animate-slide-up"
          style={{
            background: 'var(--nav-hover-bg)',
            border: '1px solid var(--border-default)',
          }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            类型:
          </span>
          <button
            onClick={() => onFilterChange(null)}
            className={clsx(
              'rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
              !filterGenre && 'text-neon'
            )}
            style={{
              background: !filterGenre ? 'var(--nav-active-bg)' : 'transparent',
              color: !filterGenre ? undefined : 'var(--text-secondary)',
            }}
          >
            全部
          </button>
          {allGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => onFilterChange(filterGenre === genre ? null : genre)}
              className={clsx(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                filterGenre === genre && 'text-neon'
              )}
              style={{
                background: filterGenre === genre ? 'var(--nav-active-bg)' : 'transparent',
                color: filterGenre === genre ? undefined : 'var(--text-secondary)',
              }}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* 筛选结果提示 */}
      {filterGenre && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <span>
            筛选条件: <strong className="text-neon">{filterGenre}</strong>
          </span>
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-[var(--nav-hover-bg)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={12} />
            清除筛选
          </button>
        </div>
      )}
    </div>
  )
}