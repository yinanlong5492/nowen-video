import { useTranslation } from '@/i18n'
import { motion } from 'framer-motion'
import { useHomeData } from './hooks/useHomeData'
import ContinueWatchingRow from './components/ContinueWatchingRow'
import LibraryRow from './components/LibraryRow'

export default function HomePage() {
  const { t } = useTranslation()
  const { data, loading } = useHomeData()
  const { continueList, libraries } = data || {}

  return (
    <div className="space-y-8">
      {/* 我的媒体库 — 横向滚动 */}
      {libraries && libraries.length > 0 && (
        <LibraryRow mode="library" title={t('home.myLibraries')} libraries={libraries} />
      )}

      {/* 继续观看 */}
      {continueList && continueList.length > 0 && (
        <ContinueWatchingRow items={continueList} title={t('home.continueWatching')} />
      )}

      {/* 每个媒体库的最近添加 */}
      {libraries && libraries.map((lib) => (
        lib.recentItems.length > 0 && (
          <LibraryRow key={lib.id} mode="recent" title={lib.name} library={lib} />
        )
      ))}

      {/* 骨架屏加载状态 */}
      {loading && continueList?.length === 0 && libraries?.length === 0 && (
        <motion.section
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
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
      )}
    </div>
  )
}
