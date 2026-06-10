import { useState, useCallback } from 'react'

export function useMatchModal() {
  const [open, setOpen] = useState(false)
  const [mediaId, setMediaId] = useState('')

  const openModal = useCallback((id: string) => {
    setMediaId(id)
    setOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setOpen(false)
    setMediaId('')
  }, [])

  return {
    open,
    setOpen,
    mediaId,
    openModal,
    closeModal,
  }
}
