import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { staggerContainerVariants, staggerItemVariants } from '@/lib/motion';

interface HorizontalScrollProps {
  title?: string;
  itemCount: number;
  children: React.ReactNode;
  className?: string;
  showScrollButtons?: boolean;
  gridCols?: number;  // 新增：网格模式下每行的列数，0或undefined表示纯横向滚动
  gridGap?: string;   // 新增：网格间距
}

export default function HorizontalScroll({ 
  title, 
  itemCount, 
  children, 
  className = '', 
  showScrollButtons = true,
  gridCols = 0,
  gridGap = 'gap-4',
}: HorizontalScrollProps) {
  const { scrollRef, canScrollLeft, canScrollRight, scroll } = useSmoothScroll<HTMLDivElement>(0.7, itemCount);
  
  // 根据是否启用网格模式设置内容容器样式
  const contentClass = gridCols > 0 
    ? `grid grid-cols-${gridCols} ${gridGap}` 
    : `flex ${gridGap}`;

  return (
    <motion.section 
      variants={staggerContainerVariants} 
      initial="hidden" 
      animate="visible" 
      className={`space-y-4 ${className}`}
    >
      {title && (
        <motion.h2 
          variants={staggerItemVariants} 
          className="font-display text-xl font-bold tracking-wide" 
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </motion.h2>
      )}

      <div className="relative overflow-x-hidden">
        {showScrollButtons && canScrollLeft && (
          <button 
            onClick={() => scroll('left')} 
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 transition-all" 
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }} 
            aria-label="scroll left"
          >
            <ChevronLeft size={20} className="text-theme-primary"/>
          </button>
        )}

        <div 
          ref={scrollRef} 
          className={`scrollbar-hide ${contentClass} overflow-x-auto scroll-smooth pb-4`}
          // 网格模式下需要设置宽度以支持水平滚动
          style={gridCols > 0 ? { width: 'max-content' } : undefined}
        >
          {children}
        </div>

        {showScrollButtons && canScrollRight && (
          <button 
            onClick={() => scroll('right')} 
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 transition-all" 
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }} 
            aria-label="scroll right"
          >
            <ChevronRight size={20} className="text-theme-primary"/>
          </button>
        )}
      </div>
    </motion.section>
  );
}