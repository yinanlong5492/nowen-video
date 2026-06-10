import { useState } from 'react'

export interface AdminModalState {
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
  closeAllModals: () => void
}

export function useAdminModalState(): AdminModalState {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false)
  const [showRefreshModal, setShowRefreshModal] = useState(false)
  const [showMatchModal, setShowMatchModal] = useState(false)

  const closeAllModals = () => {
    setShowEditModal(false)
    setShowDeleteConfirm(false)
    setShowUnmatchConfirm(false)
    setShowRefreshModal(false)
    setShowMatchModal(false)
  }

  return {
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
    closeAllModals,
  }
}