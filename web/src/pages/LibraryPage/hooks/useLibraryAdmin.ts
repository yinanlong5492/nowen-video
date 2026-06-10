import { useState } from 'react'
import { adminApi } from '@/api'
import { useToast } from '@/components/Toast'
import { formatErrMsg } from '@/utils/error'

interface UseLibraryAdminReturn {
  showRefreshModal: boolean
  refreshId: string | null
  refreshTitle: string
  showMatchModal: boolean
  matchId: string | null
  showEditModal: boolean
  editId: string | null
  showDeleteConfirm: boolean
  deleteId: string | null
  showUnmatchConfirm: boolean
  unmatchId: string | null
  matchQuery: string
  matchResults: Array<{
    id: number | string
    name?: string
    title?: string
    original_name?: string
    original_title?: string
    first_air_date?: string
    release_date?: string
    vote_average?: number
    overview?: string
    poster_path?: string
    year?: number
    rating?: number
    cover?: string
  }>
  matchSearching: boolean
  matchSelecting: boolean
  matchSource: 'tmdb' | 'douban'
  editForm: {
    title: string; orig_title: string; year: number | undefined; overview: string;
    rating: number | undefined; genres: string; country: string; language: string; studio: string
  }
  setShowRefreshModal: React.Dispatch<React.SetStateAction<boolean>>
  setRefreshId: React.Dispatch<React.SetStateAction<string | null>>
  setRefreshTitle: React.Dispatch<React.SetStateAction<string>>
  setShowMatchModal: React.Dispatch<React.SetStateAction<boolean>>
  setMatchId: React.Dispatch<React.SetStateAction<string | null>>
  setShowEditModal: React.Dispatch<React.SetStateAction<boolean>>
  setEditId: React.Dispatch<React.SetStateAction<string | null>>
  setShowDeleteConfirm: React.Dispatch<React.SetStateAction<boolean>>
  setDeleteId: React.Dispatch<React.SetStateAction<string | null>>
  setShowUnmatchConfirm: React.Dispatch<React.SetStateAction<boolean>>
  setUnmatchId: React.Dispatch<React.SetStateAction<string | null>>
  setMatchQuery: React.Dispatch<React.SetStateAction<string>>
  setMatchResults: React.Dispatch<React.SetStateAction<Array<{
    id: number | string
    name?: string
    title?: string
    original_name?: string
    original_title?: string
    first_air_date?: string
    release_date?: string
    vote_average?: number
    overview?: string
    poster_path?: string
    year?: number
    rating?: number
    cover?: string
  }>>>
  setMatchSource: React.Dispatch<React.SetStateAction<'tmdb' | 'douban'>>
  setEditForm: React.Dispatch<React.SetStateAction<{
    title: string; orig_title: string; year: number | undefined; overview: string;
    rating: number | undefined; genres: string; country: string; language: string; studio: string
  }>>
  handleRefreshMetadata: (id: string) => void
  handleRefreshSuccess: () => void
  handleManualMatch: (id: string) => void
  handleMatchSearch: () => Promise<void>
  handleMatchSelect: (resultId: number | string) => Promise<void>
  handleUnmatchClick: (id: string | null) => void
  handleUnmatch: () => Promise<void>
  handleEditMetadata: (id: string | null) => void
  handleEditSave: () => Promise<void>
  handleDeleteClick: (id: string | null) => void
  handleDelete: (deleteFiles: boolean) => Promise<void>
}

export function useLibraryAdmin(): UseLibraryAdminReturn {
  const toast = useToast()

  const [showRefreshModal, setShowRefreshModal] = useState(false)
  const [refreshId, setRefreshId] = useState<string | null>(null)
  const [refreshTitle, setRefreshTitle] = useState('')
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false)
  const [unmatchId, setUnmatchId] = useState<string | null>(null)
  const [matchQuery, setMatchQuery] = useState('')
  const [matchResults, setMatchResults] = useState<Array<{
    id: number | string
    name?: string
    title?: string
    original_name?: string
    original_title?: string
    first_air_date?: string
    release_date?: string
    vote_average?: number
    overview?: string
    poster_path?: string
    year?: number
    rating?: number
    cover?: string
  }>>([])
  const [matchSearching, setMatchSearching] = useState(false)
  const [matchSelecting, setMatchSelecting] = useState(false)
  const [matchSource, setMatchSource] = useState<'tmdb' | 'douban'>('tmdb')
  const [editForm, setEditForm] = useState<{
    title: string; orig_title: string; year: number | undefined; overview: string;
    rating: number | undefined; genres: string; country: string; language: string; studio: string
  }>({ title: '', orig_title: '', year: undefined, overview: '', rating: undefined, genres: '', country: '', language: '', studio: '' })

  const handleRefreshMetadata = (id: string) => {
    setRefreshId(id)
    setRefreshTitle('')
    setShowRefreshModal(true)
  }

  const handleRefreshSuccess = () => {
    toast.success('元数据刷新成功')
  }

  const handleManualMatch = (id: string) => {
    setMatchId(id)
    setMatchQuery('')
    setMatchResults([])
    setMatchSource('tmdb')
    setShowMatchModal(true)
  }

  const handleMatchSearch = async () => {
    if (!matchQuery.trim()) return
    setMatchSearching(true)
    try {
      if (matchSource === 'tmdb') {
        const res = await adminApi.searchMetadata(matchQuery, 'tv')
        setMatchResults(res.data.data || [])
        if ((res.data.data || []).length === 0) {
          toast.info('TMDb 未找到匹配结果，请尝试其他关键词或切换到其他数据源')
        }
      } else if (matchSource === 'douban') {
        const res = await adminApi.searchDouban(matchQuery, undefined)
        setMatchResults(res.data.data || [])
        if ((res.data.data || []).length === 0) {
          toast.info('豆瓣未找到匹配结果，请尝试其他关键词')
        }
      }
    } catch (err) {
      const errorMap: Record<string, string> = {
        tmdb: '搜索失败，请检查 TMDb API Key 或网络/代理配置',
        douban: '豆瓣搜索失败',
      }
      toast.error(formatErrMsg(err, errorMap[matchSource] || '搜索失败'))
    } finally {
      setMatchSearching(false)
    }
  }

  const handleMatchSelect = async (resultId: number | string) => {
    if (!matchId) return
    setMatchSelecting(true)
    try {
      if (matchSource === 'tmdb') {
        await adminApi.matchSeriesMetadata(matchId, resultId as number)
      } else if (matchSource === 'douban') {
        await adminApi.matchSeriesDouban(matchId, resultId as string)
      }
      setShowMatchModal(false)
      toast.success('剧集匹配成功')
    } catch {
      toast.error('匹配失败')
    } finally {
      setMatchSelecting(false)
    }
  }

  const handleUnmatchClick = (id: string | null) => {
    if (id === null) {
      setShowUnmatchConfirm(false)
    } else {
      setUnmatchId(id)
      setShowUnmatchConfirm(true)
    }
  }

  const handleUnmatch = async () => {
    if (!unmatchId) return
    try {
      await adminApi.unmatchSeriesMetadata(unmatchId)
      setShowUnmatchConfirm(false)
      toast.success('已解除匹配')
    } catch {
      toast.error('解除匹配失败')
    }
  }

  const handleEditMetadata = (id: string | null) => {
    if (id === null) {
      setShowEditModal(false)
    } else {
      setEditId(id)
      setEditForm({ title: '', orig_title: '', year: undefined, overview: '', rating: undefined, genres: '', country: '', language: '', studio: '' })
      setShowEditModal(true)
    }
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

  const handleDeleteClick = (id: string | null) => {
    if (id === null) {
      setShowDeleteConfirm(false)
    } else {
      setDeleteId(id)
      setShowDeleteConfirm(true)
    }
  }

  const handleDelete = async (deleteFiles: boolean, mediaType: 'movie' | 'series' = 'series') => {
    if (!deleteId) return
    try {
      if (mediaType === 'movie') {
        await adminApi.delete(deleteId, 'movie', deleteFiles)
        toast.success('电影已删除')
      } else {
        await adminApi.deleteSeries(deleteId, deleteFiles)
        toast.success('剧集已删除')
      }
      setShowDeleteConfirm(false)
    } catch {
      toast.error('删除失败')
    }
  }

  return {
    showRefreshModal,
    refreshId,
    refreshTitle,
    showMatchModal,
    matchId,
    showEditModal,
    editId,
    showDeleteConfirm,
    deleteId,
    showUnmatchConfirm,
    unmatchId,
    matchQuery,
    matchResults,
    matchSearching,
    matchSelecting,
    matchSource,
    editForm,
    setShowRefreshModal,
    setRefreshId,
    setRefreshTitle,
    setShowMatchModal,
    setMatchId,
    setShowEditModal,
    setEditId,
    setShowDeleteConfirm,
    setDeleteId,
    setShowUnmatchConfirm,
    setUnmatchId,
    setMatchQuery,
    setMatchResults,
    setMatchSource,
    setEditForm,
    handleRefreshMetadata,
    handleRefreshSuccess,
    handleManualMatch,
    handleMatchSearch,
    handleMatchSelect,
    handleUnmatchClick,
    handleUnmatch,
    handleEditMetadata,
    handleEditSave,
    handleDeleteClick,
    handleDelete,
  }
}
