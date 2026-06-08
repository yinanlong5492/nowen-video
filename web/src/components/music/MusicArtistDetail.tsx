import { Heart, ListPlus, MoreHorizontal, RefreshCw, Pencil, Share2, ArrowLeft, User, Disc3, Music } from 'lucide-react'
import type { MusicArtistDetailProps } from '@/types/music'
import { formatDuration } from '@/utils/format'
import { musicApi } from '@/api'

export default function MusicArtistDetail({
  artistName,
  artistTracks,
  artistAlbums,
  selectedAlbumId,
  failedAlbumCovers,
  moreMenuType,
  moreMenuRef,
  onSetMoreMenuType,
  onSetSelectedAlbumId,
  onToggleLove,
  onAddToQueue,
  onAddAlbumToQueue,
  onEditMeta,
  onShare,
  onPlay,
  onSelectTrack,
  onBack,
}: MusicArtistDetailProps) {
  if (artistTracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Music className="h-16 w-16 text-theme-tertiary mx-auto mb-4" />
          <p className="text-theme-secondary">暂无歌曲</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[var(--bg-surface)] text-theme-primary"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  const activeAlbumId = selectedAlbumId || artistAlbums[0]?.id || ''
  const displayTracks = activeAlbumId
    ? artistTracks.filter(t => t.album_id === activeAlbumId)
    : artistTracks
  const activeAlbum = artistAlbums.find(a => a.id === activeAlbumId)
  const artistCoverAlbum = artistAlbums.find(a => a.cover_path)

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-theme-secondary hover:text-theme-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回
      </button>

      <div className="flex flex-col md:flex-row gap-0 items-end">
        <div className="flex-shrink-0 w-full md:w-52 z-20 mb-[-1px] md:mb-0">
          <div className="aspect-square rounded-2xl overflow-hidden card-surface">
            {artistCoverAlbum ? (
              <img
                src={musicApi.getAlbumCoverUrl(artistCoverAlbum.id)}
                alt={artistName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-16 w-16 text-theme-tertiary" />
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0 p-4 md:pl-14 rounded-2xl md:-ml-6 card-surface z-10 w-full">
          <h2 className="text-2xl font-bold text-theme-primary" title={artistName}>{artistName}</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-3">
            <div className="flex items-center gap-1 text-sm text-theme-secondary flex-wrap">
              <span>{artistTracks.length} 首歌曲</span>
              <span className="mx-1 text-theme-tertiary">/</span>
              <span>{artistAlbums.length} 张专辑</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); onSetMoreMenuType(moreMenuType === 'artist' ? null : 'artist') }}
                  className="p-2 rounded-full transition-all hover:opacity-90 border border-[var(--border-default)] text-theme-secondary"
                  title="更多"
                >
                  <MoreHorizontal size={16} />
                </button>
                {moreMenuType === 'artist' && (
                  <div
                    ref={moreMenuRef}
                    onClick={e => e.stopPropagation()}
                    className="absolute right-0 top-full z-20 mt-2 min-w-[200px] rounded-xl py-1 shadow-2xl animate-scale-in glass-panel"
                  >
                    <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-theme-muted">艺术家管理</div>
                    <button
                      onClick={() => onSetMoreMenuType(null)}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5 text-theme-secondary"
                    >
                      <RefreshCw size={14} />
                      刷新元数据
                    </button>
                    <button
                      onClick={() => {
                        onSetMoreMenuType(null)
                        onEditMeta({
                          artist_name: artistName,
                          genre: '',
                        })
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5 text-theme-secondary"
                    >
                      <Pencil size={14} />
                      编辑元数据
                    </button>
                    <div className="my-1 mx-3 h-px bg-[var(--border-default)]" />
                    <button
                      onClick={() => { onShare(); onSetMoreMenuType(null) }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5 text-theme-secondary"
                    >
                      <Share2 size={14} />
                      分享链接
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => displayTracks.length > 0 && onAddAlbumToQueue(displayTracks)}
                className={`px-5 py-2 rounded-full text-sm font-medium text-theme-on-neon transition-all hover:opacity-90 flex-shrink-0 bg-neon-purple ${displayTracks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                播放全部
              </button>
            </div>
          </div>
        </div>
      </div>

      {artistAlbums.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-theme-secondary mb-3">专辑</h3>
          <div className="flex gap-3 overflow-x-auto py-2 px-2 scrollbar-thin">
            {artistAlbums.map((a) => (
              <div
                key={a.id}
                className={`flex-shrink-0 w-32 rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-105 card-surface ${activeAlbumId === a.id ? 'ring-2 ring-[var(--neon-purple)]' : ''}`}
                onClick={() => onSetSelectedAlbumId(a.id)}
                title={a.title}
              >
                <div className="aspect-square bg-[var(--bg-surface)]">
                  {!failedAlbumCovers.has(a.id) ? (
                    <img
                      src={musicApi.getAlbumCoverUrl(a.id)}
                      alt={a.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc3 className="h-8 w-8 text-theme-tertiary" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-theme-primary truncate" title={a.title}>{a.title}</p>
                  {a.year > 0 && <p className="text-xs text-theme-secondary">{a.year}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-theme-secondary mb-3">
          歌曲{activeAlbum ? ` · ${activeAlbum.title}` : ''}
        </h3>
        <div className="space-y-1 rounded-2xl p-3 card-surface">
          {displayTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-theme-secondary">
              <Music className="h-10 w-10 text-theme-tertiary mb-3" />
              <p className="text-sm">该专辑暂无歌曲</p>
            </div>
          ) : (
            displayTracks.map((track, idx) => (
              <div
                key={track.id}
                className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all group hover:bg-[var(--nav-hover-bg)]"
                onClick={() => {
                  onPlay(track)
                  onSelectTrack(track.id)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') { onPlay(track); onSelectTrack(track.id) } }}
              >
                <span className="text-xs text-theme-secondary w-6 text-right">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-theme-primary truncate" title={track.title}>{track.title}</p>
                  <p className="text-xs text-theme-secondary truncate" title={track.album}>{track.album}</p>
                </div>
                <span className="text-xs text-theme-secondary">{formatDuration(track.duration)}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => onToggleLove(track.id, e)}
                    className="p-1 rounded transition-colors hover:bg-[var(--nav-hover-bg)]"
                    title={track.loved ? '取消收藏' : '加入收藏'}
                    aria-label={track.loved ? '取消收藏' : '加入收藏'}
                  >
                    <Heart size={14} className={track.loved ? 'fill-red-500 text-red-500' : 'text-theme-secondary'} />
                  </button>
                  <button
                    onClick={(e) => onAddToQueue(track, e)}
                    className="p-1 rounded transition-colors hover:bg-[var(--nav-hover-bg)]"
                    title="加入播放队列"
                    aria-label="加入播放队列"
                  >
                    <ListPlus size={14} className="text-theme-secondary" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}