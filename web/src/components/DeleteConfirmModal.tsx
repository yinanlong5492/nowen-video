import { useState } from 'react'
import { Trash2 } from 'lucide-react'

interface DeleteConfirmModalProps {
  open: boolean
  title: string
  description: string
  hint: string
  onClose: () => void
  onDelete: (deleteFiles: boolean) => Promise<void>
}

export default function DeleteConfirmModal({
  open,
  title,
  description,
  hint,
  onClose,
  onDelete,
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async (deleteFiles: boolean) => {
    setLoading(true)
    try {
      await onDelete(deleteFiles)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
            <Trash2 size={20} className="text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-red-400">{title}</h3>
        </div>
        <p className="mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
        <p className="mb-6 text-xs" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            取消
          </button>
          <button
            onClick={() => handleDelete(true)}
            disabled={loading}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            {loading ? '处理中...' : '移除并删除文件'}
          </button>
          <button
            onClick={() => handleDelete(false)}
            disabled={loading}
            className="rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            {loading ? '处理中...' : '仅从媒体库移除'}
          </button>
        </div>
      </div>
    </div>
  )
}
