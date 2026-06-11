import { useEffect, useState } from 'react'
import { mediaApi, libraryApi, musicApi, audiobookApi, getAudioBookCoverUrl, streamApi } from '@/api'
import type { WatchHistory, Library, MixedItem, AudioBook, MusicTrack } from '@/types'

interface LibraryWithRecent extends Library {
  coverUrls: string[]
  recentItems: MixedItem[]
}

interface UseHomeDataReturn {
  continueList: WatchHistory[]
  libraries: LibraryWithRecent[]
  loading: boolean
  refreshHomeData: () => void
}

export function useHomeData(): UseHomeDataReturn {
  const [continueList, setContinueList] = useState<WatchHistory[]>([])
  const [libraries, setLibraries] = useState<LibraryWithRecent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)

    // 获取继续观看列表
    const fetchContinueWatching = mediaApi.continueWatching(10)
      .then(res => res.data.data)
      .catch(() => [])

    // 获取媒体库列表
    const fetchLibraries = libraryApi.list()
      .then(res => res.data.data)
      .catch(() => [])

    Promise.all([fetchContinueWatching, fetchLibraries])
      .then(([continueItems, libraryList]) => {
        setContinueList(continueItems)

        // 为每个媒体库获取最近添加的内容和封面图
        const librariesWithRecent: LibraryWithRecent[] = []
        const fetchPromises = libraryList.map(async (lib) => {
          try {
            // 根据媒体库类型获取对应的最近添加内容
            let recentItems: MixedItem[] = []
            let coverUrls: string[] = []

            if (lib.type === 'music') {
              // 音乐库获取最近添加的专辑
              const albumsRes = await musicApi.listAlbums({ library_id: lib.id, page: 1, size: 12, sort: '-added_at' })
              const albums = albumsRes.data.data || []
              recentItems = albums.map(album => ({
                type: 'music' as const,
                music: {
                  id: album.id,
                  title: album.title || 'Unknown Album',
                  album_id: album.id,
                  cover_path: album.cover_path || '',
                  year: album.year,
                  album_name: album.title || '',
                  artist_name: album.artist || '',
                  duration: 0,
                  track_number: 0,
                  disc_number: 0,
                  library_id: lib.id,
                  file_path: '',
                  artist: album.artist || '',
                  album_artist: album.artist || '',
                  album: album.title || '',
                  track_id: '',
                  genre: '',
                  composer: '',
                  lyricist: '',
                  comment: '',
                  disc_total: 0,
                  track_total: 0,
                  isrc: '',
                } as unknown as MusicTrack,
              }))
              coverUrls = recentItems.slice(0, 4).map(item => {
                if (item.music?.album_id) {
                  return musicApi.getAlbumCoverUrl(item.music.album_id)
                }
                return ''
              }).filter(Boolean)
            } else if (lib.type === 'audiobook') {
              // 有声书库获取最近添加的有声书
              const booksRes = await audiobookApi.list({ library_id: lib.id, page: 1, size: 12 })
              const books = booksRes.data.data || []
              recentItems = books.map(book => ({
                type: 'audiobook' as const,
                audiobook: book as AudioBook,
              }))
              coverUrls = recentItems.slice(0, 4).map(item => {
                if (item.audiobook) {
                  return getAudioBookCoverUrl(item.audiobook.id)
                }
                return ''
              }).filter(Boolean)
            } else if (lib.type === 'other') {
              // 其他类型（小说等）使用通用媒体API
              const recentRes = await mediaApi.listMixed({ page: 1, size: 12, library_id: lib.id })
              recentItems = recentRes.data.data || []
              coverUrls = recentItems.slice(0, 4).map(item => {
                if (item.media) {
                  return streamApi.getPosterUrl(item.media.id)
                }
                if (item.series) {
                  return streamApi.getSeriesPosterUrl(item.series.id)
                }
                return ''
              }).filter(Boolean)
            } else {
              // 电影、剧集、混合库使用通用媒体API，按library_id筛选
              const recentRes = await mediaApi.listMixed({ page: 1, size: 12, library_id: lib.id })
              recentItems = recentRes.data.data || []
              coverUrls = recentItems.slice(0, 4).map(item => {
                if (item.media) {
                  return streamApi.getPosterUrl(item.media.id)
                }
                if (item.series) {
                  return streamApi.getSeriesPosterUrl(item.series.id)
                }
                return ''
              }).filter(Boolean)
            }

            librariesWithRecent.push({
              ...lib,
              coverUrls,
              recentItems,
            })
          } catch {
            // 如果获取失败，仍然添加媒体库但不带最近内容
            librariesWithRecent.push({
              ...lib,
              coverUrls: [],
              recentItems: [],
            })
          }
        })

        Promise.all(fetchPromises).then(() => {
          // 只显示有内容的媒体库
          setLibraries(librariesWithRecent.filter(lib => lib.recentItems.length > 0))
          setLoading(false)
        })
      })
      .catch(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchData()
  }, [])

  const refreshHomeData = () => {
    fetchData()
  }

  return {
    continueList,
    libraries,
    loading,
    refreshHomeData,
  }
}