import { useState, useCallback, useMemo, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useSystemSettingsStore } from '@/stores/systemSettings'
import { LibraryTemplate } from './LibraryTemplate'
import { LibraryToolbar } from './components/LibraryToolbar'
import { MediaGridView } from './components/MediaGridView'
import { LibraryEmpty } from './components/LibraryEmpty'
import { LibraryPagination } from './components/LibraryPagination'
import { useLibraryFilter } from './hooks/useLibraryFilter'
import { useLibraryPagination } from './hooks/useLibraryPagination'
import { useLibraryAdmin } from './hooks/useLibraryAdmin'
import { useVideoLibrary } from './hooks/useVideoLibrary'
import type { Library, Media } from '@/types'
import { RefreshModal, DeleteModal, MatchModal, EditModal, UnmatchModal } from '@/components/GlobalModals'
import { adminApi, streamApi } from '@/api'
import { useToast } from '@/components/Toast'

interface VideoLibraryPageProps {
  library: Library
}

export function VideoLibraryPage({ library }: VideoLibraryPageProps) {
  const { settings, fetchSettings } = useSystemSettingsStore()
  const { page, size, setPage } = useLibraryPagination()
  const { deleteMedia, unmatchMedia } = useLibraryAdmin()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const toast = useToast()

  // 加载系统设置
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // 获取分页配置
  const libraryPageSize = settings?.library_page_size ?? 20
  const isPaginationDisabled = libraryPageSize === 0
  // 当分页禁用时，使用一个很大的数字作为每页大小，显示全部内容
  const effectivePageSize = isPaginationDisabled ? 9999 : libraryPageSize

  const { items, total, loading } = useVideoLibrary(library.id, { page, pageSize: effectivePageSize })
  
  const {
    searchQuery,
    sortValue,
    filterGenre,
    filteredItems,
    setSearchQuery,
    setSortValue,
    setFilterGenre,
    resetFilters,
  } = useLibraryFilter(items)

  const [viewMode, setViewMode] = useState<'grid' | 'wide'>('grid')
  const [showRefreshModal, setShowRefreshModal] = useState(false)
  const [refreshId, setRefreshId] = useState<string | null>(null)
  const [refreshTitle, setRefreshTitle] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editType, setEditType] = useState<'media' | 'series'>('media')
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [editPosterUrl, setEditPosterUrl] = useState('')
  const [editBackdropUrl, setEditBackdropUrl] = useState('')
  const [hasPoster, setHasPoster] = useState(false)
  const [hasBackdrop, setHasBackdrop] = useState(false)
  const [editTmdbId, setEditTmdbId] = useState<number | undefined>()
  const [editMediaType, setEditMediaType] = useState<string | undefined>()
  const [showUnmatchModal, setShowUnmatchModal] = useState(false)
  const [unmatchId, setUnmatchId] = useState<string | null>(null)
  const [unmatchType, setUnmatchType] = useState<'media' | 'series'>('media')

  // 提取所有类型
  const allGenres = useMemo(() => {
    const genres = new Set<string>()
    items.forEach((item) => {
      const itemGenres = item.media?.genres || item.series?.genres || ''
      itemGenres.split(',').forEach((genre: string) => {
        const trimmed = genre.trim()
        if (trimmed) genres.add(trimmed)
      })
    })
    return Array.from(genres).sort()
  }, [items])

  const totalPages = isPaginationDisabled ? 1 : Math.ceil(total / effectivePageSize)

  const handleRefreshMetadata = useCallback((id: string) => {
    setRefreshId(id)
    setRefreshTitle('')
    setShowRefreshModal(true)
  }, [])

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteId(id)
    setShowDeleteConfirm(true)
  }, [])

  const handleManualMatch = useCallback((id: string) => {
    setMatchId(id)
    setShowMatchModal(true)
  }, [])

  const handleEditMetadata = useCallback(async (id: string) => {
    const item = items.find((i) => i.media?.id === id || i.series?.id === id)
    if (!item) return

    const isSeries = !!item.series
    const data = isSeries ? item.series : item.media

    setEditId(id)
    setEditType(isSeries ? 'series' : 'media')
    setEditTmdbId(data?.tmdb_id)
    setEditMediaType(isSeries ? 'tv' : (data as Media)?.media_type)
    setEditForm({
      title: data?.title || '',
      orig_title: data?.orig_title || '',
      year: data?.year || 0,
      rating: data?.rating || 0,
      genres: data?.genres || '',
      overview: data?.overview || '',
      tagline: isSeries ? '' : (data as Media)?.tagline || '',
      country: data?.country || '',
      language: data?.language || '',
      studio: data?.studio || '',
    })

    const posterVersion = Date.now()
    setEditPosterUrl(isSeries
      ? streamApi.getSeriesPosterUrl(id, posterVersion)
      : streamApi.getPosterUrl(id, posterVersion)
    )
    setEditBackdropUrl(isSeries
      ? streamApi.getSeriesBackdropUrl(id, posterVersion)
      : streamApi.getBackdropUrl(id, posterVersion)
    )
    setHasPoster(!!data?.poster_path)
    setHasBackdrop(!!data?.backdrop_path)
    setShowEditModal(true)
  }, [items])

  const handleUnmatchClick = useCallback((id: string) => {
    const item = items.find((i) => i.media?.id === id || i.series?.id === id)
    if (!item) return

    setUnmatchId(id)
    setUnmatchType(item.series ? 'series' : 'media')
    setShowUnmatchModal(true)
  }, [items])

  const handleUnmatchConfirm = useCallback(() => {
    if (!unmatchId) return
    unmatchMedia(unmatchId)
    toast.success('解除匹配成功')
    setShowUnmatchModal(false)
    setUnmatchId(null)
  }, [unmatchId, unmatchMedia, toast])

  const handleEditSave = useCallback(async () => {
    if (!editId) return
    try {
      if (editType === 'series') {
        await adminApi.updateSeriesMetadata(editId, editForm)
      } else {
        await adminApi.updateMediaMetadata(editId, editForm)
      }
      toast.success('元数据更新成功')
      setShowEditModal(false)
      setEditId(null)
    } catch {
      toast.error('更新失败')
    }
  }, [editId, editType, editForm, toast])

  const handleRefreshSuccess = useCallback(() => {
    toast.success('元数据刷新成功')
  }, [toast])

  const handleDeleteConfirm = useCallback(async (deleteFiles: boolean) => {
    if (deleteId) {
      await deleteMedia(deleteId, deleteFiles)
      setShowDeleteConfirm(false)
      setDeleteId(null)
    }
  }, [deleteId, deleteMedia])

  return (
    <LibraryTemplate library={library}>
      <LibraryToolbar
        searchQuery={searchQuery}
        sortValue={sortValue}
        filterGenre={filterGenre}
        viewMode={viewMode}
        allGenres={allGenres}
        onSearchChange={setSearchQuery}
        onSortChange={setSortValue}
        onFilterChange={setFilterGenre}
        onViewModeChange={setViewMode}
        onClearFilters={resetFilters}
      />

      {loading ? (
        <MediaGridView items={[]} loading viewMode={viewMode} />
      ) : filteredItems.length > 0 ? (
        <>
          <MediaGridView
            items={filteredItems}
            isAdmin={isAdmin}
            viewMode={viewMode}
            onRefreshMetadata={handleRefreshMetadata}
            onEditMetadata={handleEditMetadata}
            onDelete={handleDeleteClick}
            onManualMatch={handleManualMatch}
            onUnmatch={handleUnmatchClick}
          />

          <LibraryPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={libraryPageSize > 0 ? libraryPageSize : size}
            onPageChange={setPage}
            disabled={isPaginationDisabled}
          />
        </>
      ) : (
        <LibraryEmpty type={searchQuery || filterGenre ? 'search' : 'default'} />
      )}

      {/* 弹窗 */}
      {showRefreshModal && refreshId && (
        <RefreshModal
          open={showRefreshModal}
          mediaId={refreshId}
          mediaTitle={refreshTitle}
          onClose={() => setShowRefreshModal(false)}
          onSuccess={handleRefreshSuccess}
          onScrape={(id: string, replaceImages: boolean, mode: string) => 
            adminApi.scrapeSeriesMetadata(id, replaceImages, mode)
          }
        />
      )}

      {showDeleteConfirm && (
        <DeleteModal
          open={showDeleteConfirm}
          title="删除确认"
          description="确定要删除该媒体吗？此操作不可撤销。"
          hint="是否同时删除源文件？"
          onClose={() => setShowDeleteConfirm(false)}
          onDelete={handleDeleteConfirm}
        />
      )}

      {showMatchModal && matchId && (
        <MatchModal
          open={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          onSuccess={() => {
            setShowMatchModal(false)
          }}
          matchType="media"
          itemId={matchId}
        />
      )}

      {showEditModal && editId && (
        <EditModal
          type={editType}
          id={editId}
          tmdbId={editTmdbId}
          mediaType={editMediaType}
          editForm={editForm}
          setEditForm={setEditForm}
          currentPoster={editPosterUrl}
          currentBackdrop={editBackdropUrl}
          hasPoster={hasPoster}
          hasBackdrop={hasBackdrop}
          onSave={handleEditSave}
          onClose={() => setShowEditModal(false)}
          hasTagline={editType !== 'series'}
        />
      )}

      <UnmatchModal
        open={showUnmatchModal}
        type={unmatchType}
        onClose={() => setShowUnmatchModal(false)}
        onConfirm={handleUnmatchConfirm}
      />
    </LibraryTemplate>
  )
}