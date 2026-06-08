import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { mediaApi } from '@/api'

export default function MediaRouter() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [mediaType, setMediaType] = useState<'movie' | 'episode' | null>(null)

  useEffect(() => {
    if (!id) return
    mediaApi.detail(id).then(res => {
      setMediaType(res.data.data.media_type === 'episode' ? 'episode' : 'movie')
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return null
  }

  if (!mediaType) {
    return <Navigate to="/" replace />
  }

  if (mediaType === 'episode') {
    return <Navigate to={`/episode/${id}`} replace />
  }

  return <Navigate to={`/movie/${id}`} replace />
}