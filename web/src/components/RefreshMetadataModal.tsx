import { useState, useRef, useEffect } from 'react'
import type { Library } from '@/types'
import { libraryApi } from '@/api'
import { useDialog } from './Dialog'
import {
  X,
  RefreshCw,
  FolderSearch,
  AlertTriangle,
  Loader2,
  Image,
} from 'lucide-react'

interface RefreshMetadataModalProps {
  open: boolean
  library: Library | null
  onClose: () => void
  tmdbEnabled: boolean
  doubanEnabled: boolean
}

export default function RefreshMetadataModal({
  open,
  library,
  onClose,
  tmdbEnabled,
  doubanEnabled,
}: RefreshMetadataModalProps) {
  const dialog = useDialog()
  const [mode, setMode] = useState<'fill_missing' | 'overwrite_all'>('fill_missing')
  const [replaceImagesFill, setReplaceImagesFill] = useState(false)
  const [replaceImagesOverwrite, setReplaceImagesOverwrite] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setMode('fill_missing')
      setReplaceImagesFill(false)
      setReplaceImagesOverwrite(false)
      setSubmitting(false)
    }
  }, [open])

  const busy = submitting

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current && !busy) {
      onClose()
    }
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !busy) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose, busy])

  const handleSubmit = async () => {
    if (!library) return
    if (!tmdbEnabled && !doubanEnabled) {
      const ok = await dialog.confirm({
        title: '刮削数据源未启用',
        message: 'TMDB 和豆瓣刮削均已关闭，是否仅使用本地元数据文件进行刷新？',
        confirmText: '继续刷新',
      })
      if (!ok) return
    }
    setSubmitting(true)
    const replaceImages = mode === 'overwrite_all' ? replaceImagesOverwrite : replaceImagesFill
    try {
      await libraryApi.refreshMetadata(library.id, mode, replaceImages)
      onClose()
    } catch {
      setSubmitting(false)
    }
  }

  if (!open || !library) return null

  const TypeIcon = library.type === 'tvshow'
    ? FolderSearch
    : (library.type === 'mixed' ? FolderSearch : FolderSearch)

  return (
    <div
      ref={overlayRef}
      className="animate-fade-in"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-overlay)',
      }}
    >
      <div
        className="rounded-2xl overflow-hidden animate-slide-up"
        style={{
          width: '460px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-elevated)',
          maxHeight: '90vh',
        }}
      >
        {/* 头部 */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{
              background: 'var(--neon-blue-12)',
              color: 'var(--neon-blue)',
            }}
          >
            <RefreshCw size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              元数据操作
            </h3>
            <p
              className="text-xs truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              {library.name}
            </p>
          </div>
          <button
            onClick={() => !busy && onClose()}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 transition-colors"
            disabled={busy}
          >
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {/* 选项1: 刮削缺失 */}
          <label
            className="flex gap-3 p-3 rounded-xl cursor-pointer transition-all"
            style={{
              background: mode === 'fill_missing' ? 'var(--neon-blue-8)' : 'var(--surface-alt)',
              border: mode === 'fill_missing'
                ? '1px solid var(--neon-blue-30)'
                : '1px solid var(--border-light)',
            }}
          >
            <input
              type="radio"
              name="mode"
              value="fill_missing"
              checked={mode === 'fill_missing'}
              onChange={() => setMode('fill_missing')}
              className="mt-0.5"
              style={{ accentColor: 'var(--neon-blue)' }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                刮削缺失元数据
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                仅处理刮削未完成、失败或元数据不完整的条目，补全全部元数据信息
              </div>
              <label
                className="flex items-center gap-2 mt-3 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={replaceImagesFill}
                  onChange={(e) => setReplaceImagesFill(e.target.checked)}
                  style={{ accentColor: 'var(--neon-blue)' }}
                />
                <Image size={14} style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  同时替换已有图片（海报/背景/剧照）
                </span>
              </label>
            </div>
          </label>

          {/* 选项2: 覆盖全部 */}
          <label
            className="flex gap-3 p-3 rounded-xl cursor-pointer transition-all"
            style={{
              background: mode === 'overwrite_all' ? 'var(--neon-purple-8)' : 'var(--surface-alt)',
              border: mode === 'overwrite_all'
                ? '1px solid var(--neon-purple-30)'
                : '1px solid var(--border-light)',
            }}
          >
            <input
              type="radio"
              name="mode"
              value="overwrite_all"
              checked={mode === 'overwrite_all'}
              onChange={() => setMode('overwrite_all')}
              className="mt-0.5"
              style={{ accentColor: 'var(--neon-purple)' }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  覆盖全部元数据
                </span>
                <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                强制重新刮削该库所有条目。手动锁定的条目不受影响
              </div>
              <label
                className="flex items-center gap-2 mt-3 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={replaceImagesOverwrite}
                  onChange={(e) => setReplaceImagesOverwrite(e.target.checked)}
                  style={{ accentColor: 'var(--neon-purple)' }}
                />
                <Image size={14} style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  同时替换已有图片（海报/背景/剧照）
                </span>
              </label>
            </div>
          </label>

        </div>

        {/* 底部操作 */}
        <div
          className="flex items-center justify-end gap-3 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-light)' }}
        >
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-xs font-medium rounded-lg transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg transition-all"
            style={{
              background: mode === 'overwrite_all'
                ? 'linear-gradient(135deg, var(--neon-purple), #7C3AED)'
                : 'linear-gradient(135deg, var(--neon-blue), var(--neon-blue-mid))',
              color: 'var(--text-on-neon)',
              boxShadow: mode === 'overwrite_all'
                ? '0 0 12px var(--neon-purple-40)'
                : 'var(--shadow-neon), 0 4px 15px var(--neon-blue-15)',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            执行
          </button>
        </div>
      </div>
    </div>
  )
}