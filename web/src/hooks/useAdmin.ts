import { useState, useCallback } from 'react'
import { useToast } from '@/components/Toast'
import { adminApi, streamApi } from '@/api'
import type { EditFormData } from '@/components/EditMetadataModal'
import type { Episode } from '@/types'

export type EntityType = 'series' | 'episode' | 'movie'
export type DeleteTarget = 'movie' | 'series' | 'season' | 'episode'

export interface UseEntityAdminOptions<T> {
  entityId: string | undefined
  entity: T | null
  type: EntityType
  deleteTarget?: DeleteTarget
  seasonNum?: number
  episodeId?: string
  onUpdate: (data: T) => void
  onRefresh: () => Promise<void>
  setPosterVersion: (version: number) => void
  onMatchSuccess?: () => void
  onDeleteNavigate?: () => void
}

export interface UseEntityAdminReturn {
  showEditModal: boolean
  showDeleteConfirm: boolean
  showUnmatchConfirm: boolean
  showRefreshModal: boolean
  showMatchModal: boolean
  editForm: EditFormData
  setShowEditModal: (show: boolean) => void
  setShowDeleteConfirm: (show: boolean) => void
  setShowUnmatchConfirm: (show: boolean) => void
  setShowRefreshModal: (show: boolean) => void
  setShowMatchModal: (show: boolean) => void
  setEditForm: (form: EditFormData) => void
  handleEditMetadata: () => void
  handleEditSave: (form: EditFormData) => Promise<void>
  handleDelete: (deleteFiles: boolean) => Promise<void>
  handleUnmatch: () => void
  handleRefreshMetadata: () => void
  handleRefreshSuccess: () => void
  handleMatchSuccess: () => Promise<void>
}

const defaultEditForm: EditFormData = {
  title: '',
  year: '',
  overview: '',
  rating: '',
  poster: null,
  backdrop: null,
  removePoster: false,
  removeBackdrop: false,
}

export function useEntityAdmin<T>(options: UseEntityAdminOptions<T>): UseEntityAdminReturn {
  const { entityId, entity, type, deleteTarget = type as DeleteTarget, seasonNum, episodeId, onUpdate, onRefresh, setPosterVersion, onMatchSuccess, onDeleteNavigate } = options
  const toast = useToast()

  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false)
  const [showRefreshModal, setShowRefreshModal] = useState(false)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [editForm, setEditForm] = useState<EditFormData>(defaultEditForm)

  const handleEditMetadata = useCallback(() => {
    if (!entity) return
    setEditForm({
      title: (entity as any)?.title || '',
      year: String((entity as any)?.year || ''),
      overview: (entity as any)?.overview || '',
      rating: String((entity as any)?.rating || ''),
      poster: null,
      backdrop: null,
      removePoster: false,
      removeBackdrop: false,
    })
    setShowEditModal(true)
  }, [entity])

  const handleEditSave = useCallback(async (form: EditFormData) => {
    if (!entityId) return

    try {
      const response = await adminApi.update(entityId, type, form)
      if (response.data.success) {
        toast.success('保存成功')
        await onRefresh()
        setPosterVersion(Date.now())
        setShowEditModal(false)
      }
    } catch {
      toast.error('保存失败')
    }
  }, [entityId, type, onRefresh, setPosterVersion, toast])

  const handleDelete = useCallback(async (deleteFiles: boolean) => {
    if (!entityId) return

    try {
      let response
      switch (deleteTarget) {
        case 'movie':
          response = await adminApi.delete(entityId, 'movie', deleteFiles)
          toast.success('电影删除成功')
          break
        case 'series':
          response = await adminApi.delete(entityId, 'series', deleteFiles)
          toast.success('剧集删除成功')
          break
        case 'season':
          if (!seasonNum) return
          response = await adminApi.deleteSeason(entityId, seasonNum, deleteFiles)
          toast.success('季删除成功')
          break
        case 'episode':
          const targetId = episodeId || entityId
          response = await adminApi.delete(targetId, 'episode', deleteFiles)
          toast.success('集删除成功')
          break
        default:
          response = await adminApi.delete(entityId, type, deleteFiles)
          toast.success('删除成功')
      }
      if (response?.data?.success) {
        setShowDeleteConfirm(false)
        onDeleteNavigate?.()
      }
    } catch {
      const errorMessages: Record<DeleteTarget, string> = {
        movie: '电影删除失败',
        series: '剧集删除失败',
        season: '季删除失败',
        episode: '集删除失败',
      }
      toast.error(errorMessages[deleteTarget] || '删除失败')
    }
  }, [entityId, type, deleteTarget, seasonNum, episodeId, toast, onDeleteNavigate])

  const handleUnmatch = useCallback(async () => {
    if (!entityId) return

    try {
      const response = await adminApi.unmatch(entityId, type)
      if (response.data.success) {
        await onRefresh()
        setPosterVersion(Date.now())
        setShowUnmatchConfirm(false)
        toast.success('解除匹配成功')
      }
    } catch {
      toast.error('解除匹配失败')
    }
  }, [entityId, type, onRefresh, setPosterVersion, toast])

  const handleRefreshMetadata = useCallback(() => {
    setShowRefreshModal(true)
  }, [])

  const handleRefreshSuccess = useCallback(() => {
    onRefresh()
    setPosterVersion(Date.now())
    setShowRefreshModal(false)
    toast.success('刷新成功')
  }, [onRefresh, setPosterVersion, toast])

  const handleMatchSuccess = useCallback(async () => {
    await onRefresh()
    setPosterVersion(Date.now())
    setShowMatchModal(false)
    onMatchSuccess?.()
    toast.success('匹配成功')
  }, [onRefresh, setPosterVersion, onMatchSuccess, toast])

  return {
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
    setEditForm,
    handleEditMetadata,
    handleEditSave,
    handleDelete,
    handleUnmatch,
    handleRefreshMetadata,
    handleRefreshSuccess,
    handleMatchSuccess,
  }
}

interface UseEpisodeAdminProps {
  episodes: Episode[]
  onRefresh: () => Promise<void>
  toast: {
    success: (message: string) => void
    error: (message: string) => void
  }
}

export function useEpisodeAdmin({ episodes, onRefresh, toast }: UseEpisodeAdminProps) {
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false)
  const [showRefreshModal, setShowRefreshModal] = useState(false)
  const [showMatchModal, setShowMatchModal] = useState(false)

  const selectedEpisode = episodes.find(e => e.id === selectedEpisodeId)

  const handleEditMetadata = (episodeId: string) => {
    setSelectedEpisodeId(episodeId)
    setShowEditModal(true)
  }

  const handleEditSave = async (form: Record<string, unknown>) => {
    if (!selectedEpisodeId) return
    try {
      await adminApi.update(selectedEpisodeId, 'episode', form)
      toast.success('保存成功')
      await onRefresh()
      setShowEditModal(false)
    } catch {
      toast.error('保存失败')
    }
  }

  const handleDelete = (episodeId: string) => {
    setSelectedEpisodeId(episodeId)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async (deleteFiles: boolean) => {
    if (!selectedEpisodeId) return
    try {
      await adminApi.delete(selectedEpisodeId, 'episode', deleteFiles)
      toast.success('删除成功')
      await onRefresh()
      setShowDeleteConfirm(false)
    } catch {
      toast.error('删除失败')
    }
  }

  const handleUnmatch = (episodeId: string) => {
    setSelectedEpisodeId(episodeId)
    setShowUnmatchConfirm(true)
  }

  const confirmUnmatch = async () => {
    if (!selectedEpisodeId) return
    try {
      await adminApi.unmatch(selectedEpisodeId, 'episode')
      toast.success('解除匹配成功')
      await onRefresh()
      setShowUnmatchConfirm(false)
    } catch {
      toast.error('解除匹配失败')
    }
  }

  const handleRefreshMetadata = (episodeId: string) => {
    setSelectedEpisodeId(episodeId)
    setShowRefreshModal(true)
  }

  const handleRefreshSuccess = async () => {
    toast.success('刷新成功')
    await onRefresh()
    setShowRefreshModal(false)
  }

  const handleManualMatch = (episodeId: string) => {
    setSelectedEpisodeId(episodeId)
    setShowMatchModal(true)
  }

  const handleMatchSuccess = async () => {
    toast.success('匹配成功')
    await onRefresh()
    setShowMatchModal(false)
  }

  const closeAll = () => {
    setShowEditModal(false)
    setShowDeleteConfirm(false)
    setShowUnmatchConfirm(false)
    setShowRefreshModal(false)
    setShowMatchModal(false)
  }

  return {
    selectedEpisodeId,
    selectedEpisode,
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
    confirmDelete,
    handleUnmatch,
    confirmUnmatch,
    handleRefreshMetadata,
    handleRefreshSuccess,
    handleManualMatch,
    handleMatchSuccess,
    closeAll,
  }
}