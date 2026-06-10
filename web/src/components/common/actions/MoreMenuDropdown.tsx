import { createPortal } from 'react-dom'
import { Link2, Unlink, RefreshCw, Pencil, Trash2, Share2 } from 'lucide-react'
import { useToast } from '@/components/Toast'

export type ContentType = 'movie' | 'series' | 'season' | 'episode'

interface MoreMenuDropdownProps {
  isOpen: boolean
  onClose: () => void
  position: { top: number; left: number }
  detailTo: string
  isAdmin: boolean
  contentType?: ContentType
  onManualMatch?: () => void
  onUnmatch?: () => void
  onRefresh?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function MoreMenuDropdown({
  isOpen,
  onClose,
  position,
  detailTo,
  isAdmin,
  contentType = 'movie',
  onManualMatch,
  onUnmatch,
  onRefresh,
  onEdit,
  onDelete,
}: MoreMenuDropdownProps) {
  const toast = useToast()

  if (!isOpen) return null

  const handleShare = () => {
    onClose()
    const url = `${window.location.origin}${detailTo}`
    navigator.clipboard.writeText(url)
      .then(() => toast.success('链接已复制'))
      .catch(() => toast.error('复制失败'))
  }

  const handleAction = (action?: () => void) => {
    onClose()
    action?.()
  }

  // 根据内容类型获取对应的文本
  const contentTypeLabels: Record<ContentType, { title: string; delete: string; refresh: string; edit: string; match: string; unmatch: string }> = {
    movie: {
      title: '管理电影',
      delete: '删除影片',
      refresh: '刷新元数据',
      edit: '编辑元数据',
      match: '手动匹配',
      unmatch: '解除匹配',
    },
    series: {
      title: '管理剧集',
      delete: '删除剧集',
      refresh: '刷新元数据',
      edit: '编辑元数据',
      match: '手动匹配',
      unmatch: '解除匹配',
    },
    season: {
      title: '管理本季',
      delete: '删除本季',
      refresh: '刷新元数据',
      edit: '编辑元数据',
      match: '手动匹配',
      unmatch: '解除匹配',
    },
    episode: {
      title: '管理本集',
      delete: '删除本集',
      refresh: '刷新元数据',
      edit: '编辑元数据',
      match: '手动匹配',
      unmatch: '解除匹配',
    },
  }

  const labels = contentTypeLabels[contentType]

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 min-w-[200px] rounded-xl py-1 shadow-2xl"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(20px)',
          top: position.top,
          left: position.left,
          transform: 'translateX(-50%)',
        }}
      >
        {isAdmin && (
          <>
            <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {labels.title}
            </div>
            <button
              onClick={() => handleAction(onManualMatch)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Link2 size={14} />
              {labels.match}
            </button>
            <button
              onClick={() => handleAction(onUnmatch)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Unlink size={14} />
              {labels.unmatch}
            </button>
            <button
              onClick={() => handleAction(onRefresh)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <RefreshCw size={14} />
              {labels.refresh}
            </button>
            <button
              onClick={() => handleAction(onEdit)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Pencil size={14} />
              {labels.edit}
            </button>
            <button
              onClick={() => handleAction(onDelete)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
            >
              <Trash2 size={14} />
              {labels.delete}
            </button>
            <div className="my-1 mx-3 h-px" style={{ background: 'var(--border-default)' }} />
          </>
        )}
        <button
          onClick={handleShare}
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Share2 size={14} />
          分享链接
        </button>
      </div>
    </>,
    document.body
  )
}
