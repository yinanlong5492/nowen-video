import { useHorizontalScroll } from '@/hooks/useHorizontalScroll'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface HorizontalScrollRowProps {
  children: React.ReactNode
  gap?: number
  className?: string
}

export function HorizontalScrollRow({ children, gap = 16, className = '' }: HorizontalScrollRowProps) {
  const { scrollRef, canScrollLeft, canScrollRight, scroll } = useHorizontalScroll()

  return (
    <div className={`group/row relative ${className}`}>
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute -left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 opacity-0 transition-all group-hover/row:opacity-100"
          style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}
          aria-label="scroll left"
        >
          <ChevronLeft size={20} className="text-theme-primary" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="scrollbar-hide flex overflow-x-auto scroll-smooth pb-2"
        style={{ gap }}
      >
        {children}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute -right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 opacity-0 transition-all group-hover/row:opacity-100"
          style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}
          aria-label="scroll right"
        >
          <ChevronRight size={20} className="text-theme-primary" />
        </button>
      )}
    </div>
  )
}
