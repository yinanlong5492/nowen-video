import { X, AlertTriangle } from 'lucide-react'

interface UnmatchModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  type?: 'media' | 'series' | 'episode'
}

export function UnmatchModal({
  open,
  onClose,
  onConfirm,
  type = 'media',
}: UnmatchModalProps) {
  if (!open) return null

  const title = {
    media: '解除匹配电影',
    series: '解除匹配剧集',
    episode: '解除匹配剧集',
  }[type]

  const description = `确定要解除此${type === 'media' ? '电影' : '剧集'}的元数据匹配吗？这将清除所有从 TMDb/豆瓣获取的信息（简介、海报、评分等），但保留原始的${type === 'media' ? '电影' : '剧集'}名称。`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'rgba(251,146,60,0.1)' }}>
              <AlertTriangle size={20} style={{ color: '#FB923C' }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>
        
        <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #FB923C, #F57C00)', color: '#fff' }}
          >
            确认解除匹配
          </button>
        </div>
      </div>
    </div>
  )
}