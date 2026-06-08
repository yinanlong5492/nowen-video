import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSeriesDetail } from './hooks/useSeriesDetail'
import { useSeriesActions } from './hooks/useSeriesActions'
import { useSeriesAdmin } from './hooks/useSeriesAdmin'
import { SeriesHeroSection, SeasonGrid, CastGrid } from '@/components/media'
import { DeleteModal, UnmatchModal, EditModal, RefreshModal, MatchModal } from '@/components/GlobalModals'
import { easeSmooth, durations } from '@/lib/motion'
import { useAuthStore } from '@/stores/auth'
import { streamApi } from '@/api'
import { useToast } from '@/components/Toast'

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const toast = useToast()

  // 数据获取 Hook
  const {
    series,
    seasons,
    persons,
    playlists,
    isFavorited,
    isWatched,
    watchedSeasonNums,
    loading,
    posterVersion,
    refreshPoster,
    refreshData,
  } = useSeriesDetail(id)

  // 本地状态同步
  const [localFavorited, setLocalFavorited] = useState(isFavorited)
  const [localWatched, setLocalWatched] = useState(isWatched)
  const [localWatchedSeasons, setLocalWatchedSeasons] = useState(watchedSeasonNums)

  // 业务操作 Hook
  const {
    handleFavorite,
    handleAddToPlaylist,
    handleMarkWatched,
    handleMarkSeasonWatched,
  } = useSeriesActions(
    id,
    seasons,
    localFavorited,
    localWatched,
    localWatchedSeasons,
    setLocalFavorited,
    setLocalWatched,
    setLocalWatchedSeasons,
  )

  // 管理员操作 Hook
  const {
    handleUnmatch,
    handleRefreshMetadata,
    handleEditMetadata,
    handleEditSave,
    handleDelete,
  } = useSeriesAdmin(
    id,
    series,
    () => { /* 更新 series 状态，由 useSeriesDetail 自动处理 */ },
    refreshPoster,
    refreshData,
  )

  // 弹窗状态
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [showUnmatchModal, setShowUnmatchModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRefreshModal, setShowRefreshModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, any>>({})

  // 打开编辑弹窗
  const handleOpenEditModal = () => {
    const form = handleEditMetadata()
    if (form) {
      setEditForm(form)
      setShowEditModal(true)
    }
  }

  // 获取第一集用于播放
  const firstEpisode = seasons.length > 0 && seasons[0].episodes?.length > 0
    ? seasons[0].episodes[0]
    : null

  // 加载状态
  if (loading || !series) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: durations.fast }}
          className="space-y-6"
        >
          <div className="skeleton h-[420px] rounded-2xl" />
          <div className="flex gap-6 pt-4">
            <div className="skeleton hidden h-72 w-48 rounded-xl sm:block" />
            <div className="flex-1 space-y-4">
              <div className="skeleton h-10 w-2/3 rounded-lg" />
              <div className="skeleton h-5 w-1/3 rounded-lg" />
              <div className="flex gap-3">
                <div className="skeleton h-12 w-28 rounded-xl" />
                <div className="skeleton h-12 w-24 rounded-xl" />
              </div>
              <div className="skeleton h-20 w-full rounded-xl" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: durations.page, ease: easeSmooth }}
      className="relative -mx-4 sm:-mx-6 lg:-mx-8"
      style={{ background: 'var(--bg-base)', marginTop: '-64px', paddingTop: '64px' }}
    >
      {/* 英雄区 */}
      <SeriesHeroSection
        key={series.id}
        series={series}
        isFavorited={localFavorited}
        isWatched={localWatched}
        scraping={false}
        isAdmin={isAdmin}
        firstEpisode={firstEpisode}
        posterVersion={posterVersion}
        playlists={playlists}
        onFavorite={handleFavorite}
        onMarkWatched={handleMarkWatched}
        onAddToPlaylist={handleAddToPlaylist}
        onRefreshMetadata={() => setShowRefreshModal(true)}
        onManualMatch={() => setShowMatchModal(true)}
        onUnmatch={() => setShowUnmatchModal(true)}
        onEditMetadata={handleOpenEditModal}
        onDelete={() => setShowDeleteModal(true)}
      />

      {/* 内容区 */}
      <div className="mx-auto space-y-8 px-4 pt-6 sm:px-6 lg:px-8">
        {/* 剧情简介 */}
        {series.overview && (
          <section>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {series.overview}
            </p>
          </section>
        )}

        {/* 季列表 - 使用 HorizontalScroll */}
        <SeasonGrid
          seriesId={series.id}
          seasons={seasons}
          isFavorited={localFavorited}
          watchedSeasonNums={localWatchedSeasons}
          onFavorite={handleFavorite}
          onMarkSeasonWatched={handleMarkSeasonWatched}
          onMatchSeason={(seasonNum) => {
            // 手动匹配指定季
            toast.info(`手动匹配第 ${seasonNum} 季`)
          }}
          onUnmatchSeason={(seasonNum) => {
            // 解除匹配指定季
            toast.info(`解除匹配第 ${seasonNum} 季`)
          }}
          onRefreshSeasonMetadata={(seasonNum) => {
            // 刷新指定季的元数据
            toast.info(`刷新第 ${seasonNum} 季元数据`)
          }}
          onEditSeasonMetadata={(seasonNum) => {
            // 编辑指定季的信息
            toast.info(`编辑第 ${seasonNum} 季信息`)
          }}
          onDeleteSeason={(seasonNum) => {
            // 删除指定季
            toast.info(`删除第 ${seasonNum} 季`)
          }}
        />

        {/* 演职人员 */}
        <CastGrid persons={persons} />
      </div>

      {/* ==================== GlobalModals ==================== */}

      {/* 手动匹配弹窗 */}
      <MatchModal
        open={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        onSuccess={() => {
          refreshData()
          refreshPoster()
        }}
        matchType="series"
        itemId={id!}
      />

      {/* 解除匹配确认弹窗 */}
      <UnmatchModal
        open={showUnmatchModal}
        onClose={() => setShowUnmatchModal(false)}
        onConfirm={handleUnmatch}
        type="series"
      />

      {/* 编辑元数据弹窗 */}
      {showEditModal && (
        <EditModal
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            handleEditSave(editForm)
            setShowEditModal(false)
          }}
          editForm={editForm}
          setEditForm={setEditForm}
          type="series"
          id={id!}
          tmdbId={series.tmdb_id}
          mediaType="tv"
          currentPoster={streamApi.getSeriesPosterUrl(series.id)}
          currentBackdrop={streamApi.getSeriesBackdropUrl(series.id)}
          hasPoster={!!series.poster_path}
          hasBackdrop={!!series.backdrop_path}
        />
      )}

      {/* 刷新元数据弹窗 */}
      <RefreshModal
        open={showRefreshModal}
        onClose={() => setShowRefreshModal(false)}
        onSuccess={handleRefreshMetadata}
        mediaId={id!}
        mediaTitle={series.title}
      />

      {/* 删除确认弹窗 */}
      <DeleteModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDelete={handleDelete}
        title="删除剧集"
        description="从媒体库移除后，所选视频文件将不再被扫描添加到当前媒体库中。请确认是否同时删除关联的视频文件。"
        hint="删除剧集合集将同时移除该系列下所有季和集的记录及缓存文件。"
      />
    </motion.div>
  )
}