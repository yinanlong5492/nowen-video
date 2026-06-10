import { useState } from 'react'
import { streamApi } from '@/api'
import { motion } from 'framer-motion'
import { easeSmooth, durations } from '@/lib/motion'
import { HeroSection, MediaInfoSection, TrailerModal, CastGrid, CollectionCarousel } from '@/components/media'
import { useMediaDetail } from './hooks/useMediaDetail'
import { useMediaUserActions } from '@/hooks/useMediaUserActions'
import { useEntityAdmin } from '@/hooks/useEntityAdmin'
import { useDetailPageLoader } from '@/hooks/useDetailPageLoader'
import { useDetailHeroProps } from '@/hooks/useDetailHeroProps'
import { useDetailPageContext } from '@/hooks/useDetailPageContext'
import { createDeleteWithNavigate } from '@/utils/navigation'
import { DetailPageLayout } from '@/components/common/layout/DetailPageLayout'
import { DetailPageModals } from '@/components/common/DetailPageModals'
import { MediaDetailSections } from '@/components/common/layout/MediaDetailSections'
import { useMediaStreams } from '@/hooks/useMediaStreams'

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

  const [showTrailer, setShowTrailer] = useState(false)

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
    editForm,
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
  } = useEntityAdmin({
    entityId: id,
    entity: media,
    type: 'movie',
    onUpdate: setMedia,
    onRefresh: () => refreshMediaDetail(id!),
    setPosterVersion,
  })

  // ==================== 视频流/音频流提取 ====================
  const { videoStreams, audioStreams } = useMediaStreams(techSpecs?.streams)

  // ==================== 骨架屏 ====================
  const { shouldRender, element } = useDetailPageLoader({
    loading,
    data: media,
    variant: 'movie',
  })

  if (!shouldRender) {
    return element
  }

  // ==================== 删除导航处理 ====================
  const handleDeleteAndNavigate = createDeleteWithNavigate(
    handleDelete,
    navigate,
    () => setShowDeleteConfirm(false)
  )

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
    onShowTrailer: media.trailer_url ? () => setShowTrailer(true) : undefined,
    onManualMatch: () => setShowMatchModal(true),
    onUnmatch: () => setShowUnmatchConfirm(true),
    onRefreshMetadata: handleRefreshMetadata,
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
          <MediaDetailSections
            media={media}
            playInfo={playInfo}
            persons={persons}
            fileInfo={fileInfo}
            videoStreams={videoStreams}
            mediaId={id}
            showCollection
          />
        }
      />

      {showTrailer && media.trailer_url && (
        <TrailerModal
          trailerUrl={media.trailer_url}
          onClose={() => setShowTrailer(false)}
        />
      )}

      <DetailPageModals
        showEditModal={showEditModal}
        showDeleteConfirm={showDeleteConfirm}
        showUnmatchConfirm={showUnmatchConfirm}
        showRefreshModal={showRefreshModal}
        showMatchModal={showMatchModal}
        
        editModalType="media"
        editModalId={id!}
        editModalTmdbId={media.tmdb_id}
        editModalMediaType={'movie'}
        editModalEntity={media}
        editModalCurrentPoster={streamApi.getPosterUrl(media.id, posterVersion)}
        editModalCurrentBackdrop={streamApi.getBackdropUrl(media.id, posterVersion)}
        editModalHasPoster={!!media.poster_path}
        editModalHasBackdrop={!!media.backdrop_path}
        editModalOnSave={handleEditSave}
        editModalOnClose={() => setShowEditModal(false)}
        editModalHasTagline
        
        deleteModalTitle="删除影片"
        deleteModalDescription="从媒体库移除后，所选视频文件将不再被扫描添加到当前媒体库中。请确认是否同时删除关联的视频文件。"
        deleteModalHint="删除影片将移除当前影片的记录及缓存文件。"
        deleteModalOnClose={() => setShowDeleteConfirm(false)}
        deleteModalOnDelete={handleDeleteAndNavigate}
        
        unmatchModalOnClose={() => setShowUnmatchConfirm(false)}
        unmatchModalOnConfirm={handleUnmatch}
        unmatchModalTitle={t('mediaDetail.unmatchTitle')}
        unmatchModalDescription={t('mediaDetail.unmatchDesc')}
        
        refreshModalMediaId={id!}
        refreshModalMediaTitle={media?.title || ''}
        refreshModalOnClose={() => setShowRefreshModal(false)}
        refreshModalOnSuccess={handleRefreshSuccess}
        
        matchModalMediaId={id!}
        matchModalStrategyType={{ type: 'movie', source: 'tmdb' }}
        matchModalDefaultTitle={media?.title || ''}
        matchModalOnClose={() => setShowMatchModal(false)}
        matchModalOnMatchSuccess={handleMatchSuccess}
      />
    </>
  )
}
