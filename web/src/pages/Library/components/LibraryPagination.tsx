import { ChevronLeft, ChevronRight } from 'lucide-react'

interface LibraryPaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  disabled?: boolean  // 当分页阈值为0时禁用分页
}

export function LibraryPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  disabled = false,
}: LibraryPaginationProps) {
  // 当禁用分页时，直接返回空
  if (disabled) {
    return null
  }

  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      
      if (page > 4) {
        pages.push('...')
      }
      
      const start = Math.max(2, page - 2)
      const end = Math.min(totalPages - 1, page + 2)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (page < totalPages - 3) {
        pages.push('...')
      }
      
      pages.push(totalPages)
    }
    
    return pages
  }

  return (
    <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
      {/* 显示范围 */}
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        显示 <strong className="text-neon">{startItem}</strong> - <strong className="text-neon">{endItem}</strong> 条，共 <strong className="text-neon">{total}</strong> 条
      </p>

      {/* 页码导航 */}
      <div className="flex items-center gap-1">
        {/* 上一页 */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center justify-center rounded-lg p-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: 'var(--text-secondary)',
            background: page > 1 ? 'var(--bg-surface)' : 'transparent',
          }}
        >
          <ChevronLeft size={16} />
        </button>

        {/* 页码 */}
        {getPageNumbers().map((pageNum, index) => (
          <button
            key={index}
            onClick={() => typeof pageNum === 'number' && onPageChange(pageNum)}
            disabled={typeof pageNum !== 'number'}
            className={`flex items-center justify-center min-w-[32px] rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${typeof pageNum === 'number' && pageNum === page ? 'text-neon' : ''}`}
            style={{
              color: typeof pageNum === 'number' && pageNum === page ? undefined : 'var(--text-secondary)',
              background: typeof pageNum === 'number' && pageNum === page ? 'var(--nav-active-bg)' : 'transparent',
            }}
          >
            {pageNum}
          </button>
        ))}

        {/* 下一页 */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center justify-center rounded-lg p-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: 'var(--text-secondary)',
            background: page < totalPages ? 'var(--bg-surface)' : 'transparent',
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}