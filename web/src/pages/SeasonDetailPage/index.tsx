import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { adminApi } from '@/api'
import { HeroSection, CastGrid } from '@/components/media'
import { useSeasonDetail } from './hooks/useSeasonDetail'
import { useSeasonUserActions } from './hooks/useSeasonUserActions'
import { useSegmentAndMode } from './hooks/useSegmentAndMode'
import SeasonHeader from './components/SeasonHeader'
import EpisodeList from './components/EpisodeList'
import { useDetailPageLoader, useDetailHeroProps, useDetailPageContext } from '@/hooks/useDetailPage'
import { useEpisodeAdmin } from '@/hooks/useAdmin'
import { useMediaModalConfig } from '@/hooks/useMediaModalConfig'
import { createSeriesRefresh } from '@/utils/api'
import { DetailPageLayout } from '@/components/common/layout/DetailPageLayout'
import { MediaModals } from '@/components/common/MediaModals'

export default function SeasonDetailPage() {
  const { navigate, isAdmin, toast } = useDetailPageContext()

  const {
    seriesId,
    seasonNum,
    series,
    seasons,
    episodes,
    loading,
    historyMap,
    persons,
    playlists,
    isFavorited: initialIsFavorited,
    isWatched: initialIsWatched,
    posterVersion,
    setPosterVersion,
    setSeries,
    setSeasons,
    refreshSeriesDetail,
    currentSeasonNum,
    handleSeasonChange,
  } = useSeasonDetail()

  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [isWatched, setIsWatched] = useState(initialIsWatched)

  useEffect(() => {
    setIsFavorited(initialIsFavorited)
    setIsWatched(initialIsWatched)
  }, [initialIsFavorited, initialIsWatched])

  const {
    showMoreMenu,
    showPlaylistMenu,
    setShowMoreMenu,
    setShowPlaylistMenu,
    handleFavorite,
    handleAddToPlaylist,
    handleMarkWatched,
  } = useSeasonUserActions({
    seriesId,
    seasonNum,
    series,
    episodes,
    isFavorited,
    isWatched,
    setIsFavorited,
    setIsWatched,
  })

  const {
    displayMode,
    currentSegmentIndex,
    segments,
    displayedEpisodes,
    clickedEpisodeIds,
    setDisplayMode,
    setCurrentSegmentIndex,
    addClickedEpisodeId,
  } = useSegmentAndMode(episodes, seasonNum)

  // 创建剧集刷新函数
  const handleRefresh = createSeriesRefresh(seriesId, setSeries, setSeasons)

  const {
    setShowDeleteConfirm,
    setShowUnmatchConfirm,
    setShowRefreshModal,
    setShowMatchModal,
    handleEditMetadata,
    modalProps,
  } = useMediaModalConfig({
    entity: series,
    type: 'series',
    onRefresh: handleRefresh,
    setPosterVersion,
  })

  // 使用单集管理 Hook
  const {
    selectedEpisodeId,
    selectedEpisode,
    showEditModal: episodeShowEditModal,
    showDeleteConfirm: episodeShowDeleteConfirm,
    showUnmatchConfirm: episodeShowUnmatchConfirm,
    showRefreshModal: episodeShowRefreshModal,
    showMatchModal: episodeShowMatchModal,
    handleEditMetadata: handleEpisodeEditMetadata,
    handleEditSave: handleEpisodeEditSave,
    handleDelete: handleEpisodeDelete,
    confirmDelete: confirmEpisodeDelete,
    handleUnmatch: handleEpisodeUnmatch,
    confirmUnmatch: confirmEpisodeUnmatch,
    handleRefreshMetadata: handleEpisodeRefreshMetadata,
    handleRefreshSuccess: handleEpisodeRefreshSuccess,
    handleManualMatch: handleEpisodeManualMatch,
    handleMatchSuccess: handleEpisodeMatchSuccess,
    setShowEditModal: setEpisodeShowEditModal,
    setShowDeleteConfirm: setEpisodeShowDeleteConfirm,
    setShowUnmatchConfirm: setEpisodeShowUnmatchConfirm,
    setShowRefreshModal: setEpisodeShowRefreshModal,
    setShowMatchModal: setEpisodeShowMatchModal,
  } = useEpisodeAdmin({
    episodes,
    onRefresh: refreshSeriesDetail,
    toast,
  })

  const handleManualMatch = () => {
    setShowMatchModal(true)
  }

  const handlePlayEpisode = (id: string) => {
    addClickedEpisodeId(id)
    setTimeout(() => {
      navigate(`/play/${id}`)
    }, 0)
  }

  // 骨架屏
  const { showSkeleton, skeletonElement } = useDetailPageLoader({
    loading,
    data: series,
    variant: 'season',
    fallback: (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
          无法加载剧集数据
        </div>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-6 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--accent-color)',
            color: 'var(--text-primary)',
          }}
        >
          返回首页
        </button>
      </div>
    ),
  })

  const firstEpisodeId = episodes.length > 0 ? episodes[0].id : undefined

  // ==================== HeroSection Props ====================
  const heroProps = useDetailHeroProps({
    variant: 'season',
    series,
    seasonNum: currentSeasonNum,
    episodeCount: episodes.length,
    firstEpisodeId,
    overview: series?.overview,
    isAdmin,
    showMoreMenu,
    showPlaylistMenu,
    playlists,
    posterVersion,
    onToggleMoreMenu: () => { setShowMoreMenu(!showMoreMenu); setShowPlaylistMenu(false) },
    onTogglePlaylistMenu: () => { setShowPlaylistMenu(!showPlaylistMenu); setShowMoreMenu(false) },
    onRefreshMetadata: () => setShowRefreshModal(true),
    onManualMatch: handleManualMatch,
    onUnmatch: () => setShowUnmatchConfirm(true),
    onEditMetadata: () => seriesId && handleEditMetadata(seriesId),
    onDelete: () => setShowDeleteConfirm(true),
    isFavorited,
    isWatched,
    onFavorite: handleFavorite,
    onMarkWatched: handleMarkWatched,
    onAddToPlaylist: handleAddToPlaylist,
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
                  {/* 集列表 */}
                  <section>
                    <SeasonHeader
                      seasons={seasons}
                      currentSeasonNum={currentSeasonNum}
                      segments={segments}
                      currentSegmentIndex={currentSegmentIndex}
                      displayMode={displayMode}
                      onSeasonChange={handleSeasonChange}
                      onSegmentChange={setCurrentSegmentIndex}
                      onDisplayModeChange={setDisplayMode}
                    />

                    <EpisodeList
                      displayMode={displayMode}
                      displayedEpisodes={displayedEpisodes}
                      historyMap={historyMap}
                      clickedEpisodeIds={clickedEpisodeIds}
                      seriesId={seriesId}
                      seasonNum={currentSeasonNum}
                      onPlay={handlePlayEpisode}
                      onManualMatch={handleEpisodeManualMatch}
                      onUnmatch={handleEpisodeUnmatch}
                      onRefreshMetadata={handleEpisodeRefreshMetadata}
                      onEditMetadata={handleEpisodeEditMetadata}
                      onDelete={handleEpisodeDelete}
                    />
                  </section>

                  {/* 演职人员 */}
                  <CastGrid persons={persons} />
                </>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 使用统一的详情页弹窗组件 */}
      <MediaModals
        {...modalProps}
        refreshModalOnScrape={(id, replaceImages) => adminApi.scrapeSeriesMetadata(id, replaceImages)}
        
        // 单集弹窗支持
        episodeMode={true}
        episodeId={selectedEpisodeId}
        episodeEntity={selectedEpisode}
        episodeShowEditModal={episodeShowEditModal}
        episodeShowDeleteConfirm={episodeShowDeleteConfirm}
        episodeShowUnmatchConfirm={episodeShowUnmatchConfirm}
        episodeShowRefreshModal={episodeShowRefreshModal}
        episodeShowMatchModal={episodeShowMatchModal}
        episodeOnEditSave={handleEpisodeEditSave}
        episodeOnEditClose={() => setEpisodeShowEditModal(false)}
        episodeOnDelete={confirmEpisodeDelete}
        episodeOnDeleteClose={() => setEpisodeShowDeleteConfirm(false)}
        episodeOnUnmatch={confirmEpisodeUnmatch}
        episodeOnUnmatchClose={() => setEpisodeShowUnmatchConfirm(false)}
        episodeOnRefreshClose={() => setEpisodeShowRefreshModal(false)}
        episodeOnRefreshSuccess={handleEpisodeRefreshSuccess}
        episodeOnMatchClose={() => setEpisodeShowMatchModal(false)}
        episodeOnMatchSuccess={handleEpisodeMatchSuccess}
      />
    </>
  )
}
