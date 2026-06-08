import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { libraryApi } from '@/api'
import { useToast } from '@/components/Toast'
import { VideoLibraryPage } from './VideoLibraryPage'
import { MusicLibraryPage } from './MusicLibraryPage'
import { AudioBookPage } from './AudioBookPage'
import { LibraryEmpty } from './components/LibraryEmpty'
import type { Library } from '@/types'

export default function LibraryPage() {
  const { id } = useParams<{ id: string }>()
  const [library, setLibrary] = useState<Library | null>(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const loadLibrary = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const libRes = await libraryApi.list()
      const foundLibrary = libRes.data.data.find((lib) => lib.id === id)
      setLibrary(foundLibrary || null)
    } catch {
      toast.error('加载媒体库信息失败')
      setLibrary(null)
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    )
  }

  if (!library) {
    return <LibraryEmpty type="not-found" />
  }

  // 根据媒体类型渲染对应页面
  if (library.type === 'music') {
    return <MusicLibraryPage library={library} />
  }

  if (library.type === 'audiobook') {
    return <AudioBookPage library={library} />
  }

  // 默认渲染视频库页面
  return <VideoLibraryPage library={library} />
}