import { useCallback, useEffect, useRef, useState } from 'react'

export interface ScrollState {
  canScrollLeft: boolean
  canScrollRight: boolean
}

export function useSmoothScroll<T extends HTMLElement>(scrollAmount: number = 0.7, itemCount?: number) {
  const scrollRef = useRef<T>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const animationFrameRef = useRef<number | null>(null)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 1
    const canScrollLeftValue = el.scrollLeft > threshold
    const canScrollRightValue = el.scrollLeft < el.scrollWidth - el.clientWidth - threshold
    setCanScrollLeft(canScrollLeftValue)
    setCanScrollRight(canScrollRightValue)
  }, [])

  const smoothScrollTo = useCallback((targetScrollLeft: number) => {
    const el = scrollRef.current
    if (!el) return

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // 使用浏览器原生平滑滚动 API，响应更快、性能更好
    el.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth'
    })
  }, [])

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return

    const amount = el.clientWidth * scrollAmount
    const currentScroll = el.scrollLeft
    let targetScroll = direction === 'left' ? currentScroll - amount : currentScroll + amount

    targetScroll = Math.max(0, Math.min(targetScroll, el.scrollWidth - el.clientWidth))

    smoothScrollTo(targetScroll)
  }, [scrollAmount, smoothScrollTo])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => updateScrollState()
    const handleResize = () => updateScrollState()

    el.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    // ResizeObserver 监听内容变化，确保数据加载后滚动状态正确更新
    const resizeObserver = new ResizeObserver(() => {
      updateScrollState()
    })
    resizeObserver.observe(el)

    // 数据加载后延迟更新状态，确保DOM已渲染完成
    const checkStateDelayed = () => {
      updateScrollState()
    }
    const delayTimer = setTimeout(checkStateDelayed, 100)
    const mutationObserver = new MutationObserver(() => {
      updateScrollState()
    })
    mutationObserver.observe(el, { childList: true, subtree: true })

    updateScrollState()

    return () => {
      el.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      clearTimeout(delayTimer)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [updateScrollState, itemCount])

  return {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    scroll,
  }
}
