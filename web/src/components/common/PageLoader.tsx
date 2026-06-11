import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface PageLoaderProps {
  loading: boolean
  children: React.ReactNode
  skeleton?: React.ReactNode
  emptyState?: React.ReactNode
  isEmpty?: boolean
  minDisplayTime?: number // 骨架屏最小展示时间，默认300ms
}

export function PageLoader({ 
  loading, 
  children, 
  skeleton, 
  emptyState, 
  isEmpty = false,
  minDisplayTime = 300
}: PageLoaderProps) {
  // 空状态优先处理
  if (isEmpty && emptyState) {
    return emptyState
  }

  // 最小展示时间逻辑：防止骨架屏一闪而过
  const [canHideSkeleton, setCanHideSkeleton] = useState(false)
  const [startTime] = useState(() => loading ? Date.now() : 0)

  useEffect(() => {
    if (!loading) {
      const elapsed = Date.now() - startTime
      const delay = elapsed < minDisplayTime ? minDisplayTime - elapsed : 0
      const timer = setTimeout(() => {
        setCanHideSkeleton(true)
      }, delay)
      return () => clearTimeout(timer)
    } else {
      setCanHideSkeleton(false)
    }
  }, [loading, startTime, minDisplayTime])

  // 原子化切换：要么骨架屏，要么内容，无中间态
  const showContent = !loading && canHideSkeleton

  return (
    <div className="content-box relative w-full min-h-[400px]">
      <AnimatePresence mode="wait">
        {showContent ? (
          // 真实内容
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="real-content w-full"
          >
            {children}
          </motion.div>
        ) : (
          // 骨架屏
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="skeleton absolute inset-0"
          >
            {skeleton || (
              <div className="flex h-full items-center justify-center">
                <div className="animate-pulse text-surface-600">Loading...</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}