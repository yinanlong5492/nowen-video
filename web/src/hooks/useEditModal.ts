import { useState, useCallback } from 'react'
import { useToast } from '@/components/Toast'

export function useEditModal<T>(refreshContent: () => void) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [mediaId, setMediaId] = useState('')
  const [initialForm, setInitialForm] = useState<T | null>(null)

  const openModal = useCallback((id: string, form: T) => {
    setMediaId(id)
    setInitialForm(form)
    setOpen(true)
  }, [])

  const handleSave = useCallback(async (updateApi: (id: string, form: T) => Promise<any>) => {
    if (!initialForm) return
    try {
      await updateApi(mediaId, initialForm)
      await refreshContent()
      toast.success('更新成功')
    } catch {
      toast.error('更新失败')
    }
    setOpen(false)
  }, [mediaId, initialForm, refreshContent, toast])

  return {
    open,
    setOpen,
    mediaId,
    initialForm,
    setInitialForm,
    openModal,
    handleSave,
  }
}
