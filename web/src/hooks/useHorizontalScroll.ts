import { useRef, useState, useEffect, useCallback } from 'react'

export function useHorizontalScroll(threshold = 10) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > threshold)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - threshold)
  }, [threshold])

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.7
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateScrollState, { passive: true })
    updateScrollState()
    return () => el.removeEventListener('scroll', updateScrollState)
  }, [updateScrollState])

  return { scrollRef, canScrollLeft, canScrollRight, scroll }
}
