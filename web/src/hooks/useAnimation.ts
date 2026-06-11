// ============================================================
// 动画工具 Hooks — 封装常用动画逻辑
// ============================================================

import { useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import type { Variants } from 'framer-motion'
import {
  staggerContainerVariants,
  staggerItemVariants,
  reducedMotionVariants,
} from '@/lib/motion'

/**
 * 根据用户系统偏好返回合适的动画变体
 * 如果用户开启了 reduce-motion，返回简化版动画
 */
export function useAccessibleVariants(variants: Variants): Variants {
  const prefersReducedMotion = useReducedMotion()
  return prefersReducedMotion ? reducedMotionVariants : variants
}

/**
 * 返回交错动画的容器和子项变体
 * 自动处理 reduce-motion
 */
export function useStaggerVariants() {
  const prefersReducedMotion = useReducedMotion()

  return {
    container: prefersReducedMotion
      ? ({ hidden: { opacity: 0 }, visible: { opacity: 1 } } as Variants)
      : staggerContainerVariants,
    item: prefersReducedMotion
      ? reducedMotionVariants
      : staggerItemVariants,
  }
}

/**
 * 滚动进入视口时触发动画
 * @param threshold 可见比例阈值 (0-1)
 * @param once 是否只触发一次
 */
export function useScrollReveal(threshold = 0.2, once = true) {
  const ref = useRef(null)
  const isInView = useInView(ref, {
    amount: threshold,
    once,
  })

  return { ref, isInView }
}
