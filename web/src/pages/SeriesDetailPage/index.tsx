import { motion } from 'framer-motion'
import { easeSmooth, durations } from '@/lib/motion'
import { CastGrid, HeroSection, SeasonGrid } from '@/components/media'
import { useSeriesDetail } from './hooks/useSeriesDetail'
import { useSeriesActions } from './hooks/useSeriesActions'
import { useEntityAdmin } from '@/hooks/useEntityAdmin'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useDetailPageLoader } from '@/hooks/useDetailPageLoader'
import { useDetailHeroProps } from '@/hooks/useDetailHeroProps'
import { createSeriesRefresh } from '@/utils/api'
import { DetailPageLayout } from '@/components/common/layout/DetailPageLayout'
import { DetailPageModals } from '@/components/common/DetailPageModals'
import { adminApi, streamApi } from '@/api'
import type { Series } from '@/types'

export default function SeriesDetailPage() {
  const isAdmin = useIsAdmin()

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
    handleEditSave,
    handleDelete,
    handleUnmatch,
    handleRefreshMetadata,
    handleRefreshSuccess,
    handleMatchSuccess,
  } = useEntityAdmin<Series>({
    entityId: id,
    entity: series,
    type: 'series',
    onUpdate: setSeries,
    onRefresh: handleRefresh,
    setPosterVersion,
  })

  const handleManualMatch = () => {
    if (!series) return
    setShowMatchModal(true)
  }

  // 骨架屏
  const { shouldRender, element } = useDetailPageLoader({
    loading,
    data: series,
    variant: 'series',
  })

  if (!shouldRender) {
    return element
  }

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
    onRefreshMetadata: handleRefreshMetadata,
    onManualMatch: handleManualMatch,
    onUnmatch: () => setShowUnmatchConfirm(true),
    onEditMetadata: handleEditMetadata,
    onDelete: () => setShowDeleteConfirm(true),
  })

  return (
    <>
      <DetailPageLayout
        hero={
          <HeroSection {...heroProps} />
        }
        children={
          <>
            {/* 剧情简介 */}
            {series.overview && (
              <section>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {series.overview}
                </p>
              </section>
            )}

            {/* 季列表 */}
            <SeasonGrid
              seriesId={series.id}
              seasons={seasons}
              isFavorited={isFavorited}
              watchedSeasonNums={watchedSeasonNums}
              onFavorite={handleFavorite}
              onMarkSeasonWatched={handleMarkSeasonWatched}
              onManualMatch={handleManualMatch}
              onUnmatch={() => setShowUnmatchConfirm(true)}
              onRefreshMetadata={() => setShowRefreshModal(true)}
              onEditMetadata={handleEditMetadata}
              onDelete={() => setShowDeleteConfirm(true)}
            />

            {/* 演职人员 */}
            <CastGrid persons={persons} />
          </>
        }
      />

      <DetailPageModals
        showEditModal={showEditModal}
        showDeleteConfirm={showDeleteConfirm}
        showUnmatchConfirm={showUnmatchConfirm}
        showRefreshModal={showRefreshModal}
        showMatchModal={showMatchModal}
        
        editModalType="series"
        editModalId={id!}
        editModalTmdbId={series.tmdb_id}
        editModalMediaType="tv"
        editModalEntity={series}
        editModalCurrentPoster={streamApi.getSeriesPosterUrl(series.id)}
        editModalCurrentBackdrop={streamApi.getSeriesBackdropUrl(series.id)}
        editModalHasPoster={!!series.poster_path}
        editModalHasBackdrop={!!series.backdrop_path}
        editModalOnSave={handleEditSave}
        editModalOnClose={() => setShowEditModal(false)}
        
        deleteModalTitle="删除剧集"
        deleteModalDescription="从媒体库移除后，所选视频文件将不再被扫描添加到当前媒体库中。请确认是否同时删除关联的视频文件。"
        deleteModalHint="删除剧集合集将同时移除该系列下所有季和集的记录及缓存文件。"
        deleteModalOnClose={() => setShowDeleteConfirm(false)}
        deleteModalOnDelete={handleDelete}
        
        unmatchModalOnClose={() => setShowUnmatchConfirm(false)}
        unmatchModalOnConfirm={handleUnmatch}
        unmatchModalTitle="解除匹配剧集"
        unmatchModalDescription="确定要解除此剧集的元数据匹配吗？这将清除所有从 TMDb/豆瓣获取的信息（简介、海报、评分等），但保留原始的剧集名称。"
        
        refreshModalMediaId={id!}
        refreshModalMediaTitle={series?.title || ''}
        refreshModalOnClose={() => setShowRefreshModal(false)}
        refreshModalOnSuccess={handleRefreshSuccess}
        refreshModalOnScrape={adminApi.scrapeSeriesMetadata}
        
        matchModalMediaId={id!}
        matchModalStrategyType={{ type: 'tv', source: 'tmdb' }}
        matchModalDefaultTitle={series?.title || ''}
        matchModalOnClose={() => setShowMatchModal(false)}
        matchModalOnMatchSuccess={handleMatchSuccess}
      />
    </>
  )
}
