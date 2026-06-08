import { Heart, ListPlus, MoreHorizontal, RefreshCw, Pencil, Share2, ArrowLeft, Disc3, Music } from 'lucide-react'
import type { MusicAlbumDetailProps } from '@/types/music'
import { formatDuration } from '@/utils/format'
import { musicApi } from '@/api'

export default function MusicAlbumDetail({
  album,
  albumTracks,
  failedAlbumCovers,
  allAlbumLoved,
  moreMenuType,
  moreMenuRef,
  onSetMoreMenuType,
  onToggleLove,
  onToggleAlbumLove,
  onAddToQueue,
  onAddAlbumToQueue,
  onEditMeta,
  onShare,
  onRefreshMeta,
  onAlbumCoverError,
  onPlay,
  onSelectTrack,
  onBack,
}: MusicAlbumDetailProps) {
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
            {!failedAlbumCovers.has(album.id) ? (
              <img
                src={musicApi.getAlbumCoverUrl(album.id)}
                alt={album.title}
                className="w-full h-full object-cover"
                onError={() => onAlbumCoverError(album.id)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Disc3 className="h-16 w-16 text-theme-tertiary" />
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0 p-4 md:pl-14 rounded-2xl md:-ml-6 card-surface z-10 w-full">
          <h2 className="text-2xl font-bold text-theme-primary">{album.title}</h2>
          <p className="text-theme-secondary my-3">{album.artist}</p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-sm text-theme-secondary flex-wrap">
              {album.year > 0 && <span>年份：{album.year}</span>}
              <span className="mx-1 text-theme-tertiary">/</span>
              <span>{albumTracks.length} 首歌曲</span>
              {album.genre && <><span className="mx-1 text-theme-tertiary">/</span><span>风格：{album.genre}</span></>}
              {album.music_language && <><span className="mx-1 text-theme-tertiary">/</span><span>语种：{album.music_language}</span></>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <button
                onClick={(e) => onToggleAlbumLove(albumTracks, e)}
                className="p-2 rounded-full transition-all hover:opacity-90 border border-[var(--border-default)] text-theme-secondary"
                title={allAlbumLoved ? '取消收藏专辑' : '收藏专辑'}
              >
                <Heart size={16} className={allAlbumLoved ? 'fill-red-500 text-red-500' : ''} />
              </button>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); onSetMoreMenuType(moreMenuType === 'album' ? null : 'album') }}
                  className="p-2 rounded-full transition-all hover:opacity-90 border border-[var(--border-default)] text-theme-secondary"
                  title="更多"
                >
                  <MoreHorizontal size={16} />
                </button>
                {moreMenuType === 'album' && (
                  <div
                    ref={moreMenuRef}
                    onClick={e => e.stopPropagation()}
                    className="absolute right-0 top-full z-20 mt-2 min-w-[200px] rounded-xl py-1 shadow-2xl animate-scale-in glass-panel"
                  >
                    <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-theme-muted">专辑管理</div>
                    <button
                      onClick={() => { onRefreshMeta(); onSetMoreMenuType(null) }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5 text-theme-secondary"
                    >
                      <RefreshCw size={14} />
                      刷新元数据
                    </button>
                    <button
                      onClick={() => {
                        onSetMoreMenuType(null)
                        onEditMeta({
                          title: album.title,
                          artist: album.artist,
                          year: album.year,
                          genre: album.genre,
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
                onClick={() => albumTracks.length > 0 && onAddAlbumToQueue(albumTracks)}
                className={`px-5 py-2 rounded-full text-sm font-medium text-theme-on-neon transition-all hover:opacity-90 flex-shrink-0 bg-neon-purple ${albumTracks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                播放全部
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1 rounded-2xl p-3 card-surface">
        {albumTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-theme-secondary">
            <Music className="h-10 w-10 text-theme-tertiary mb-3" />
            <p className="text-sm">暂无歌曲</p>
          </div>
        ) : (
          albumTracks.map((track, idx) => (
            <div
              key={track.id}
              className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all group hover:bg-[var(--nav-hover-bg)]"
              onClick={() => {
                onPlay(track)
                onSelectTrack(track.id)
              }}
            >
              <span className="text-xs text-theme-secondary w-6 text-right">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-theme-primary truncate">{track.title}</p>
                <p className="text-xs text-theme-secondary truncate">{track.artist}</p>
              </div>
              <span className="text-xs text-theme-secondary">{formatDuration(track.duration)}</span>
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
          ))
        )}
      </div>
    </div>
  )
}