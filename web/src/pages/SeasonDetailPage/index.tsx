import { useEffect, useState } from 'react'
import { adminApi, streamApi } from '@/api'
import { motion } from 'framer-motion'
import { easeSmooth, durations } from '@/lib/motion'
import { HeroSection, CastGrid } from '@/components/media'
import { useSeasonDetail } from './hooks/useSeasonDetail'
import { useSeasonUserActions } from './hooks/useSeasonUserActions'
import { useSegmentAndMode } from './hooks/useSegmentAndMode'
import SeasonHeader from './components/SeasonHeader'
import EpisodeList from './components/EpisodeList'
import { useEntityAdmin } from '@/hooks/useEntityAdmin'
import { useDetailPageLoader } from '@/hooks/useDetailPageLoader'
import { useDetailHeroProps } from '@/hooks/useDetailHeroProps'
import { useDetailPageContext } from '@/hooks/useDetailPageContext'
import { createSeriesRefresh } from '@/utils/api'
import { DetailPageLayout } from '@/components/common/layout/DetailPageLayout'
import { DetailPageModals } from '@/components/common/DetailPageModals'
import EditMetadataModal from '@/components/EditMetadataModal'
import RefreshSingleModal from '@/components/RefreshSingleModal'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import { MatchModal } from '@/components/common/modals/MatchModal'
import { UnmatchConfirmModal } from '@/components/common/modals/UnmatchConfirmModal'
import type { Series } from '@/types'

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
    isFavorited,
    isWatched,
    posterVersion,
    setPosterVersion,
    setSeries,
    setSeasons,
    refreshSeriesDetail,
    currentSeasonNum,
    handleSeasonChange,
  } = useSeasonDetail()

  const [setIsFavorited] = useState(false)
  const [setIsWatched] = useState(false)

  // 单集管理操作状态
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null)
  const [showEpisodeEditModal, setShowEpisodeEditModal] = useState(false)
  const [showEpisodeDeleteConfirm, setShowEpisodeDeleteConfirm] = useState(false)
  const [showEpisodeUnmatchConfirm, setShowEpisodeUnmatchConfirm] = useState(false)
  const [showEpisodeRefreshModal, setShowEpisodeRefreshModal] = useState(false)
  const [showEpisodeMatchModal, setShowEpisodeMatchModal] = useState(false)

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
    handleRefreshSuccess,
    handleMatchSuccess,
  } = useEntityAdmin<Series>({
    entityId: seriesId,
    entity: series,
    type: 'series',
    deleteTarget: 'season',
    seasonNum: currentSeasonNum,
    onUpdate: setSeries,
    onRefresh: handleRefresh,
    setPosterVersion,
    onMatchSuccess: () => setShowMoreMenu(false),
  })

  const handleManualMatch = () => {
    setShowMatchModal(true)
  }

  // 单集管理操作函数
  const handleEpisodeManualMatch = (episodeId: string) => {
    setSelectedEpisodeId(episodeId)
    setShowEpisodeMatchModal(true)
  }

  const handleEpisodeUnmatch = (episodeId: string) => {
    setSelectedEpisodeId(episodeId)
    setShowEpisodeUnmatchConfirm(true)
  }

  const handleEpisodeRefreshMetadata = (episodeId: string) => {
    setSelectedEpisodeId(episodeId)
    setShowEpisodeRefreshModal(true)
  }

  const handleEpisodeEditMetadata = (episodeId: string) => {
    setSelectedEpisodeId(episodeId)
    setShowEpisodeEditModal(true)
  }

  const handleEpisodeDelete = (episodeId: string) => {
    setSelectedEpisodeId(episodeId)
    setShowEpisodeDeleteConfirm(true)
  }

  const handlePlayEpisode = (id: string) => {
    addClickedEpisodeId(id)
    setTimeout(() => {
      navigate(`/play/${id}`)
    }, 0)
  }

  // 骨架屏
  const { shouldRender, element } = useDetailPageLoader({
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

  if (!shouldRender) {
    return element
  }

  const firstEpisodeId = episodes.length > 0 ? episodes[0].id : undefined

  // ==================== HeroSection Props ====================
  const heroProps = useDetailHeroProps({
    variant: 'season',
    series,
    seasonNum: currentSeasonNum,
    episodeCount: episodes.length,
    firstEpisodeId,
    overview: series.overview,
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
    onEditMetadata: handleEditMetadata,
    onDelete: () => setShowDeleteConfirm(true),
    isFavorited,
    isWatched,
    onFavorite: handleFavorite,
    onMarkWatched: handleMarkWatched,
    onAddToPlaylist: handleAddToPlaylist,
  })

  return (
    <>
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

      <DetailPageModals
        showEditModal={showEditModal}
        showDeleteConfirm={showDeleteConfirm}
        showUnmatchConfirm={showUnmatchConfirm}
        showRefreshModal={showRefreshModal}
        showMatchModal={showMatchModal}
        
        editModalType="series"
        editModalId={seriesId!}
        editModalTmdbId={series.tmdb_id}
        editModalMediaType="tv"
        editModalEntity={series}
        editModalCurrentPoster={streamApi.getSeriesPosterUrl(series.id)}
        editModalCurrentBackdrop={streamApi.getSeriesBackdropUrl(series.id)}
        editModalHasPoster={!!series.poster_path}
        editModalHasBackdrop={!!series.backdrop_path}
        editModalOnSave={handleEditSave}
        editModalOnClose={() => setShowEditModal(false)}
        
        deleteModalTitle="删除本季"
        deleteModalDescription="从媒体库移除后，所选视频文件将不再被扫描添加到当前媒体库中。请确认是否同时删除关联的视频文件。"
        deleteModalHint="删除本季将移除当前季的记录及缓存文件。"
        deleteModalOnClose={() => setShowDeleteConfirm(false)}
        deleteModalOnDelete={handleDelete}
        
        unmatchModalOnClose={() => setShowUnmatchConfirm(false)}
        unmatchModalOnConfirm={handleUnmatch}
        unmatchModalTitle="解除匹配剧集"
        unmatchModalDescription="确定要解除此剧集的元数据匹配吗？这将清除所有从 TMDb/豆瓣获取的信息（简介、海报、评分等），但保留原始的剧集名称。"
        
        refreshModalMediaId={seriesId!}
        refreshModalMediaTitle={series?.title || ''}
        refreshModalOnClose={() => setShowRefreshModal(false)}
        refreshModalOnSuccess={handleRefreshSuccess}
        refreshModalOnScrape={(id, replaceImages) => adminApi.scrapeSeriesMetadata(id, replaceImages)}
        
        matchModalMediaId={seriesId!}
        matchModalStrategyType={{ type: 'tv', source: 'tmdb' }}
        matchModalDefaultTitle={series?.title || ''}
        matchModalOnClose={() => setShowMatchModal(false)}
        matchModalOnMatchSuccess={handleMatchSuccess}
      />

      {/* 单集管理弹窗 */}
      {selectedEpisodeId && (
        <>
          {/* 单集编辑元数据弹窗 */}
          {showEpisodeEditModal && (
            <EditMetadataModal
              type="media"
              id={selectedEpisodeId}
              mediaType="episode"
              entity={episodes.find(e => e.id === selectedEpisodeId) || null}
              currentPoster={streamApi.getPosterUrl(selectedEpisodeId)}
              hasPoster={true}
              onSave={async (form) => {
                try {
                  await adminApi.update(selectedEpisodeId, 'episode', form)
                  toast.success('保存成功')
                  await refreshSeriesDetail()
                  setShowEpisodeEditModal(false)
                } catch {
                  toast.error('保存失败')
                }
              }}
              onClose={() => setShowEpisodeEditModal(false)}
            />
          )}

          {/* 单集删除确认弹窗 */}
          <DeleteConfirmModal
            open={showEpisodeDeleteConfirm}
            title="删除集"
            description="确定要删除这一集吗？此操作不可撤销。"
            hint="删除后，该集将从媒体库中移除。选择'移除并删除文件'将同时删除本地文件。"
            onClose={() => setShowEpisodeDeleteConfirm(false)}
            onDelete={async (deleteFiles) => {
              try {
                await adminApi.delete(selectedEpisodeId, 'episode', deleteFiles)
                toast.success('删除成功')
                await refreshSeriesDetail()
                setShowEpisodeDeleteConfirm(false)
              } catch {
                toast.error('删除失败')
              }
            }}
          />

          {/* 单集解除匹配确认弹窗 */}
          <UnmatchConfirmModal
            open={showEpisodeUnmatchConfirm}
            title="解除匹配集"
            description="确定要解除此集的元数据匹配吗？这将清除所有从 TMDb/豆瓣获取的信息。"
            onClose={() => setShowEpisodeUnmatchConfirm(false)}
            onConfirm={async () => {
              try {
                await adminApi.unmatch(selectedEpisodeId, 'episode')
                toast.success('解除匹配成功')
                await refreshSeriesDetail()
                setShowEpisodeUnmatchConfirm(false)
              } catch {
                toast.error('解除匹配失败')
              }
            }}
          />

          {/* 单集刷新元数据弹窗 */}
          <RefreshSingleModal
            open={showEpisodeRefreshModal}
            mediaId={selectedEpisodeId}
            mediaTitle={episodes.find(e => e.id === selectedEpisodeId)?.title || ''}
            onClose={() => setShowEpisodeRefreshModal(false)}
            onSuccess={async () => {
              toast.success('刷新成功')
              await refreshSeriesDetail()
            }}
            onScrape={(id, replaceImages) => adminApi.scrapeEpisodeMetadata(id, replaceImages)}
          />

          {/* 单集手动匹配弹窗 */}
          <MatchModal
            open={showEpisodeMatchModal}
            onClose={() => setShowEpisodeMatchModal(false)}
            mediaId={selectedEpisodeId}
            strategyType={{ type: 'episode', source: 'tmdb' }}
            defaultTitle={episodes.find(e => e.id === selectedEpisodeId)?.title || ''}
            onMatchSuccess={async () => {
              toast.success('匹配成功')
              await refreshSeriesDetail()
            }}
          />
        </>
      )}
    </>
  )
}
