import { useTranslation } from '@/i18n'
import { useHomeData } from './hooks/useHomeData'
import LibraryGrid from './components/LibraryGrid'
import { MediaRow } from '@/components/common/layout/MediaRow'
import HomeSkeleton from './components/HomeSkeleton'
import { PageLoader } from '@/components/common/PageLoader'
import { MediaModals } from '@/components/common/MediaModals'
import { useMediaActions } from '@/hooks/useMedia'
import { useHomeDetailPageModalConfig } from '@/hooks/useMediaModalConfig'
import { useDetailPageContext } from '@/hooks/useDetailPage'

export default function HomePage() {
  const { t, isAdmin } = useDetailPageContext()
  const { continueList, libraries, loading, refreshHomeData } = useHomeData()

  // 使用统一的弹窗配置 hook
  const {
    showEditModal,
    showDeleteConfirm,
    showUnmatchConfirm,
    showRefreshModal,
    showMatchModal,
    setShowEditModal,
    setShowDeleteConfirm,
    setShowUnmatchConfirm,
    setShowRefreshModal,
    setShowMatchModal,
    handleEditMetadata,
    handleDeleteClick,
    handleUnmatchClick,
    handleRefreshMetadata,
    handleManualMatch,
    modalProps,
  } = useHomeDetailPageModalConfig({
    continueList,
    libraries,
    onRefresh: refreshHomeData,
    setPosterVersion: () => {},
    onDeleteNavigate: () => {},
  })

  // 使用统一的媒体操作 Hook
  const mediaActions = useMediaActions({
    isAdmin,
    onManualMatch: handleManualMatch,
    onUnmatch: handleUnmatchClick,
    onRefreshMetadata: handleRefreshMetadata,
    onEditMetadata: handleEditMetadata,
    onDelete: handleDeleteClick,
  })

  const hasContent = continueList.length > 0 || libraries.length > 0

  return (
    <div className="space-y-8">
      <PageLoader
        loading={loading}
        skeleton={<HomeSkeleton />}
        isEmpty={!loading && !hasContent}
      >
        {/* 我的媒体库 */}
        {libraries.length > 0 && <LibraryGrid libraries={libraries} />}

        {/* 继续观看 */}
        {continueList.length > 0 && (
          <MediaRow
            title={t('home.continueWatching')}
            items={continueList}
            cardType="continue"
            watchedLabel={(p) => t('home.watched', { percent: String(p) })}
            isAdmin={isAdmin}
            {...mediaActions}
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
              isAdmin={isAdmin}
              {...mediaActions}
            />
          )
        ))}
      </PageLoader>

      {/* 使用统一的弹窗组件 */}
      <MediaModals
        {...modalProps}
        refreshModalOnScrape={(id, replaceImages) => {
          const { adminApi, mediaApi } = require('@/api')
          return modalProps.editModalType === 'series'
            ? adminApi.scrapeSeriesMetadata(id, replaceImages)
            : mediaApi.scrape(id, replaceImages)
        }}
      />
    </div>
  )
}