import { useState, useCallback } from 'react'
import { useToast } from '@/components/Toast'

export function useRefreshModal(refreshContent: () => void) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [mediaId, setMediaId] = useState('')
  const [title, setTitle] = useState('')

  const openModal = useCallback((id: string, title: string) => {
    setMediaId(id)
    setTitle(title)
    setOpen(true)
  }, [])

  const handleSuccess = useCallback(async (scrapeApi: (id: string, replaceImages?: boolean) => Promise<any>) => {
    try {
      await scrapeApi(mediaId, true)
      await refreshContent()
      toast.success('刷新成功')
    } catch {
      toast.error('刷新失败')
    }
    setOpen(false)
  }, [mediaId, refreshContent, toast])

  return {
    open,
    setOpen,
    mediaId,
    title,
    openModal,
    handleSuccess,
  }
}
