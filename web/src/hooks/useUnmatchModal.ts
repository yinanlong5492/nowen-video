import { useState, useCallback } from 'react'
import { useToast } from '@/components/Toast'

export function useUnmatchModal(refreshContent: () => void) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [mediaId, setMediaId] = useState('')

  const openModal = useCallback((id: string) => {
    setMediaId(id)
    setOpen(true)
  }, [])

  const handleUnmatch = useCallback(async (unmatchApi: (id: string) => Promise<any>) => {
    try {
      await unmatchApi(mediaId)
      await refreshContent()
      toast.success('已解除匹配')
    } catch {
      toast.error('解除匹配失败')
    }
    setOpen(false)
  }, [mediaId, refreshContent, toast])

  return {
    open,
    setOpen,
    mediaId,
    openModal,
    handleUnmatch,
  }
}
