import { useEffect } from 'react'

interface UnmatchConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
}

export function UnmatchConfirmModal({
  open,
  onClose,
  onConfirm,
  title = '解除匹配',
  description = '确定要解除元数据匹配吗？这将清除所有从 TMDb/豆瓣获取的信息。',
}: UnmatchConfirmModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}
      >
        <h3 className="mb-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-medium"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: '#ea580c' }}
          >
            确认解除
          </button>
        </div>
      </div>
    </div>
  )
}
