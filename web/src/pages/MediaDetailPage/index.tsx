import { motion, AnimatePresence } from 'framer-motion'
import { streamApi } from '@/api'
import { HeroSection, MediaInfoSection, CastGrid } from '@/components/media'
import { useMediaDetail } from './hooks/useMediaDetail'
import { useMediaUserActions } from '@/hooks/useMedia'
import { useDetailPageLoader, useDetailHeroProps, useDetailPageContext } from '@/hooks/useDetailPage'
import { useMediaModalConfig } from '@/hooks/useMediaModalConfig'
import { DetailPageLayout } from '@/components/common/layout/DetailPageLayout'
import { MediaModals } from '@/components/common/MediaModals'
import { MediaDetailSections } from '@/components/common/layout/MediaDetailSections'
import { useMediaStreams } from '@/hooks/useMedia'

export default function MediaDetailPage() {
  const { navigate, isAdmin, toast, t } = useDetailPageContext()

  const {
    id,
    media,
    playInfo,
    loading,
    isFavorited,
    isWatched,
    playlists,
    watchProgress,
    persons,
    techSpecs,
    fileInfo,
    subtitleTracks,
    posterVersion,
    setPosterVersion,
    setIsFavorited,
    setIsWatched,
    setMedia,
    refreshMediaDetail,
  } = useMediaDetail()

  const {
    scraping,
    handleFavorite,
    handleMarkWatched,
    handleScrape,
    handleAddToPlaylist,
  } = useMediaUserActions({
    id,
    media,
    isFavorited,
    isWatched,
    setIsFavorited,
    setIsWatched,
    setMedia,
    setPosterVersion,
    refreshMediaDetail,
  })

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
    handleRefreshMetadata,
    modalProps,
  } = useMediaModalConfig({
    entity: media,
    type: 'movie',
    onRefresh: () => refreshMediaDetail(id!),
    setPosterVersion,
    onDeleteNavigate: () => navigate('/'),
  })

  // ==================== 视频流/音频流提取 ====================
  const { videoStreams, audioStreams } = useMediaStreams(techSpecs?.streams)

  // ==================== 骨架屏 / 内容 — AnimatePresence 平滑过渡 ====================
  const { showSkeleton, skeletonElement } = useDetailPageLoader({
    loading,
    data: media,
    variant: 'movie',
  })

  // ==================== HeroSection Props ====================
  const heroProps = useDetailHeroProps({
    variant: 'media',
    media,
    playInfo,
    watchProgress,
    subtitleTracks,
    audioStreams,
    isFavorited,
    isWatched,
    scraping,
    isAdmin,
    posterVersion,
    playlists,
    onFavorite: handleFavorite,
    onMarkWatched: handleMarkWatched,
    onAddToPlaylist: handleAddToPlaylist,
    onManualMatch: () => setShowMatchModal(true),
    onUnmatch: () => setShowUnmatchConfirm(true),
    onRefreshMetadata: handleRefreshMetadata,
    onEditMetadata: handleEditMetadata,
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
                <MediaDetailSections
                  media={media}
                  playInfo={playInfo}
                  persons={persons}
                  fileInfo={fileInfo}
                  videoStreams={videoStreams}
                />
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      <MediaModals
        {...modalProps}
        unmatchModalTitle={t('mediaDetail.unmatchTitle')}
        unmatchModalDescription={t('mediaDetail.unmatchDesc')}
      />
    </>
  )
}
