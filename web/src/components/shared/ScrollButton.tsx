import { memo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ScrollButtonProps {
  direction: 'left' | 'right'
  onClick: () => void
  disabled?: boolean
}

const ScrollButton = memo(function ScrollButton({ direction, onClick, disabled = false }: ScrollButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded-lg transition-colors bg-[var(--bg-surface)] text-theme-secondary hover:text-theme-primary hover:bg-[var(--nav-hover-bg)] disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {direction === 'left' ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </button>
  )
})

export default ScrollButton