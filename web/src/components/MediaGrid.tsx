import { useState } from 'react'
import type { Media, MixedItem } from '@/types'
import { adminApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/components/Toast'
import MediaCard from '@/components/media/MediaCard'
import { motion } from 'framer-motion'
import { useStaggerVariants } from '@/hooks/useMotion'
import { DeleteModal, MatchModal, UnmatchModal, EditModal, RefreshModal } from '@/components/GlobalModals'

interface MediaGridProps {
  items?: Media[]
  mixedItems?: MixedItem[]
  title?: string
  loading?: boolean
  columns?: number
}

const COLUMN_CLASSES: Record<number, string> = {
  6: 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  7: 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7',
  8: 'grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8',
  9: 'grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9',
  10: 'grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10',
  12: 'grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 xl:grid-cols-12',
}

export default function MediaGrid({ items, mixedItems, title, loading, columns }: MediaGridProps) {
  const { container, item: itemVariant } = useStaggerVariants()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'
  const toast = useToast()

  const [showRefreshModal, setShowRefreshModal] = useState(false)
  const [refreshId, setRefreshId] = useState<string | null>(null)
  const [refreshTitle, setRefreshTitle] = useState('')
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showUnmatchModal, setShowUnmatchModal] = useState(false)
  const [unmatchId, setUnmatchId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    title: string; orig_title: string; year: number | undefined; overview: string;
    rating: number | undefined; genres: string; country: string; language: string; studio: string
  }>({ title: '', orig_title: '', year: undefined, overview: '', rating: undefined, genres: '', country: '', language: '', studio: '' })

  const gridClass = columns ? (COLUMN_CLASSES[columns] || COLUMN_CLASSES[6]) : COLUMN_CLASSES[6]

  const handleRefreshMetadata = (id: string) => {
    setRefreshId(id)
    setRefreshTitle('')
    setShowRefreshModal(true)
  }

  const handleManualMatch = (id: string) => {
    setMatchId(id)
    setShowMatchModal(true)
  }

  const handleUnmatchClick = (id: string) => {
    setUnmatchId(id)
    setShowUnmatchModal(true)
  }

  const handleUnmatch = async () => {
    if (!unmatchId) return
    try {
      await adminApi.unmatchSeriesMetadata(unmatchId)
      setShowUnmatchModal(false)
      toast.success('已解除匹配')
    } catch {
      toast.error('解除匹配失败')
    }
  }

  const handleEditMetadata = (id: string) => {
    setEditId(id)
    setEditForm({ title: '', orig_title: '', year: undefined, overview: '', rating: undefined, genres: '', country: '', language: '', studio: '' })
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    if (!editId) return
    try {
      await adminApi.updateSeriesMetadata(editId, editForm)
      setShowEditModal(false)
      toast.success('元数据已更新')
    } catch {
      toast.error('更新失败')
    }
  }

  const handleDeleteClick = (id: string) => {
    setDeleteId(id)
    setShowDeleteModal(true)
  }

  const handleDelete = async (_deleteFiles: boolean) => {
    if (!deleteId) return
    try {
      await adminApi.deleteSeries(deleteId)
      setShowDeleteModal(false)
      toast.success('剧集已删除')
    } catch {
      toast.error('删除失败')
    }
  }

  const handleMatchSuccess = () => {
    toast.success('剧集匹配成功')
  }

  const handleRefreshSuccess = () => {
    toast.success('元数据刷新成功')
  }

  const renderModals = () => {
    return (
      <>
        {showRefreshModal && refreshId && (
          <RefreshModal
            open={showRefreshModal}
            mediaId={refreshId}
            mediaTitle={refreshTitle}
            onClose={() => setShowRefreshModal(false)}
            onSuccess={handleRefreshSuccess}
            onScrape={(id, replaceImages, _mode) => adminApi.scrapeSeriesMetadata(id, replaceImages)}
          />
        )}

        {/* 使用 GlobalModals/MatchModal */}
        {showMatchModal && matchId && (
          <MatchModal
            open={showMatchModal}
            onClose={() => setShowMatchModal(false)}
            onSuccess={handleMatchSuccess}
            matchType="series"
            itemId={matchId}
          />
        )}

        {/* 使用 GlobalModals/EditModal */}
        {showEditModal && (
          <EditModal
            type="series"
            id={editId!}
            mediaType="tv"
            editForm={editForm}
            setEditForm={setEditForm}
            currentPoster={''}
            currentBackdrop={''}
            hasPoster={false}
            hasBackdrop={false}
            onSave={handleEditSave}
            onClose={() => setShowEditModal(false)}
          />
        )}

        {/* 使用 GlobalModals/UnmatchModal */}
        <UnmatchModal
          open={showUnmatchModal}
          onClose={() => setShowUnmatchModal(false)}
          onConfirm={handleUnmatch}
          type="series"
        />

        {/* 使用 GlobalModals/DeleteModal */}
        <DeleteModal
          open={showDeleteModal}
          title="删除剧集"
          description="确定要删除此剧集合集及其所有剧集记录吗？"
          hint="此操作仅从数据库中移除记录，不会删除磁盘上的视频文件。重新扫描媒体库后可恢复。"
          onClose={() => setShowDeleteModal(false)}
          onDelete={handleDelete}
        />
      </>
    )
  }

  return (
    <>
      {loading ? (
        <motion.div variants={container} initial="hidden" animate="visible">
          {title && (
            <motion.h2 variants={itemVariant} className="mb-4 font-display text-xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
              {title}
            </motion.h2>
          )}
          <div className={gridClass}>
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div key={i} variants={itemVariant}>
                <div className="skeleton aspect-[2/3] rounded-xl" />
                <div className="skeleton mt-2 h-4 w-3/4 rounded" />
                <div className="skeleton mt-1 h-3 w-1/2 rounded" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : mixedItems ? (
        mixedItems.length === 0 ? null : (
          <motion.div variants={container} initial="hidden" animate="visible">
            {title && (
              <motion.h2 variants={itemVariant} className="mb-4 font-display text-xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
                {title}
              </motion.h2>
            )}
            <div className={gridClass}>
              {mixedItems.map((item) => {
                if (item.type === 'series' && item.series) {
                  return (
                    <motion.div key={`s-${item.series.id}`} variants={itemVariant}>
                      <MediaCard
                        series={item.series}
                        onManualMatch={isAdmin ? handleManualMatch : undefined}
                        onUnmatch={isAdmin ? handleUnmatchClick : undefined}
                        onRefreshMetadata={isAdmin ? handleRefreshMetadata : undefined}
                        onEditMetadata={isAdmin ? handleEditMetadata : undefined}
                        onDelete={isAdmin ? handleDeleteClick : undefined}
                      />
                    </motion.div>
                  )
                }
                if (item.type === 'music' && item.music) {
                  return (
                    <motion.div key={`mu-${item.music.id}`} variants={itemVariant}>
                      <MediaCard music={item.music} />
                    </motion.div>
                  )
                }
                if (item.media) {
                  return (
                    <motion.div key={`m-${item.media.id}`} variants={itemVariant}>
                      <MediaCard
                        media={item.media}
                        onManualMatch={isAdmin ? handleManualMatch : undefined}
                        onUnmatch={isAdmin ? handleUnmatchClick : undefined}
                        onRefreshMetadata={isAdmin ? handleRefreshMetadata : undefined}
                        onEditMetadata={isAdmin ? handleEditMetadata : undefined}
                        onDelete={isAdmin ? handleDeleteClick : undefined}
                      />
                    </motion.div>
                  )
                }
                return null
              })}
            </div>
          </motion.div>
        )
      ) : (!items || items.length === 0) ? null : (
        <motion.div variants={container} initial="hidden" animate="visible">
          {title && (
            <motion.h2 variants={itemVariant} className="mb-4 font-display text-xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
              {title}
            </motion.h2>
          )}
          <div className={gridClass}>
            {items.map((media) => (
              <motion.div key={media.id} variants={itemVariant}>
                <MediaCard
                  media={media}
                  onManualMatch={isAdmin ? handleManualMatch : undefined}
                  onUnmatch={isAdmin ? handleUnmatchClick : undefined}
                  onRefreshMetadata={isAdmin ? handleRefreshMetadata : undefined}
                  onEditMetadata={isAdmin ? handleEditMetadata : undefined}
                  onDelete={isAdmin ? handleDeleteClick : undefined}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
      {renderModals()}
    </>
  )
}