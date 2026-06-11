import { motion, AnimatePresence } from 'framer-motion'
import { durations } from '@/lib/motion'

export type SkeletonVariant = 'movie' | 'episode' | 'series' | 'season'

interface MediaDetailSkeletonProps {
  variant?: SkeletonVariant
}

export function MediaDetailSkeleton({ variant = 'movie' }: MediaDetailSkeletonProps) {
  // Series skeleton (剧集详情页)
  if (variant === 'series') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: durations.fast }}
          className="-mx-4 sm:-mx-6 lg:-mx-8 relative -mt-16 space-y-6"
          style={{ background: 'var(--bg-base)' }}
        >
          {/* Hero Section */}
          <div className="relative h-[420px] min-h-[420px] sm:h-[80vh] overflow-hidden bg-[var(--bg-card)]">
            <div className="skeleton absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-transparent to-transparent" />
            <div className="relative -mt-48 px-4 pb-2 sm:px-6 lg:px-8">
              <div className="skeleton h-12 w-3/4 rounded-lg mb-2" />
              <div className="skeleton h-6 w-1/2 rounded-md mb-4" />
              <div className="flex gap-3">
                <div className="skeleton h-10 w-28 rounded-lg" />
                <div className="skeleton h-10 w-28 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="mx-auto px-4 pt-6 sm:px-6 lg:px-8">
            <div className="flex gap-6">
            <div className="skeleton hidden h-72 w-48 rounded-xl sm:block" />
            <div className="flex-1 space-y-4">
              <div className="skeleton h-10 w-2/3 rounded-lg" />
              <div className="skeleton h-5 w-1/3 rounded-lg" />
              <div className="flex gap-3">
                <div className="skeleton h-12 w-28 rounded-xl" />
                <div className="skeleton h-12 w-24 rounded-xl" />
              </div>
              <div className="skeleton h-20 w-full rounded-xl" />
            </div>
            </div>

            {/* Seasons Grid */}
            <div className="space-y-4">
              <div className="skeleton h-8 w-20 rounded-md" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="skeleton h-40 rounded-xl" />
                ))}
              </div>
            </div>
            {/* Cast */}
            <div className="space-y-4">
              <div className="skeleton h-8 w-24 rounded-md" />
              <div className="flex gap-4 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="skeleton flex-shrink-0 h-32 w-24 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Season skeleton (季详情页)
  if (variant === 'season') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: durations.fast }}
          className="-mx-4 sm:-mx-6 lg:-mx-8 relative -mt-16 space-y-6"
          style={{ background: 'var(--bg-base)' }}
        >
          {/* Hero Section */}
          <div className="relative h-[420px] min-h-[420px] sm:h-[80vh] overflow-hidden bg-[var(--bg-card)]">
            <div className="skeleton absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-transparent to-transparent" />
            <div className="relative -mt-48 px-4 pb-2 sm:px-6 lg:px-8">
              <div className="skeleton h-12 w-3/4 rounded-lg mb-2" />
              <div className="skeleton h-6 w-1/2 rounded-md mb-4" />
              <div className="flex gap-3">
                <div className="skeleton h-10 w-28 rounded-lg" />
                <div className="skeleton h-10 w-28 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="space-y-4 px-4">
            <div className="skeleton h-10 w-2/3 rounded-lg" />
            <div className="skeleton h-6 w-1/2 rounded-lg" />
            {/* Season Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton flex-shrink-0 h-8 w-16 rounded-md" />
              ))}
            </div>
            {/* Episode List */}
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton h-20 w-full rounded-xl" />
              ))}
            </div>
          </div>
          {/* Cast */}
          <div className="space-y-4 px-4">
            <div className="skeleton h-8 w-24 rounded-md" />
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton flex-shrink-0 h-32 w-24 rounded-lg" />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Movie/Episode skeleton (电影/集详情页)
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="skeleton"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="-mx-4 sm:-mx-6 lg:-mx-8 relative -mt-16 space-y-6"
        style={{ background: 'var(--bg-base)' }}
      >
        {/* Hero Section */}
        <div className="relative h-[420px] min-h-[420px] sm:h-[80vh] overflow-hidden bg-[var(--bg-card)]">
          <div className="skeleton absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-transparent to-transparent" />
          <div className="relative -mt-48 px-4 pb-2 sm:px-6 lg:px-8">
            <div className="skeleton h-12 w-3/4 rounded-lg mb-2" />
            <div className="skeleton h-6 w-1/2 rounded-md mb-4" />
            <div className="flex gap-3">
              <div className="skeleton h-10 w-28 rounded-lg" />
              <div className="skeleton h-10 w-28 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="mx-auto space-y-8 px-4 pt-6 sm:px-6 lg:px-8">
          <div className="flex gap-6">
            <div className="skeleton hidden h-72 w-48 rounded-xl sm:block" />
            
            <div className="flex-1 space-y-4">
              {/* Title */}
              <div className="skeleton h-10 w-2/3 rounded-lg" />
              
              {/* Meta Info */}
              <div className="flex flex-wrap gap-2">
                <div className="skeleton h-6 w-16 rounded-md" />
                <div className="skeleton h-6 w-20 rounded-md" />
                <div className="skeleton h-6 w-16 rounded-md" />
                <div className="skeleton h-6 w-24 rounded-md" />
              </div>

              {/* Overview */}
              <div className="space-y-2 min-h-[6rem]">
                <div className="skeleton h-6 w-16 rounded-md" />
                <div className="skeleton h-4 w-full rounded-md" />
                <div className="skeleton h-4 w-full rounded-md" />
                <div className="skeleton h-4 w-3/4 rounded-md" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <div className="skeleton h-10 w-32 rounded-lg" />
                <div className="skeleton h-10 w-32 rounded-lg" />
                <div className="skeleton h-10 w-32 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="skeleton h-8 w-20 rounded-md" />
              <div className="skeleton h-8 w-20 rounded-md" />
              <div className="skeleton h-8 w-24 rounded-md" />
              <div className="skeleton h-8 w-24 rounded-md" />
            </div>
            <div className="space-y-3">
              <div className="skeleton h-4 w-full rounded-md" />
              <div className="skeleton h-4 w-full rounded-md" />
              <div className="skeleton h-4 w-3/4 rounded-md" />
            </div>
          </div>

          {/* Cast Section */}
          <div className="space-y-4">
            <div className="skeleton h-8 w-24 rounded-md" />
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton flex-shrink-0 h-32 w-24 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Tech Specs Section */}
          <div className="space-y-4">
            <div className="skeleton h-8 w-24 rounded-md" />
            <div className="grid grid-cols-2 gap-4">
              <div className="skeleton h-6 w-full rounded-md" />
              <div className="skeleton h-6 w-full rounded-md" />
              <div className="skeleton h-6 w-full rounded-md" />
              <div className="skeleton h-6 w-full rounded-md" />
              <div className="skeleton h-6 w-full rounded-md" />
              <div className="skeleton h-6 w-full rounded-md" />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}