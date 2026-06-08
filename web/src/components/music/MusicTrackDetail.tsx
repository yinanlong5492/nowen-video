import { useState } from 'react'
import { Music, Heart, ListPlus, MoreHorizontal, Link2, Unlink, Pencil, Trash2, Copy, Share2, ArrowLeft } from 'lucide-react'
import type { MusicTrackDetailProps } from '@/types/music'
import type { MusicTrack } from '@/types'
import { formatDuration, formatFileSize } from '@/utils/format'
import { musicApi } from '@/api'

function TrackListItem({
  track,
  isActive,
  idx,
  onPlay,
  onSelectTrack,
  onToggleLove,
  onAddToQueue,
}: {
  track: MusicTrack
  isActive: boolean
  idx: number
  onPlay: (track: MusicTrack) => void
  onSelectTrack: (trackId: string) => void
  onToggleLove: (trackId: string, e: React.MouseEvent) => void
  onAddToQueue: (track: MusicTrack, e: React.MouseEvent) => void
}) {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all group hover:bg-[var(--nav-hover-bg)] ${isActive ? 'bg-[var(--neon-purple-10)]' : 'bg-transparent'}`}
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
        <p className="text-xs text-theme-secondary truncate" title={track.artist}>{track.artist}</p>
      </div>
      <span className="text-xs text-theme-secondary">{formatDuration(track.duration)}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => onToggleLove(track.id, e)}
          className="p-1 rounded transition-colors hover:bg-[var(--nav-hover-bg)]"
          title={track.loved ? '取消收藏' : '加入收藏'}
          aria-label={track.loved ? '取消收藏' : '加入收藏'}
        >
          <Heart size={14} className={track.loved ? 'fill-red-500 text-red-500' : 'text-theme-secondary sm:opacity-0 sm:group-hover:opacity-100'} />
        </button>
        <button
          onClick={(e) => onAddToQueue(track, e)}
          className="p-1 rounded transition-colors hover:bg-[var(--nav-hover-bg)]"
          title="加入播放队列"
          aria-label="加入播放队列"
        >
          <ListPlus size={14} className="text-theme-secondary sm:opacity-0 sm:group-hover:opacity-100" />
        </button>
      </div>
    </div>
  )
}

export default function MusicTrackDetail({
  track,
  tracks,
  albums,
  lyricsText: _lyricsText,
  parsedLyrics,
  failedTrackCovers,
  failedAlbumCovers: _failedAlbumCovers,
  moreMenuType,
  moreMenuRef,
  showDeleteConfirm,
  detailTrackId,
  onSetMoreMenuType,
  onSetShowDeleteConfirm,
  onToggleLove,
  onDelete,
  onAddToQueue,
  onEditMeta,
  onCopyPath,
  onShare,
  onPlay,
  onSelectTrack,
  onSelectAlbum,
  onBack,
}: MusicTrackDetailProps) {
  const [deleteLocked, setDeleteLocked] = useState(false)

  const album = albums.find(a => a.id === track.album_id)
  const albumTracks = tracks.filter(t => t.album_id === track.album_id)
  const duration = formatDuration(track.duration)

  // 删除弹窗打开时锁定背景滚动
  if (showDeleteConfirm) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }

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
            {!failedTrackCovers.has(track.id) ? (
              <img
                src={musicApi.getTrackCoverUrl(track.id)}
                alt={track.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="h-16 w-16 text-theme-tertiary" />
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0 p-4 md:pl-14 rounded-2xl md:-ml-6 card-surface z-10 w-full">
          <h2 className="text-2xl font-bold text-theme-primary" title={track.title}>{track.title}</h2>
          <p className="text-theme-secondary my-3" title={track.artist}>{track.artist}</p>
          {track.album && (
            <button
              onClick={() => track.album_id && onSelectAlbum(track.album_id)}
              className="text-sm text-theme-secondary hover:text-neon-purple transition-colors"
            >
              {track.album}
            </button>
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-sm text-theme-secondary flex-wrap mt-1">
              <span>时长：{duration}</span>
              {track.year > 0 && <span className="mx-1 text-theme-tertiary">/</span>}
              {track.year > 0 && <span>年份：{track.year}</span>}
              {track.lyricist && <><span className="mx-1 text-theme-tertiary">/</span><span>作词：{track.lyricist}</span></>}
              {track.composer && <><span className="mx-1 text-theme-tertiary">/</span><span>作曲：{track.composer}</span></>}
              {track.arranger && <><span className="mx-1 text-theme-tertiary">/</span><span>编曲：{track.arranger}</span></>}
              {track.genre && <><span className="mx-1 text-theme-tertiary">/</span><span>风格：{track.genre}</span></>}
              {track.music_language && <><span className="mx-1 text-theme-tertiary">/</span><span>语种：{track.music_language}</span></>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => onToggleLove(track.id, e)}
                className="p-2 rounded-full transition-all hover:opacity-90 border border-[var(--border-default)] text-theme-secondary"
                title={track.loved ? '取消收藏' : '加入收藏'}
                aria-label={track.loved ? '取消收藏' : '加入收藏'}
              >
                <Heart size={16} className={track.loved ? 'fill-red-500 text-red-500' : ''} />
              </button>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); onAddToQueue(track, e) }}
                  className="p-2 rounded-full transition-all hover:opacity-90 border border-[var(--border-default)] text-theme-secondary"
                  title="加入播放队列"
                  aria-label="加入播放队列"
                >
                  <ListPlus size={16} />
                </button>
              </div>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); onSetMoreMenuType(moreMenuType === 'track' ? null : 'track') }}
                  className="p-2 rounded-full transition-all hover:opacity-90 border border-[var(--border-default)] text-theme-secondary"
                  title="更多"
                  aria-label="更多操作"
                >
                  <MoreHorizontal size={16} />
                </button>
                {moreMenuType === 'track' && (
                  <div
                    ref={moreMenuRef}
                    onClick={e => e.stopPropagation()}
                    className="absolute right-0 top-full z-20 mt-2 min-w-[200px] rounded-xl py-1 shadow-2xl animate-scale-in glass-panel"
                  >
                    <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-theme-muted">歌曲管理</div>
                    <button
                      disabled
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm opacity-40 cursor-not-allowed text-theme-secondary"
                      title="功能开发中"
                    >
                      <Link2 size={14} />
                      手动匹配歌曲
                    </button>
                    <button
                      disabled
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm opacity-40 cursor-not-allowed text-theme-secondary"
                      title="功能开发中"
                    >
                      <Unlink size={14} />
                      解除匹配歌曲
                    </button>
                    <button
                      onClick={() => {
                        onSetMoreMenuType(null)
                        onEditMeta({
                          title: track.title,
                          artist: track.artist,
                          album: track.album,
                          genre: track.genre,
                          year: track.year,
                          track_num: track.track_num,
                          disc_num: track.disc_num,
                          music_language: track.music_language,
                          composer: track.composer,
                          lyricist: track.lyricist,
                          arranger: track.arranger,
                          key: track.key,
                        })
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5 text-theme-secondary"
                    >
                      <Pencil size={14} />
                      编辑元数据
                    </button>
                    <button
                      onClick={() => { setDeleteLocked(true); onSetShowDeleteConfirm(true); onSetMoreMenuType(null) }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                      删除歌曲
                    </button>
                    <div className="my-1 mx-3 h-px bg-[var(--border-default)]" />
                    <button
                      onClick={() => { onCopyPath(track); onSetMoreMenuType(null) }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5 text-theme-secondary"
                    >
                      <Copy size={14} />
                      复制文件路径
                    </button>
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
                onClick={() => onPlay(track)}
                className="px-5 py-2 rounded-full text-sm font-medium text-theme-on-neon transition-all hover:opacity-90 flex-shrink-0 bg-neon-purple"
              >
                播放
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)]"
          onClick={() => {
            // 首次点击后解锁，二次点击才关闭（防误触）
            if (deleteLocked) {
              setDeleteLocked(false)
            } else {
              onSetShowDeleteConfirm(false)
              document.body.style.overflow = ''
            }
          }}
        >
          <div className="rounded-2xl p-6 w-80 shadow-2xl animate-scale-in glass-panel" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-theme-primary mb-2">确认删除</h3>
            <p className="text-sm text-theme-secondary mb-4">确定要删除歌曲「{track.title}」吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { onSetShowDeleteConfirm(false); setDeleteLocked(false); document.body.style.overflow = '' }}
                className="px-4 py-2 rounded-lg text-sm transition-colors text-theme-secondary bg-[var(--bg-surface)]"
              >
                取消
              </button>
              <button
                onClick={() => { onDelete(track); setDeleteLocked(false); document.body.style.overflow = '' }}
                className="px-4 py-2 rounded-lg text-sm text-white transition-colors bg-red-500 hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {parsedLyrics && (
        <>
          <h3 className="text-sm font-semibold text-theme-secondary mb-2">歌词</h3>
          <div className="rounded-2xl p-5 card-surface">
            <p className="text-sm font-medium text-theme-primary mb-2 text-center">{parsedLyrics.trackTitle}</p>
            {parsedLyrics.metadataParts.length > 0 && (
              <p className="text-xs text-theme-secondary mb-3 text-center">{parsedLyrics.metadataParts.join('  /  ')}</p>
            )}
            <div className="text-sm text-theme-secondary leading-6" style={{ columnWidth: `${parsedLyrics.colWidth}em`, columnGap: '1.5rem' }}>
              {parsedLyrics.timedLines.map((line, i) => (
                <p key={i} className="break-inside-avoid">{line}</p>
              ))}
            </div>
          </div>
        </>
      )}

      <h3 className="text-sm font-semibold text-theme-secondary mb-2">音频信息</h3>
      <div className="rounded-2xl p-5 card-surface">
        <div className="flex items-center text-sm text-theme-secondary mb-3">
          <span className="text-theme-tertiary flex-shrink-0 mr-2">文件位置：</span>
          <span className="truncate" title={track.file_path}>{track.file_path || '-'}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-theme-secondary flex-wrap gap-x-4 gap-y-1">
          <span><span className="text-theme-tertiary">时长：</span>{duration}</span>
          <span><span className="text-theme-tertiary">比特率：</span>{track.bitrate > 0 ? `${track.bitrate} kbps` : '-'}</span>
          <span><span className="text-theme-tertiary">采样率：</span>{track.sample_rate > 0 ? `${(track.sample_rate / 1000).toFixed(1)} kHz` : '-'}</span>
          <span><span className="text-theme-tertiary">声道：</span>{track.channels > 0 ? (track.channels === 2 ? '立体声' : track.channels === 1 ? '单声道' : `${track.channels} 声道`) : '-'}</span>
          <span><span className="text-theme-tertiary">格式：</span>{track.format || '-'}</span>
          <span><span className="text-theme-tertiary">文件大小：</span>{track.file_size > 0 ? formatFileSize(track.file_size) : '-'}</span>
        </div>
      </div>

      {albumTracks.length > 1 && album && (
        <div>
          <h3 className="text-sm font-semibold text-theme-secondary mb-3">
            出自专辑「{album.title}」
          </h3>
          <div className="space-y-1 rounded-2xl p-3 card-surface">
            {albumTracks.map((t, idx) => (
              <TrackListItem
                key={t.id}
                track={t}
                isActive={detailTrackId === t.id}
                idx={idx}
                onPlay={onPlay}
                onSelectTrack={onSelectTrack}
                onToggleLove={onToggleLove}
                onAddToQueue={onAddToQueue}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}