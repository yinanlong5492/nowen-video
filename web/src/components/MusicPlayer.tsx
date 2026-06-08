import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { musicApi, fileManagerApi } from '@/api'
import type { MusicTrack, MusicAlbum } from '@/types'
import { useMusicPlayerStore } from '@/stores/musicPlayer'
import { useWebSocket, WS_EVENTS, type ScanProgressData } from '@/hooks/useWebSocket'
import { useToast } from '@/components/Toast'
import MusicTrackDetail from '@/components/music/MusicTrackDetail'
import MusicAlbumDetail from '@/components/music/MusicAlbumDetail'
import MusicArtistDetail from '@/components/music/MusicArtistDetail'
import MusicLibrarySections from '@/components/music/MusicLibrarySections'
import MusicEditDialogs from '@/components/music/MusicEditDialogs'

interface MusicPlayerProps {
  libraryId: string
  libraryName?: string
}

export default function MusicPlayer({ libraryId, libraryName }: MusicPlayerProps) {
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [albums, setAlbums] = useState<MusicAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [failedTrackCovers, setFailedTrackCovers] = useState<Set<string>>(new Set())
  const [failedAlbumCovers, setFailedAlbumCovers] = useState<Set<string>>(new Set())
  const { playTrack, addToQueue, addAlbumToQueue } = useMusicPlayerStore()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const detailTrackId = searchParams.get('track')
  const detailAlbumId = searchParams.get('album')
  const detailArtistName = searchParams.get('artist')

  const [moreMenuType, setMoreMenuType] = useState<'track' | 'album' | 'artist' | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [lyricsText, setLyricsText] = useState<string>('')
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')

  const [showEditTrackMeta, setShowEditTrackMeta] = useState(false)
  const [editTrackMeta, setEditTrackMeta] = useState<Partial<MusicTrack>>({})
  const [showEditAlbumMeta, setShowEditAlbumMeta] = useState(false)
  const [editAlbumMeta, setEditAlbumMeta] = useState<Partial<MusicAlbum>>({})
  const [showEditArtistMeta, setShowEditArtistMeta] = useState(false)
  const [editArtistMeta, setEditArtistMeta] = useState<{ artist_name?: string; genre?: string }>({})
  const [savingMeta, setSavingMeta] = useState(false)

  const { on, off } = useWebSocket()

  const recentTracksRef = useRef<HTMLDivElement>(null)
  const albumsRef = useRef<HTMLDivElement>(null)
  const artistsRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tracksRes, albumsRes] = await Promise.all([
        musicApi.listTracks({ library_id: libraryId, page: 1, size: 100 }),
        musicApi.listAlbums({ library_id: libraryId, page: 1, size: 50, sort: 'recent' }),
      ])

      const tracks = tracksRes.data?.data || []
      const albums = albumsRes.data?.data || []

      if (!mountedRef.current) {
        return
      }
      setTracks(tracks)
      setAlbums(albums)
    } catch {
      // 静默处理错误
    } finally {
      setLoading(false)
    }
  }, [libraryId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!detailArtistName) {
      setSelectedAlbumId('')
    }
  }, [detailArtistName])

  useEffect(() => {
    if (!detailTrackId) {
      setLyricsText('')
      return
    }
    musicApi.getLyrics(detailTrackId).then(res => {
      setLyricsText(res.data?.data || '')
    }).catch(() => {
      setLyricsText('')
    })
  }, [detailTrackId])

  useEffect(() => {
    if (!moreMenuType) return
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuType(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moreMenuType])

  useEffect(() => {
    const handleScanCompleted = (_data: ScanProgressData) => {
      loadData()
    }

    const handleLibraryUpdated = (_data: unknown) => {
      loadData()
    }

    const handleFileDeleted = (_data: unknown) => {
      loadData()
    }

    on(WS_EVENTS.SCAN_COMPLETED, handleScanCompleted)
    on(WS_EVENTS.LIBRARY_UPDATED, handleLibraryUpdated)
    on(WS_EVENTS.FILE_DELETED, handleFileDeleted)

    return () => {
      off(WS_EVENTS.SCAN_COMPLETED, handleScanCompleted)
      off(WS_EVENTS.LIBRARY_UPDATED, handleLibraryUpdated)
      off(WS_EVENTS.FILE_DELETED, handleFileDeleted)
    }
  }, [on, off, loadData])

  const handleToggleLove = async (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const result = await musicApi.toggleLove(trackId)
      setTracks(tracks.map(t => t.id === trackId ? { ...t, loved: result.data.loved } : t))
    } catch {
      // 静默处理错误
    }
  }

  const handleToggleAlbumLove = async (albumTracks: MusicTrack[], e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const results = await Promise.all(albumTracks.map(t => musicApi.toggleLove(t.id)))
      const lovedMap = new Map<string, boolean>()
      results.forEach((r, i) => { lovedMap.set(albumTracks[i].id, r.data.loved) })
      setTracks(prev => prev.map(t => lovedMap.has(t.id) ? { ...t, loved: lovedMap.get(t.id) ?? false } : t))
    } catch {
      // 静默处理错误
    }
  }

  const handleDeleteTrack = async (track: MusicTrack) => {
    try {
      await fileManagerApi.deleteFile(track.id)
      setShowDeleteConfirm(false)
      toast.success('歌曲已删除')
      setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete('track'); return p })
      loadData()
    } catch {
      toast.error('删除歌曲失败')
    }
  }

  const handleCopyFilePath = (track: MusicTrack) => {
    navigator.clipboard.writeText(track.file_path).then(() => {
      toast.success('文件路径已复制')
    }).catch(() => {
      toast.error('复制失败')
    })
  }

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success('链接已复制')
    }).catch(() => {})
  }

  const handleAddToQueue = (track: MusicTrack, e: React.MouseEvent) => {
    e.stopPropagation()
    addToQueue(track)
  }

  const handleAddAlbumToQueue = (albumTracks: MusicTrack[], _e?: React.MouseEvent) => {
    addAlbumToQueue(albumTracks)
  }

  const handleTrackCoverError = useCallback((trackId: string) => {
    setFailedTrackCovers(prev => new Set(prev).add(trackId))
  }, [])

  const handleAlbumCoverError = useCallback((albumId: string) => {
    setFailedAlbumCovers(prev => new Set(prev).add(albumId))
  }, [])

  const handleSaveTrackMeta = async () => {
    if (!detailTrackId) return
    setSavingMeta(true)
    try {
      await fileManagerApi.updateFile(detailTrackId, editTrackMeta)
      toast.success('歌曲元数据已更新')
      setShowEditTrackMeta(false)
      loadData()
    } catch {
      toast.error('更新失败')
    } finally {
      setSavingMeta(false)
    }
  }

  const handleSaveAlbumMeta = async () => {
    if (!detailAlbumId) return
    setSavingMeta(true)
    try {
      await musicApi.updateAlbum(detailAlbumId, editAlbumMeta as Record<string, unknown>)
      toast.success('专辑元数据已更新')
      setShowEditAlbumMeta(false)
      loadData()
    } catch {
      toast.error('更新失败')
    } finally {
      setSavingMeta(false)
    }
  }

  const handleSaveArtistMeta = async () => {
    const artistName = detailArtistName
    if (!artistName) return
    setSavingMeta(true)
    try {
      const updates: Record<string, unknown> = {}
      if (editArtistMeta.artist_name && editArtistMeta.artist_name !== detailArtistName) {
        updates.artist = editArtistMeta.artist_name
      }
      if (editArtistMeta.genre) {
        updates.genre = editArtistMeta.genre
      }
      if (Object.keys(updates).length === 0) {
        toast.info('没有需要更新的内容')
        setShowEditArtistMeta(false)
        return
      }
      await musicApi.updateArtist(libraryId, artistName, updates)
      toast.success('艺术家元数据已更新')
      setShowEditArtistMeta(false)
      loadData()
    } catch {
      toast.error('更新失败')
    } finally {
      setSavingMeta(false)
    }
  }

  const scrollLeft = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      const amount = ref.current.clientWidth * 0.7
      ref.current.scrollBy({ left: -amount, behavior: 'smooth' })
    }
  }

  const scrollRight = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      const amount = ref.current.clientWidth * 0.7
      ref.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }

  const lovedTracks = useMemo(() => tracks.filter(t => t.loved), [tracks])
  const recentTracks = useMemo(() => [...tracks].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ), [tracks])
  const recentItems = useMemo(() => {
    const groups = new Map<string, MusicTrack[]>()
    const orphanTracks: MusicTrack[] = []
    for (const t of tracks) {
      if (!t.album_id) {
        orphanTracks.push(t)
        continue
      }
      const group = groups.get(t.album_id) || []
      group.push(t)
      groups.set(t.album_id, group)
    }
    const items: ({ type: 'track'; track: MusicTrack; sortDate: number } | { type: 'album'; album: MusicAlbum; tracks: MusicTrack[]; sortDate: number })[] = []
    for (const t of orphanTracks) {
      items.push({ type: 'track', track: t, sortDate: new Date(t.created_at).getTime() })
    }
    for (const [albumId, groupTracks] of groups) {
      const sorted = [...groupTracks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const sortDate = new Date(sorted[0].created_at).getTime()
      if (sorted.length === 1) {
        items.push({ type: 'track', track: sorted[0], sortDate })
      } else {
        const album = albums.find(a => a.id === albumId)
        if (album) {
          items.push({ type: 'album', album, tracks: sorted, sortDate })
        } else {
          for (const t of sorted) {
            items.push({ type: 'track', track: t, sortDate: new Date(t.created_at).getTime() })
          }
        }
      }
    }
    items.sort((a, b) => b.sortDate - a.sortDate)
    return items
  }, [tracks, albums])
  const popularTracks = useMemo(() => [...tracks].sort((a, b) =>
    b.play_count - a.play_count
  ), [tracks])
  const artists = useMemo(() => {
    const seen = new Map<string, string>()
    for (const t of tracks) {
      const raw = (t.artist || '').trim()
      if (!raw) continue
      const key = raw.toLowerCase()
      const existing = seen.get(key)
      if (!existing) {
        seen.set(key, raw)
      } else if (/[A-Z\u4e00-\u9fff]/.test(raw[0] || '') && !/[A-Z\u4e00-\u9fff]/.test(existing[0] || '')) {
        seen.set(key, raw)
      }
    }
    return [...seen.values()].sort()
  }, [tracks])

  const parsedLyrics = useMemo(() => {
    if (!lyricsText || !detailTrackId) return null
    const track = tracks.find(t => t.id === detailTrackId)
    if (!track) return null
    const timeTagRe = /^\[\d{2}:\d{2}(\.\d{2,3})?\]/
    const metaTextRe = /^(词|曲|编曲|作词|作曲|制作人|编曲|原唱|和声|混音|母带|录音|监制|吉他|贝斯|键盘|鼓).*[：:]/
    const allLines = lyricsText.split('\n')
    const firstTagIdx = allLines.findIndex(l => timeTagRe.test(l))
    const timedLines = allLines
      .slice(firstTagIdx > -1 ? firstTagIdx : 0)
      .filter(l => timeTagRe.test(l))
      .filter(l => {
        const text = l.replace(timeTagRe, '').trim()
        if (!text) return false
        if (metaTextRe.test(text)) return false
        if (/^\[00:00\.\d{2}\]/.test(l) && /^.+\s+-\s+.+$/.test(text)) return false
        return true
      })
      .map(l => l.replace(timeTagRe, '').trim())
    const maxLen = Math.max(...timedLines.map(l => l.length))
    const colWidth = Math.max(maxLen * 0.85, 8)
    const metadataParts: string[] = []
    if (track.lyricist) metadataParts.push(`作词：${track.lyricist}`)
    if (track.composer) metadataParts.push(`作曲：${track.composer}`)
    if (track.arranger) metadataParts.push(`编曲：${track.arranger}`)
    return { timedLines, colWidth, metadataParts, trackTitle: track.title }
  }, [lyricsText, detailTrackId, tracks])

  const goBack = useCallback(() => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev)
      p.delete('track')
      p.delete('album')
      p.delete('artist')
      return p
    })
  }, [setSearchParams])

  const navigateToTrack = useCallback((trackId: string) => {
    setSearchParams({ track: trackId })
  }, [setSearchParams])

  const navigateToAlbum = useCallback((albumId: string) => {
    setSearchParams({ album: albumId })
  }, [setSearchParams])

  const navigateToArtist = useCallback((artist: string) => {
    setSearchParams({ artist })
  }, [setSearchParams])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-purple border-t-transparent" />
      </div>
    )
  }

  if (detailTrackId && !detailAlbumId && !detailArtistName) {
    const track = tracks.find(t => t.id === detailTrackId)
    if (!track) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-theme-secondary">歌曲未找到</p>
            <button onClick={goBack} className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[var(--bg-surface)] text-theme-primary">
              返回
            </button>
          </div>
        </div>
      )
    }
    return (
      <>
        <MusicTrackDetail
          track={track}
          tracks={tracks}
          albums={albums}
          lyricsText={lyricsText}
          parsedLyrics={parsedLyrics}
          failedTrackCovers={failedTrackCovers}
          failedAlbumCovers={failedAlbumCovers}
          moreMenuType={moreMenuType}
          moreMenuRef={moreMenuRef}
          showDeleteConfirm={showDeleteConfirm}
          detailTrackId={detailTrackId}
          onSetMoreMenuType={setMoreMenuType}
          onSetShowDeleteConfirm={setShowDeleteConfirm}
          onToggleLove={handleToggleLove}
          onDelete={handleDeleteTrack}
          onAddToQueue={handleAddToQueue}
          onEditMeta={(meta) => { setEditTrackMeta(meta); setShowEditTrackMeta(true) }}
          onCopyPath={handleCopyFilePath}
          onShare={handleShareLink}
          onPlay={playTrack}
          onSelectTrack={navigateToTrack}
          onSelectAlbum={navigateToAlbum}
          onBack={goBack}
        />
        <MusicEditDialogs
          showEditTrackMeta={showEditTrackMeta}
          editTrackMeta={editTrackMeta}
          showEditAlbumMeta={showEditAlbumMeta}
          editAlbumMeta={editAlbumMeta}
          showEditArtistMeta={showEditArtistMeta}
          editArtistMeta={editArtistMeta}
          savingMeta={savingMeta}
          onCloseTrackMeta={() => setShowEditTrackMeta(false)}
          onCloseAlbumMeta={() => setShowEditAlbumMeta(false)}
          onCloseArtistMeta={() => setShowEditArtistMeta(false)}
          onSetEditTrackMeta={setEditTrackMeta}
          onSetEditAlbumMeta={setEditAlbumMeta}
          onSetEditArtistMeta={setEditArtistMeta}
          onSaveTrackMeta={handleSaveTrackMeta}
          onSaveAlbumMeta={handleSaveAlbumMeta}
          onSaveArtistMeta={handleSaveArtistMeta}
        />
      </>
    )
  }

  if (detailAlbumId && !detailTrackId && !detailArtistName) {
    const album = albums.find(a => a.id === detailAlbumId)
    if (!album) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-theme-secondary">专辑未找到</p>
            <button onClick={goBack} className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[var(--bg-surface)] text-theme-primary">
              返回
            </button>
          </div>
        </div>
      )
    }
    const albumTracks = tracks.filter(t => t.album_id === detailAlbumId)
    const allAlbumLoved = albumTracks.length > 0 && albumTracks.every(t => t.loved)
    return (
      <>
        <MusicAlbumDetail
          album={album}
          albumTracks={albumTracks}
          failedAlbumCovers={failedAlbumCovers}
          allAlbumLoved={allAlbumLoved}
          moreMenuType={moreMenuType}
          moreMenuRef={moreMenuRef}
          onSetMoreMenuType={setMoreMenuType}
          onToggleLove={handleToggleLove}
          onToggleAlbumLove={handleToggleAlbumLove}
          onAddToQueue={handleAddToQueue}
          onAddAlbumToQueue={handleAddAlbumToQueue}
          onEditMeta={(meta) => { setEditAlbumMeta(meta); setShowEditAlbumMeta(true) }}
          onShare={handleShareLink}
          onRefreshMeta={() => toast.info('刷新元数据功能开发中')}
          onAlbumCoverError={handleAlbumCoverError}
          onPlay={playTrack}
          onSelectTrack={navigateToTrack}
          onBack={goBack}
        />
        <MusicEditDialogs
          showEditTrackMeta={showEditTrackMeta}
          editTrackMeta={editTrackMeta}
          showEditAlbumMeta={showEditAlbumMeta}
          editAlbumMeta={editAlbumMeta}
          showEditArtistMeta={showEditArtistMeta}
          editArtistMeta={editArtistMeta}
          savingMeta={savingMeta}
          onCloseTrackMeta={() => setShowEditTrackMeta(false)}
          onCloseAlbumMeta={() => setShowEditAlbumMeta(false)}
          onCloseArtistMeta={() => setShowEditArtistMeta(false)}
          onSetEditTrackMeta={setEditTrackMeta}
          onSetEditAlbumMeta={setEditAlbumMeta}
          onSetEditArtistMeta={setEditArtistMeta}
          onSaveTrackMeta={handleSaveTrackMeta}
          onSaveAlbumMeta={handleSaveAlbumMeta}
          onSaveArtistMeta={handleSaveArtistMeta}
        />
      </>
    )
  }

  if (detailArtistName && !detailTrackId && !detailAlbumId) {
    const artistTracks = tracks.filter(t => t.artist === detailArtistName)
    const artistAlbums = albums.filter(a => a.artist === detailArtistName)
    return (
      <>
        <MusicArtistDetail
          artistName={detailArtistName}
          artistTracks={artistTracks}
          artistAlbums={artistAlbums}
          selectedAlbumId={selectedAlbumId}
          failedAlbumCovers={failedAlbumCovers}
          moreMenuType={moreMenuType}
          moreMenuRef={moreMenuRef}
          onSetMoreMenuType={setMoreMenuType}
          onSetSelectedAlbumId={setSelectedAlbumId}
          onToggleLove={handleToggleLove}
          onAddToQueue={handleAddToQueue}
          onAddAlbumToQueue={handleAddAlbumToQueue}
          onEditMeta={(meta) => { setEditArtistMeta(meta); setShowEditArtistMeta(true) }}
          onShare={handleShareLink}
          onPlay={playTrack}
          onSelectTrack={navigateToTrack}
          onBack={goBack}
        />
        <MusicEditDialogs
          showEditTrackMeta={showEditTrackMeta}
          editTrackMeta={editTrackMeta}
          showEditAlbumMeta={showEditAlbumMeta}
          editAlbumMeta={editAlbumMeta}
          showEditArtistMeta={showEditArtistMeta}
          editArtistMeta={editArtistMeta}
          savingMeta={savingMeta}
          onCloseTrackMeta={() => setShowEditTrackMeta(false)}
          onCloseAlbumMeta={() => setShowEditAlbumMeta(false)}
          onCloseArtistMeta={() => setShowEditArtistMeta(false)}
          onSetEditTrackMeta={setEditTrackMeta}
          onSetEditAlbumMeta={setEditAlbumMeta}
          onSetEditArtistMeta={setEditArtistMeta}
          onSaveTrackMeta={handleSaveTrackMeta}
          onSaveAlbumMeta={handleSaveAlbumMeta}
          onSaveArtistMeta={handleSaveArtistMeta}
        />
      </>
    )
  }

  return (
    <>
      <MusicLibrarySections
        libraryName={libraryName}
        lovedTracks={lovedTracks}
        recentTracks={recentTracks}
        recentItems={recentItems}
        popularTracks={popularTracks}
        albums={albums}
        artists={artists}
        tracks={tracks}
        failedTrackCovers={failedTrackCovers}
        failedAlbumCovers={failedAlbumCovers}
        recentTracksRef={recentTracksRef}
        albumsRef={albumsRef}
        artistsRef={artistsRef}
        onToggleLove={handleToggleLove}
        onToggleAlbumLove={handleToggleAlbumLove}
        onAddToQueue={handleAddToQueue}
        onPlay={playTrack}
        onSelectTrack={navigateToTrack}
        onSelectAlbum={navigateToAlbum}
        onSelectArtist={navigateToArtist}
        onScrollLeft={scrollLeft}
        onScrollRight={scrollRight}
        onTrackCoverError={handleTrackCoverError}
        onAlbumCoverError={handleAlbumCoverError}
      />
    </>
  )
}