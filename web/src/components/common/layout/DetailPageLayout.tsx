import { motion } from 'framer-motion'
import { easeSmooth, durations } from '@/lib/motion'

interface DetailPageLayoutProps {
  hero: React.ReactNode
  children: React.ReactNode
  modals?: React.ReactNode
  className?: string
}

export function DetailPageLayout({ hero, children, modals, className = '' }: DetailPageLayoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durations.page, ease: easeSmooth }}
      className={`relative -mx-4 -mt-16 sm:-mx-6 lg:-mx-8 ${className}`}
      style={{ background: 'var(--bg-base)' }}
    >
      {hero}
      <div className="mx-auto space-y-8 px-4 pt-6 sm:px-6 lg:px-8">
        {children}
      </div>
      {modals}
    </motion.div>
  )
}