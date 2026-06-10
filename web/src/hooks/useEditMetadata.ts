import { useState, useCallback, useEffect } from 'react'
import type { Media, Series, Episode } from '@/types'

export interface EditFormData {
  title: string
  orig_title: string
  year: number
  overview: string
  rating: number
  genres: string
  country: string
  language: string
  tagline: string
  studio: string
}

const defaultForm: EditFormData = {
  title: '',
  orig_title: '',
  year: 0,
  overview: '',
  rating: 0,
  genres: '',
  country: '',
  language: '',
  tagline: '',
  studio: '',
}

interface UseEditMetadataOptions {
  onSaveSuccess?: () => void
  onSaveError?: (err: unknown) => void
}

export function useEditMetadata(
  media: Media | Series | Episode | null,
  onSave: (form: EditFormData) => Promise<void>,
  options: UseEditMetadataOptions = {}
) {
  const [editForm, setEditForm] = useState<EditFormData>(defaultForm)
  const [isOpen, setIsOpen] = useState(false)

  // 当媒体数据变化时更新表单
  useEffect(() => {
    if (!media) {
      setEditForm(defaultForm)
      return
    }
    
    setEditForm({
      title: media.title || '',
      orig_title: media.orig_title || '',
      year: media.year || 0,
      overview: media.overview || '',
      rating: media.rating || 0,
      genres: Array.isArray(media.genres) ? media.genres.join(', ') : (media.genres || ''),
      country: media.country || '',
      language: media.language || '',
      tagline: media.tagline || '',
      studio: media.studio || '',
    })
  }, [media])

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSave = useCallback(async () => {
    try {
      await onSave(editForm)
      options.onSaveSuccess?.()
      close()
    } catch (err) {
      options.onSaveError?.(err)
    }
  }, [editForm, onSave, close, options])

  const handleChange = useCallback((field: keyof EditFormData, value: string | number) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  return {
    editForm,
    isOpen,
    open,
    close,
    handleSave,
    handleChange,
    setEditForm,
  }
}