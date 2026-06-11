import { useState, useCallback, useMemo } from 'react'
import { useEntityAdmin } from './useAdmin'
import type { DeleteTarget } from './useAdmin'
import type { MatchStrategyType } from './useMedia'
import type { Series, Media, MixedItem, WatchHistory } from '@/types'
import { streamApi } from '@/api'
import { getItemId, getItemTitle } from '@/utils/mediaHelpers'

// 通用类型定义 - 修复循环引用问题
export interface ModalProps {
  showEditModal: boolean
  showDeleteConfirm: boolean
  showUnmatchConfirm: boolean
  showRefreshModal: boolean
  showMatchModal: boolean
  deleteTarget: DeleteTarget
  editModalType: 'series' | 'media'
  editModalId: string
  editModalTmdbId: number | undefined
  editModalMediaType: 'movie' | 'tv'
  editModalEntity: Series | Media | null
  editModalCurrentPoster: string
  editModalCurrentBackdrop: string
  editModalHasPoster: boolean
  editModalHasBackdrop: boolean
  editModalOnSave: (data: unknown) => void
  editModalOnClose: () => void
  editModalHasTagline: boolean
  deleteModalTitle: string
  deleteModalDescription: string
  deleteModalHint: string
  deleteModalOnClose: () => void
  deleteModalOnDelete: (deleteFiles: boolean) => Promise<void>
  unmatchModalOnClose: () => void
  unmatchModalOnConfirm: () => void
  unmatchModalTitle: string
  unmatchModalDescription: string
  refreshModalMediaId: string
  refreshModalMediaTitle: string
  refreshModalOnClose: () => void
  refreshModalOnSuccess: () => void
  matchModalMediaId: string
  matchModalStrategyType: MatchStrategyType
  matchModalDefaultTitle: string
  matchModalOnClose: () => void
  matchModalOnMatchSuccess: () => void
  showTrailer: boolean
  trailerUrl: string | undefined
  onCloseTrailer: () => void
}

export interface ModalConfigResult {
  currentMediaId: string
  currentMediaType: 'movie' | 'series'
  showEditModal: boolean
  showDeleteConfirm: boolean
  showUnmatchConfirm: boolean
  showRefreshModal: boolean
  showMatchModal: boolean
  setShowEditModal: (show: boolean) => void
  setShowDeleteConfirm: (show: boolean) => void
  setShowUnmatchConfirm: (show: boolean) => void
  setShowRefreshModal: (show: boolean) => void
  setShowMatchModal: (show: boolean) => void
  handleEditMetadata: (id: string) => void
  handleDeleteClick: (id: string, mediaType?: 'movie' | 'series') => void
  handleUnmatchClick: (id: string) => void
  handleRefreshMetadata: (id: string) => void
  handleManualMatch: (id: string) => void
  modalProps: ModalProps
}

// 内部工厂函数 - 创建弹窗配置
function createModalConfig({
  getMediaType,
  getEntity,
  getMediaTitle,
  onRefresh,
  setPosterVersion,
  onDeleteNavigate,
}: {
  getMediaType: (id: string) => 'movie' | 'series'
  getEntity: (id: string) => Series | Media | undefined
  getMediaTitle: (id: string) => string
  onRefresh: () => Promise<void>
  setPosterVersion: (version: number) => void
  onDeleteNavigate?: () => void
}): ModalConfigResult {
  const [currentMediaId, setCurrentMediaId] = useState('')
  const [currentMediaType, setCurrentMediaType] = useState<'movie' | 'series'>('movie')

  const handleEditMetadata = useCallback((id: string) => {
    const mediaType = getMediaType(id)
    setCurrentMediaId(id)
    setCurrentMediaType(mediaType)
    setShowEditModal(true)
  }, [getMediaType])

  const handleDeleteClick = useCallback((id: string, mediaType?: 'movie' | 'series') => {
    const finalMediaType = mediaType || getMediaType(id)
    setCurrentMediaId(id)
    setCurrentMediaType(finalMediaType)
    setShowDeleteConfirm(true)
  }, [getMediaType])

  const handleUnmatchClick = useCallback((id: string) => {
    const mediaType = getMediaType(id)
    setCurrentMediaId(id)
    setCurrentMediaType(mediaType)
    setShowUnmatchConfirm(true)
  }, [getMediaType])

  const handleRefreshMetadata = useCallback((id: string) => {
    const mediaType = getMediaType(id)
    setCurrentMediaId(id)
    setCurrentMediaType(mediaType)
    setShowRefreshModal(true)
  }, [getMediaType])

  const handleManualMatch = useCallback((id: string) => {
    const mediaType = getMediaType(id)
    setCurrentMediaId(id)
    setCurrentMediaType(mediaType)
    setShowMatchModal(true)
  }, [getMediaType])

  const currentEntity = useMemo(() => {
    if (!currentMediaId) return undefined
    return getEntity(currentMediaId)
  }, [currentMediaId, getEntity])

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
    handleEditSave,
    handleDelete,
    handleUnmatch,
    handleRefreshSuccess,
    handleMatchSuccess,
  } = useEntityAdmin({
    entityId: currentMediaId || undefined,
    entity: currentEntity || null,
    type: currentMediaType,
    deleteTarget: currentMediaType as DeleteTarget,
    onUpdate: () => {},
    onRefresh,
    setPosterVersion,
    onDeleteNavigate,
  })

  const matchModalStrategyType: MatchStrategyType = {
    type: currentMediaType === 'movie' ? 'movie' : 'tv',
    source: 'tmdb',
  }

  const getPosterUrl = () => {
    if (!currentMediaId) return ''
    if (currentMediaType === 'series') {
      return streamApi.getSeriesPosterUrl(currentMediaId)
    }
    return streamApi.getPosterUrl(currentMediaId, 0)
  }

  const getDeleteConfig = () => {
    if (currentMediaType === 'series') {
      return {
        title: '删除剧集',
        description: '确定要删除这部剧集吗？此操作将删除所有季和集，不可撤销。',
        hint: '删除后，剧集及其所有季和集将从媒体库中移除。选择"移除并删除文件"将同时删除本地文件。',
      }
    }
    return {
      title: '删除电影',
      description: '确定要删除这部电影吗？此操作不可撤销。',
      hint: '删除后，电影将从媒体库中移除。选择"移除并删除文件"将同时删除本地文件。',
    }
  }

  const deleteConfig = getDeleteConfig()

  const modalProps: ModalProps = useMemo(() => ({
    showEditModal,
    showDeleteConfirm,
    showUnmatchConfirm,
    showRefreshModal,
    showMatchModal,
    deleteTarget: currentMediaType as DeleteTarget,
    editModalType: currentMediaType === 'series' ? 'series' : 'media',
    editModalId: currentMediaId,
    editModalTmdbId: currentEntity?.tmdb_id,
    editModalMediaType: currentMediaType === 'movie' ? 'movie' : 'tv',
    editModalEntity: currentEntity || null,
    editModalCurrentPoster: getPosterUrl(),
    editModalCurrentBackdrop: '',
    editModalHasPoster: !!(currentEntity && (currentEntity as any).poster_path),
    editModalHasBackdrop: !!(currentEntity && (currentEntity as any).backdrop_path),
    editModalOnSave: handleEditSave,
    editModalOnClose: () => setShowEditModal(false),
    editModalHasTagline: currentMediaType === 'movie',
    deleteModalTitle: deleteConfig.title,
    deleteModalDescription: deleteConfig.description,
    deleteModalHint: deleteConfig.hint,
    deleteModalOnClose: () => setShowDeleteConfirm(false),
    deleteModalOnDelete: handleDelete,
    unmatchModalOnClose: () => setShowUnmatchConfirm(false),
    unmatchModalOnConfirm: handleUnmatch,
    unmatchModalTitle: currentMediaType === 'series' ? '解除匹配剧集' : '解除匹配',
    unmatchModalDescription: '确定要解除此内容的元数据匹配吗？',
    refreshModalMediaId: currentMediaId,
    refreshModalMediaTitle: getMediaTitle(currentMediaId),
    refreshModalOnClose: () => setShowRefreshModal(false),
    refreshModalOnSuccess: handleRefreshSuccess,
    matchModalMediaId: currentMediaId,
    matchModalStrategyType,
    matchModalDefaultTitle: getMediaTitle(currentMediaId),
    matchModalOnClose: () => setShowMatchModal(false),
    matchModalOnMatchSuccess: handleMatchSuccess,
    showTrailer: false,
    trailerUrl: undefined,
    onCloseTrailer: () => {},
  }), [
    showEditModal,
    showDeleteConfirm,
    showUnmatchConfirm,
    showRefreshModal,
    showMatchModal,
    currentMediaType,
    currentMediaId,
    currentEntity,
    getPosterUrl,
    deleteConfig,
    handleEditSave,
    handleDelete,
    handleUnmatch,
    handleRefreshSuccess,
    handleMatchSuccess,
    matchModalStrategyType,
    getMediaTitle,
  ])

  return {
    currentMediaId,
    currentMediaType,
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
  }
}

// ==================== 详情页专用 ====================

interface UseMediaModalConfigProps {
  entity: Series | Media | null
  type: 'movie' | 'series'
  onRefresh: () => Promise<void>
  setPosterVersion: (version: number) => void
  onDeleteNavigate?: () => void
}

export function useMediaModalConfig({
  entity,
  type,
  onRefresh,
  setPosterVersion,
  onDeleteNavigate,
}: UseMediaModalConfigProps): ModalConfigResult {
  return createModalConfig({
    getMediaType: () => type,
    getEntity: () => entity || undefined,
    getMediaTitle: () => entity?.title || '',
    onRefresh,
    setPosterVersion,
    onDeleteNavigate,
  })
}

// ==================== 首页专用 ====================

interface UseHomeDetailPageModalConfigProps {
  continueList: WatchHistory[]
  libraries: { recentItems: MixedItem[] }[]
  onRefresh: () => Promise<void>
  setPosterVersion: (version: number) => void
  onDeleteNavigate?: () => void
}

export function useHomeDetailPageModalConfig({
  continueList,
  libraries,
  onRefresh,
  setPosterVersion,
  onDeleteNavigate,
}: UseHomeDetailPageModalConfigProps): ModalConfigResult {
  const getMediaType = useCallback((id: string): 'movie' | 'series' => {
    const continueItem = continueList.find(item => item.media.id === id)
    if (continueItem && continueItem.media.series_id) {
      return 'series'
    }
    for (const lib of libraries) {
      const recentItem = lib.recentItems.find(item => getItemId(item) === id)
      if (recentItem) {
        // 修复类型比较错误：MixedItem.type 没有 'media'
        if (recentItem.type === 'series' || (recentItem.type === 'movie' && recentItem.media?.series_id)) {
          return 'series'
        }
      }
    }
    return 'movie'
  }, [continueList, libraries])

  const getEntity = useCallback((id: string): Series | Media | undefined => {
    const continueItem = continueList.find(item => item.media.id === id)
    if (continueItem) {
      return continueItem.media
    }
    for (const lib of libraries) {
      const recentItem = lib.recentItems.find(item => getItemId(item) === id)
      if (recentItem) {
        // 修复类型转换错误：使用 series 属性而不是直接转换
        if (recentItem.type === 'series') {
          return recentItem.series as Series
        }
        return recentItem.media as Media
      }
    }
    return undefined
  }, [continueList, libraries])

  const getMediaTitle = useCallback((id: string): string => {
    const continueItem = continueList.find(item => item.media.id === id)
    if (continueItem) {
      return continueItem.media.title || ''
    }
    for (const lib of libraries) {
      const recentItem = lib.recentItems.find(item => getItemId(item) === id)
      if (recentItem) {
        return getItemTitle(recentItem)
      }
    }
    return ''
  }, [continueList, libraries])

  return createModalConfig({
    getMediaType,
    getEntity,
    getMediaTitle,
    onRefresh,
    setPosterVersion,
    onDeleteNavigate,
  })
}

// ==================== 列表页专用 ====================

interface UseLibraryDetailPageModalConfigProps {
  mixedItems: MixedItem[]
  onRefresh: () => Promise<void>
  setPosterVersion: (version: number) => void
}

export function useLibraryDetailPageModalConfig({
  mixedItems,
  onRefresh,
  setPosterVersion,
}: UseLibraryDetailPageModalConfigProps): ModalConfigResult {
  const getMediaType = useCallback((id: string): 'movie' | 'series' => {
    const item = mixedItems.find(item => getItemId(item) === id)
    if (item) {
      // 修复类型比较错误：MixedItem.type 没有 'media'
      if (item.type === 'series' || (item.type === 'movie' && item.media?.series_id)) {
        return 'series'
      }
    }
    return 'movie'
  }, [mixedItems])

  const getEntity = useCallback((id: string): Series | Media | undefined => {
    const item = mixedItems.find(item => getItemId(item) === id)
    if (item) {
      // 修复类型转换错误：使用 series/media 属性而不是直接转换
      if (item.type === 'series') {
        return item.series as Series
      }
      return item.media as Media
    }
    return undefined
  }, [mixedItems])

  const getMediaTitle = useCallback((id: string): string => {
    const item = mixedItems.find(item => getItemId(item) === id)
    if (item) {
      return getItemTitle(item)
    }
    return ''
  }, [mixedItems])

  return createModalConfig({
    getMediaType,
    getEntity,
    getMediaTitle,
    onRefresh,
    setPosterVersion,
  })
}