import { memo, useMemo, useCallback, useEffect, useState } from 'react'
import { Heart, ListPlus, Play, Music } from 'lucide-react'
import type { MusicLibrarySectionsProps } from '@/types/music'
import type { MusicTrack, MusicAlbum } from '@/types'
import { formatDuration } from '@/utils/format'
import { musicApi } from '@/api'
import ScrollButton from '@/components/shared/ScrollButton'

// ── 常量 ────────────────────────────────────────

const CARD_WIDTH = 'w-36 sm:w-40' as const

// ── 内部 Props 类型 ──────────────────────────────────

interface CardTrackItemProps {
  track: MusicTrack
  onPlay: (track: MusicTrack) => void
}

interface RecentTrackCardProps {
  track: MusicTrack
  failedTrackCovers: Set<string>
  onPlay: (track: MusicTrack) => void
  onSelectTrack: (trackId: string) => void
  onToggleLove: (trackId: string, e: React.MouseEvent) => void
  onAddToQueue: (track: MusicTrack, e: React.MouseEvent) => void
  onTrackCoverError: (trackId: string) => void
}

interface AlbumCardProps {
  album: MusicAlbum
  tracks: MusicTrack[]
  failedAlbumCovers: Set<string>
  onPlay: (track: MusicTrack, queue?: MusicTrack[]) => void
  onSelectAlbum: (albumId: string) => void
  onToggleAlbumLove: (albumTracks: MusicTrack[], e: React.MouseEvent) => void
  onAddToQueue: (track: MusicTrack, e: React.MouseEvent) => void
  onAlbumCoverError: (albumId: string) => void
}

interface ArtistCardProps {
  artist: string
  albums: MusicAlbum[]
  albumCount: number
  failedAlbumCovers: Set<string>
  onSelectArtist: (artist: string) => void
  onAlbumCoverError: (albumId: string) => void
}

// ── 卡片行（收藏 / 最近收听 / 热门排行） ────────────

const CardTrackItem = memo(function CardTrackItem({ track, onPlay }: CardTrackItemProps) {
  return (
    <div
      className="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200 group hover:scale-[1.02] bg-white/10 hover:bg-white/[0.22]"
      onClick={() => onPlay(track)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{track.title}</p>
          <p className="text-xs text-white/70 truncate">- {track.artist}</p>
        </div>
      </div>
      <Play size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0" />
      <p className="text-xs text-white/70 flex-shrink-0">{formatDuration(track.duration)}</p>
    </div>
  )
})

// ── 最近添加卡片 ──────────────────────────────────

const RecentTrackCard = memo(function RecentTrackCard({
  track, failedTrackCovers, onPlay, onSelectTrack, onToggleLove, onAddToQueue, onTrackCoverError,
}: RecentTrackCardProps) {
  const coverFailed = failedTrackCovers.has(track.id)

  return (
    <div className={`flex-shrink-0 ${CARD_WIDTH} rounded-2xl overflow-hidden transition-all group card-surface hover:border-[var(--neon-purple-30)]`}>
      <div className="aspect-square relative cursor-pointer bg-[var(--bg-surface)]" onClick={() => onSelectTrack(track.id)}>
        {coverFailed ? (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="h-10 w-10 text-theme-tertiary" />
          </div>
        ) : (
          <img
            src={musicApi.getTrackCoverUrl(track.id)}
            alt={track.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => onTrackCoverError(track.id)}
          />
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <button
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2.5 rounded-full bg-neon-purple/80 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-neon-purple hover:scale-110 shadow-lg"
          onClick={(e) => { e.stopPropagation(); onPlay(track) }}
          title="播放"
        >
          <Play className="h-4 w-4 ml-0.5" />
        </button>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-theme-primary truncate transition-colors group-hover:text-neon">{track.title}</p>
        <p className="text-xs text-theme-secondary truncate">{track.artist}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-theme-secondary">{formatDuration(track.duration)}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => onToggleLove(track.id, e)}
              className="p-1 rounded transition-colors hover:bg-[var(--nav-hover-bg)]"
              title={track.loved ? '取消收藏' : '加入收藏'}
            >
              <Heart size={14} className={track.loved ? 'fill-red-500 text-red-500' : 'text-theme-secondary'} />
            </button>
            <button
              onClick={(e) => onAddToQueue(track, e)}
              className="p-1 rounded transition-colors hover:bg-[var(--nav-hover-bg)]"
              title="加入播放队列"
            >
              <ListPlus size={14} className="text-theme-secondary" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

// ── 专辑卡片 ──────────────────────────────────────

const AlbumCard = memo(function AlbumCard({
  album, tracks, failedAlbumCovers, onPlay, onSelectAlbum, onToggleAlbumLove, onAddToQueue, onAlbumCoverError,
}: AlbumCardProps) {
  const coverFailed = failedAlbumCovers.has(album.id)
  const allLoved = tracks.length > 0 && tracks.every(t => t.loved)

  return (
    <div className={`flex-shrink-0 ${CARD_WIDTH} rounded-2xl overflow-hidden transition-all group card-surface hover:border-[var(--neon-purple-30)]`}>
      <div className="aspect-square relative cursor-pointer bg-[var(--bg-surface)]" onClick={() => onSelectAlbum(album.id)}>
        {coverFailed ? (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="h-10 w-10 text-theme-tertiary" />
          </div>
        ) : (
          <img
            src={musicApi.getAlbumCoverUrl(album.id)}
            alt={album.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => onAlbumCoverError(album.id)}
            />
          )}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <button
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2.5 rounded-full bg-neon-purple/80 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-neon-purple hover:scale-110 shadow-lg"
            onClick={(e) => { e.stopPropagation(); if (tracks.length > 0) onPlay(tracks[0], tracks) }}
          title="播放整张专辑"
        >
          <Play className="h-4 w-4 ml-0.5" />
        </button>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-theme-primary truncate transition-colors group-hover:text-neon">{album.title}</p>
        <p className="text-xs text-theme-secondary truncate">{album.artist}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-theme-secondary">{album.year > 0 ? album.year : ''}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); if (tracks.length > 0) onToggleAlbumLove(tracks, e) }}
              className="p-1 rounded transition-colors hover:bg-[var(--nav-hover-bg)]"
              title={allLoved ? '取消收藏整张专辑' : '收藏整张专辑'}
            >
              <Heart size={14} className={allLoved ? 'fill-red-500 text-red-500' : 'text-theme-secondary'} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); if (tracks.length > 0) onAddToQueue(tracks[0], e) }}
              className="p-1 rounded transition-colors hover:bg-[var(--nav-hover-bg)]"
              title="加入播放队列"
            >
              <ListPlus size={14} className="text-theme-secondary" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

// ── 艺术家卡片 ────────────────────────────────────

const ArtistCard = memo(function ArtistCard({
  artist, albums, albumCount, failedAlbumCovers, onSelectArtist, onAlbumCoverError,
}: ArtistCardProps) {
  const coverAlbum = useMemo(
    () => albums.filter(a => a.artist === artist).find(a => a.cover_path),
    [albums, artist],
  )
  const coverFailed = coverAlbum ? failedAlbumCovers.has(coverAlbum.id) : false

  return (
    <div
      className={`flex-shrink-0 ${CARD_WIDTH} rounded-2xl overflow-hidden transition-all group card-surface hover:border-[var(--neon-purple-30)] cursor-pointer`}
      onClick={() => onSelectArtist(artist)}
    >
      <div className="aspect-square rounded-full overflow-hidden mx-auto mt-4 w-28 h-28 bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center">
        {coverAlbum && !coverFailed ? (
          <img
            src={musicApi.getAlbumCoverUrl(coverAlbum.id)}
            alt={artist}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => onAlbumCoverError(coverAlbum.id)}
          />
        ) : (
          <Music className="h-10 w-10 text-theme-tertiary" />
        )}
      </div>
      <div className="p-3 text-center">
        <p className="text-sm font-medium text-theme-primary truncate transition-colors group-hover:text-neon">{artist}</p>
        {albumCount > 0 && (
          <p className="text-xs text-theme-secondary mt-0.5">{albumCount} 张专辑</p>
        )}
      </div>
    </div>
  )
})

// ══════════════════════════════════════════════════
//  主组件
// ══════════════════════════════════════════════════

const MusicLibrarySections = memo(function MusicLibrarySections({
  libraryName, lovedTracks, recentTracks,
  recentItems, popularTracks,
  albums, artists, tracks,
  failedTrackCovers, failedAlbumCovers,
  recentTracksRef, albumsRef, artistsRef,
  onToggleLove, onToggleAlbumLove, onAddToQueue, onPlay,
  onSelectTrack, onSelectAlbum, onSelectArtist,
  onScrollLeft, onScrollRight,
  onTrackCoverError, onAlbumCoverError,
}: MusicLibrarySectionsProps) {

  // ── 派生数据（useMemo 避免重复计算） ──
  const recentTrackItems = useMemo(
    () => recentItems.filter(item => item.type === 'track'),
    [recentItems],
  )

  const visibleAlbums = useMemo(
    () => [...albums]
      .filter(a => a.track_count >= 2)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [albums],
  )

  // 每张专辑匹配的歌曲（使用 album_id 精确匹配）
  const albumTracksMap = useMemo(() => {
    const map = new Map<string, MusicTrack[]>()
    for (const t of tracks) {
      if (!t.album_id) continue
      const arr = map.get(t.album_id)
      if (arr) arr.push(t)
      else map.set(t.album_id, [t])
    }
    return map
  }, [tracks])

  // 每位艺术家的专辑数
  const artistAlbumCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of albums) {
      map.set(a.artist, (map.get(a.artist) || 0) + 1)
    }
    return map
  }, [albums])

  // ── 滚动边缘检测 ────────────────────────────────
  const [scrollEdge, setScrollEdge] = useState({
    recentTracks: { left: true, right: true },
    albums: { left: true, right: true },
    artists: { left: true, right: true },
  })

  const makeScrollHandler = useCallback(
    (section: 'recentTracks' | 'albums' | 'artists') =>
      (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget
        setScrollEdge(prev => ({
          ...prev,
          [section]: {
            left: el.scrollLeft <= 1,
            right: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
          },
        }))
      },
    [],
  )

  // 数据变化时重新检测滚动边缘
  useEffect(() => {
    const check = (ref: React.RefObject<HTMLDivElement>, key: 'recentTracks' | 'albums' | 'artists') => {
      const el = ref.current
      if (!el) return
      setScrollEdge(prev => ({
        ...prev,
        [key]: {
          left: el.scrollLeft <= 1,
          right: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
        },
      }))
    }
    check(recentTracksRef, 'recentTracks')
    check(albumsRef, 'albums')
    check(artistsRef, 'artists')
  }, [recentTrackItems, visibleAlbums, artists, recentTracksRef, albumsRef, artistsRef])

  // ── 渲染 ─────────────────────────────────────────
  return (
    <div className="space-y-10">
      <div>
        <h2 className="mb-5 font-display text-xl font-bold tracking-wide text-theme-primary">
          {libraryName || '音乐库'}
        </h2>
      </div>

      {/* 三卡片网格 */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* 我的收藏 */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-6 w-6 text-white" />
              <h3 className="text-base font-semibold text-white">我的收藏</h3>
            </div>
            <div className="space-y-2">
              {lovedTracks.slice(0, 4).map(track => (
                <CardTrackItem key={track.id} track={track} onPlay={onPlay} />
              ))}
              {lovedTracks.length === 0 && (
                <p className="text-white/60 text-sm py-4 text-center">暂无收藏</p>
              )}
            </div>
          </div>

          {/* 最近收听 */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-500">
            <div className="flex items-center gap-2 mb-4">
              <Play className="h-6 w-6 text-white" />
              <h3 className="text-base font-semibold text-white">最近收听</h3>
            </div>
            <div className="space-y-2">
              {recentTracks.slice(0, 4).map(track => (
                <CardTrackItem key={track.id} track={track} onPlay={onPlay} />
              ))}
              {recentTracks.length === 0 && (
                <p className="text-white/60 text-sm py-4 text-center">暂无收听记录</p>
              )}
            </div>
          </div>

          {/* 热门排行 */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400">
            <div className="flex items-center gap-2 mb-4">
              <Music className="h-6 w-6 text-white" />
              <h3 className="text-base font-semibold text-white">热门排行</h3>
            </div>
            <div className="space-y-2">
              {popularTracks.slice(0, 4).map(track => (
                <CardTrackItem key={track.id} track={track} onPlay={onPlay} />
              ))}
              {popularTracks.length === 0 && (
                <p className="text-white/60 text-sm py-4 text-center">暂无热门歌曲</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 最新添加 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold tracking-wide text-theme-primary">最新添加</h2>
          <div className="flex items-center gap-2">
            <ScrollButton direction="left" onClick={() => onScrollLeft(recentTracksRef)} disabled={scrollEdge.recentTracks.left} />
            <ScrollButton direction="right" onClick={() => onScrollRight(recentTracksRef)} disabled={scrollEdge.recentTracks.right} />
          </div>
        </div>
        <div ref={recentTracksRef} onScroll={makeScrollHandler('recentTracks')} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {recentTrackItems.map(item => (
            <RecentTrackCard
              key={item.track.id}
              track={item.track}
              failedTrackCovers={failedTrackCovers}
              onPlay={onPlay}
              onSelectTrack={onSelectTrack}
              onToggleLove={onToggleLove}
              onAddToQueue={onAddToQueue}
              onTrackCoverError={onTrackCoverError}
            />
          ))}
          {recentTrackItems.length === 0 && (
            <div className="w-full text-center py-8">
              <Music className="h-8 w-8 text-theme-tertiary mx-auto mb-2" />
              <p className="text-theme-secondary text-sm">暂无最近添加的歌曲</p>
            </div>
          )}
        </div>
      </div>

      {/* 最新专辑 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold tracking-wide text-theme-primary">最新专辑</h2>
          <div className="flex items-center gap-2">
            <ScrollButton direction="left" onClick={() => onScrollLeft(albumsRef)} disabled={scrollEdge.albums.left} />
            <ScrollButton direction="right" onClick={() => onScrollRight(albumsRef)} disabled={scrollEdge.albums.right} />
          </div>
        </div>
        <div ref={albumsRef} onScroll={makeScrollHandler('albums')} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {visibleAlbums.map(album => (
            <AlbumCard
              key={album.id}
              album={album}
              tracks={albumTracksMap.get(album.id) || []}
              failedAlbumCovers={failedAlbumCovers}
              onPlay={onPlay}
              onSelectAlbum={onSelectAlbum}
              onToggleAlbumLove={onToggleAlbumLove}
              onAddToQueue={onAddToQueue}
              onAlbumCoverError={onAlbumCoverError}
            />
          ))}
          {visibleAlbums.length === 0 && (
            <div className="w-full text-center py-8">
              <Music className="h-8 w-8 text-theme-tertiary mx-auto mb-2" />
              <p className="text-theme-secondary text-sm">暂无专辑</p>
            </div>
          )}
        </div>
      </div>

      {/* 艺术家 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold tracking-wide text-theme-primary">艺术家</h2>
          <div className="flex items-center gap-2">
            <ScrollButton direction="left" onClick={() => onScrollLeft(artistsRef)} disabled={scrollEdge.artists.left} />
            <ScrollButton direction="right" onClick={() => onScrollRight(artistsRef)} disabled={scrollEdge.artists.right} />
          </div>
        </div>
        <div ref={artistsRef} onScroll={makeScrollHandler('artists')} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {artists.map(artist => (
            <ArtistCard
              key={artist}
              artist={artist}
              albums={albums}
              albumCount={artistAlbumCount.get(artist) || 0}
              failedAlbumCovers={failedAlbumCovers}
              onSelectArtist={onSelectArtist}
              onAlbumCoverError={onAlbumCoverError}
            />
          ))}
          {artists.length === 0 && (
            <div className="w-full text-center py-8">
              <Music className="h-8 w-8 text-theme-tertiary mx-auto mb-2" />
              <p className="text-theme-secondary text-sm">暂无艺术家</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default MusicLibrarySections