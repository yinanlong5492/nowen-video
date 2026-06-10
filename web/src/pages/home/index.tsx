import { useTranslation } from '@/i18n'
import { useHomeData } from './hooks/useHomeData'
import LibraryGrid from './components/LibraryGrid'
import { MediaRow } from '@/components/common/layout/MediaRow'
import HomeSkeleton from './components/HomeSkeleton'

export default function HomePage() {
  const { t } = useTranslation()
  const { continueList, libraries, loading } = useHomeData()

  return (
    <div className="space-y-8">
      {/* 我的媒体库 */}
      {libraries.length > 0 && <LibraryGrid libraries={libraries} />}

      {/* 继续观看 */}
      {continueList.length > 0 && (
        <MediaRow
          title={t('home.continueWatching')}
          items={continueList}
          cardType="continue"
          watchedLabel={(p) => t('home.watched', { percent: String(p) })}
        />
      )}

      {/* 每个媒体库的最近添加 */}
      {libraries.map((lib) => (
        lib.recentItems.length > 0 && (
          <MediaRow
            key={lib.id}
            title={lib.name}
            items={lib.recentItems}
            cardType="recent"
          />
        )
      ))}

      {/* 骨架屏加载状态 */}
      {loading && continueList.length === 0 && libraries.length === 0 && (
        <HomeSkeleton />
      )}
    </div>
  )
}
