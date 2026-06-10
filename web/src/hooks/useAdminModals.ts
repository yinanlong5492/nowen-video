import { useState, useCallback } from 'react'

export interface UseAdminModalsReturn {
  // 弹窗状态
  showMatchModal: boolean
  showEditModal: boolean
  showDeleteConfirm: boolean
  showUnmatchConfirm: boolean
  showRefreshModal: boolean
  
  // 弹窗开关方法
  setShowMatchModal: (show: boolean) => void
  setShowEditModal: (show: boolean) => void
  setShowDeleteConfirm: (show: boolean) => void
  setShowUnmatchConfirm: (show: boolean) => void
  setShowRefreshModal: (show: boolean) => void
  
  // 批量关闭方法
  closeAllModals: () => void
  
  // 刷新成功回调处理
  handleRefreshSuccess: (refreshFn: () => Promise<void>) => () => Promise<void>
}

export function useAdminModals(): UseAdminModalsReturn {
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false)
  const [showRefreshModal, setShowRefreshModal] = useState(false)

  const closeAllModals = useCallback(() => {
    setShowMatchModal(false)
    setShowEditModal(false)
    setShowDeleteConfirm(false)
    setShowUnmatchConfirm(false)
    setShowRefreshModal(false)
  }, [])

  const handleRefreshSuccess = useCallback((refreshFn: () => Promise<void>) => {
    return async () => {
      try {
        await refreshFn()
        setShowRefreshModal(false)
      } catch (err) {
        console.error('[Refresh Error]', err)
      }
    }
  }, [])

  return {
    showMatchModal,
    showEditModal,
    showDeleteConfirm,
    showUnmatchConfirm,
    showRefreshModal,
    setShowMatchModal,
    setShowEditModal,
    setShowDeleteConfirm,
    setShowUnmatchConfirm,
    setShowRefreshModal,
    closeAllModals,
    handleRefreshSuccess,
  }
}