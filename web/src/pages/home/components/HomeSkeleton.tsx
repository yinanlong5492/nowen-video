import { motion } from 'framer-motion'

export default function HomeSkeleton() {
  return (
    <motion.section
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* 继续观看骨架屏 */}
      <div>
        <div className="skeleton mb-5 h-7 w-32 rounded-lg" />
        <div className="flex gap-4 overflow-hidden pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[220px] flex-shrink-0 sm:w-[260px]">
              <div className="skeleton aspect-video w-full rounded-xl" />
              <div className="mt-2 space-y-2 px-1">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* 媒体网格骨架屏 */}
      <div>
        <div className="skeleton mb-5 h-7 w-28 rounded-lg" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl" style={{ border: '1px solid var(--border-default)' }}>
              <div className="skeleton aspect-[2/3]" />
              <div className="space-y-2 p-3">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
