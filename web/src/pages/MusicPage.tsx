import { useState, useEffect } from 'react'
import MusicPlayer from '@/components/MusicPlayer'
import { libraryApi } from '@/api'
import type { Library } from '@/types'

export default function MusicPage() {
  const [library, setLibrary] = useState<Library | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    libraryApi.list()
      .then((res) => {
        const libs: Library[] = res.data?.data || []
        const musicLib = libs.find((l) => l.type === 'music')
        setLibrary(musicLib || null)
        if (!musicLib) setError(true)
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-purple border-t-transparent" />
      </div>
    )
  }

  if (error || !library) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-theme-secondary">未找到音乐库</p>
          <p className="text-theme-tertiary text-sm mt-2">请先在媒体库中创建音乐类型的库</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full animate-fade-in">
      <MusicPlayer libraryId={library.id} libraryName={library.name} />
    </div>
  )
}