import { useState, useCallback } from 'react'
import { useToast } from '@/components/Toast'

export function useDeleteModal() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [mediaId, setMediaId] = useState('')

  const openModal = useCallback((id: string) => {
    setMediaId(id)
    setOpen(true)
  }, [])

  const handleDelete = useCallback(async (deleteApi: (id: string, deleteFiles: boolean) => Promise<any>, deleteFiles: boolean) => {
    try {
      await deleteApi(mediaId, deleteFiles)
      toast.success('删除成功')
    } catch {
      toast.error('删除失败')
    }
    setOpen(false)
  }, [mediaId, toast])

  return {
    open,
    setOpen,
    mediaId,
    openModal,
    handleDelete,
  }
}
