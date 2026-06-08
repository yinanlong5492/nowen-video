import type { MusicEditDialogsProps } from '@/types/music'
import { X } from 'lucide-react'

const TRACK_FIELDS = [
  { label: '标题', key: 'title' },
  { label: '艺术家', key: 'artist' },
  { label: '专辑', key: 'album' },
  { label: '风格', key: 'genre' },
  { label: '年份', key: 'year', type: 'number' as const },
  { label: '曲目号', key: 'track_num', type: 'number' as const },
  { label: '碟号', key: 'disc_num', type: 'number' as const },
  { label: '语言', key: 'music_language' },
  { label: '作曲', key: 'composer' },
  { label: '作词', key: 'lyricist' },
  { label: '编曲', key: 'arranger' },
  { label: '调性', key: 'key' },
]

const ALBUM_FIELDS = [
  { label: '专辑名称', key: 'title' },
  { label: '艺术家', key: 'artist' },
  { label: '年份', key: 'year', type: 'number' as const },
  { label: '风格', key: 'genre' },
]

function MetaInput({
  field,
  editMeta,
  setEditMeta,
}: {
  field: { label: string; key: string; type?: 'number' }
  editMeta: Record<string, unknown>
  setEditMeta: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-theme-muted">{field.label}</label>
      <input
        type={field.type || 'text'}
        value={String((editMeta as Record<string, unknown>)[field.key] ?? '')}
        onChange={e => {
          const val = e.target.value
          setEditMeta(prev => ({ ...prev, [field.key]: field.type === 'number' ? (val ? Number(val) : undefined) : val }))
        }}
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none card-surface text-theme-primary"
      />
    </div>
  )
}

export default function MusicEditDialogs({
  showEditTrackMeta,
  editTrackMeta,
  showEditAlbumMeta,
  editAlbumMeta,
  showEditArtistMeta,
  editArtistMeta,
  savingMeta,
  onCloseTrackMeta,
  onCloseAlbumMeta,
  onCloseArtistMeta,
  onSetEditTrackMeta,
  onSetEditAlbumMeta,
  onSetEditArtistMeta,
  onSaveTrackMeta,
  onSaveAlbumMeta,
  onSaveArtistMeta,
}: MusicEditDialogsProps) {
  return (
    <>
      {showEditTrackMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCloseTrackMeta}>
          <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden animate-scale-in glass-panel max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
              <h3 className="text-base font-semibold text-theme-primary">编辑歌曲元数据</h3>
              <button onClick={onCloseTrackMeta} className="p-1 rounded-md hover:bg-[var(--nav-hover-bg)] text-theme-secondary">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3 overflow-y-auto">
              {TRACK_FIELDS.map(field => (
                <MetaInput
                  key={field.key}
                  field={field}
                  editMeta={editTrackMeta as unknown as Record<string, unknown>}
                  setEditMeta={onSetEditTrackMeta as unknown as React.Dispatch<React.SetStateAction<Record<string, unknown>>>}
                />
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--border-default)]">
              <button onClick={onCloseTrackMeta} className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--nav-hover-bg)] text-theme-secondary">取消</button>
              <button onClick={onSaveTrackMeta} disabled={savingMeta} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-neon-purple hover:opacity-90 disabled:opacity-50 transition-opacity">
                {savingMeta ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditAlbumMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCloseAlbumMeta}>
          <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden animate-scale-in glass-panel max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
              <h3 className="text-base font-semibold text-theme-primary">编辑专辑元数据</h3>
              <button onClick={onCloseAlbumMeta} className="p-1 rounded-md hover:bg-[var(--nav-hover-bg)] text-theme-secondary">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {ALBUM_FIELDS.map(field => (
                <MetaInput
                  key={field.key}
                  field={field}
                  editMeta={editAlbumMeta as unknown as Record<string, unknown>}
                  setEditMeta={onSetEditAlbumMeta as unknown as React.Dispatch<React.SetStateAction<Record<string, unknown>>>}
                />
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--border-default)]">
              <button onClick={onCloseAlbumMeta} className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--nav-hover-bg)] text-theme-secondary">取消</button>
              <button onClick={onSaveAlbumMeta} disabled={savingMeta} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-neon-purple hover:opacity-90 disabled:opacity-50 transition-opacity">
                {savingMeta ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditArtistMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCloseArtistMeta}>
          <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden animate-scale-in glass-panel max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
              <h3 className="text-base font-semibold text-theme-primary">编辑艺术家元数据</h3>
              <button onClick={onCloseArtistMeta} className="p-1 rounded-md hover:bg-[var(--nav-hover-bg)] text-theme-secondary">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-theme-muted">艺术家名称</label>
                <input
                  type="text"
                  value={editArtistMeta.artist_name ?? ''}
                  onChange={e => onSetEditArtistMeta(prev => ({ ...prev, artist_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none card-surface text-theme-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-theme-muted">风格</label>
                <input
                  type="text"
                  value={editArtistMeta.genre ?? ''}
                  onChange={e => onSetEditArtistMeta(prev => ({ ...prev, genre: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none card-surface text-theme-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--border-default)]">
              <button onClick={onCloseArtistMeta} className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--nav-hover-bg)] text-theme-secondary">取消</button>
              <button onClick={onSaveArtistMeta} disabled={savingMeta} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-neon-purple hover:opacity-90 disabled:opacity-50 transition-opacity">
                {savingMeta ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}