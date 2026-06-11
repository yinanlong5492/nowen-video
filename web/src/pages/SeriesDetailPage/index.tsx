import { motion, AnimatePresence } from 'framer-motion'
import { CastGrid, HeroSection, SeasonGrid } from '@/components/media'
import { useSeriesDetail } from './hooks/useSeriesDetail'
import { useSeriesActions } from './hooks/useSeriesActions'
import { usePermissions } from '@/hooks/useAuth'
import { useDetailPageLoader, useDetailHeroProps } from '@/hooks/useDetailPage'
import { useMediaModalConfig } from '@/hooks/useMediaModalConfig'
import { createSeriesRefresh } from '@/utils/api'
import { DetailPageLayout } from '@/components/common/layout/DetailPageLayout'
import { MediaModals } from '@/components/common/MediaModals'
import { adminApi } from '@/api'

export default function SeriesDetailPage() {
  const { isAdmin } = usePermissions()

  const {
    id,
    series,
    seasons,
    loading,
    isFavorited,
    isWatched,
    watchedSeasonNums,
    persons,
    playlists,
    posterVersion,
    setPosterVersion,
    setSeries,
    setSeasons,
    setIsFavorited,
    setIsWatched,
    setWatchedSeasonNums,
    firstEpisode,
  } = useSeriesDetail()

  const {
    handleFavorite,
    handleAddToPlaylist,
    handleMarkWatched,
    handleMarkSeasonWatched,
  } = useSeriesActions({
    series,
    seasons,
    isFavorited,
    isWatched,
    watchedSeasonNums,
    setIsFavorited,
    setIsWatched,
    setWatchedSeasonNums,
  })

  // 创建剧集刷新函数
  const handleRefresh = createSeriesRefresh(id, setSeries, setSeasons)

  const {
    setShowDeleteConfirm,
    setShowUnmatchConfirm,
    setShowRefreshModal,
    setShowMatchModal,
    handleEditMetadata,
    handleRefreshMetadata,
    modalProps,
  } = useMediaModalConfig({
    entity: series,
    type: 'series',
    onRefresh: handleRefresh,
    setPosterVersion,
  })

  const handleManualMatch = () => {
    if (!series) return
    setShowMatchModal(true)
  }

  // 骨架屏
  const { showSkeleton, skeletonElement } = useDetailPageLoader({
    loading,
    data: series,
    variant: 'series',
  })

  // ==================== HeroSection Props ====================
  const heroProps = useDetailHeroProps({
    variant: 'series',
    series,
    firstEpisode,
    isFavorited,
    isWatched,
    scraping: false,
    isAdmin,
    posterVersion,
    playlists,
    onFavorite: handleFavorite,
    onMarkWatched: handleMarkWatched,
    onAddToPlaylist: handleAddToPlaylist,
    onRefreshMetadata: () => id && handleRefreshMetadata(id),
    onManualMatch: handleManualMatch,
    onUnmatch: () => setShowUnmatchConfirm(true),
    onEditMetadata: () => id && handleEditMetadata(id),
    onDelete: () => setShowDeleteConfirm(true),
  })

  return (
    <>
      <AnimatePresence mode="wait">
        {showSkeleton ? (
          <motion.div
            key="detail-skeleton"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            {skeletonElement}
          </motion.div>
        ) : (
          <motion.div
            key="detail-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          >
            <DetailPageLayout
              hero={
                <HeroSection {...heroProps} />
              }
              children={
                <>
                  {/* 剧情简介 */}
                  {series?.overview && (
                    <section>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {series.overview}
                      </p>
                    </section>
                  )}

                  {/* 季列表 */}
                  <SeasonGrid
                    seriesId={series!.id}
                    seasons={seasons}
                    isFavorited={isFavorited}
                    watchedSeasonNums={watchedSeasonNums}
                    onFavorite={handleFavorite}
                    onMarkSeasonWatched={handleMarkSeasonWatched}
                    onManualMatch={handleManualMatch}
                    onUnmatch={() => setShowUnmatchConfirm(true)}
                    onRefreshMetadata={() => setShowRefreshModal(true)}
                    onEditMetadata={() => id && handleEditMetadata(id)}
                    onDelete={() => setShowDeleteConfirm(true)}
                  />

                  {/* 演职人员 */}
                  <CastGrid persons={persons} />
                </>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      <MediaModals
        {...modalProps}
        refreshModalOnScrape={adminApi.scrapeSeriesMetadata}
      />
    </>
  )
}
