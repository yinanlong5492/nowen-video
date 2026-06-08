import { Share2, RefreshCw, Link2, Unlink, Pencil, Trash2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useToast } from '@/components/Toast'

interface MediaCardMenuProps {
  show: boolean
  position: { top: number; left: number }
  isAdmin: boolean
  isSeries: boolean
  currentId: string
  detailUrl: string
  onClose: () => void
  onManualMatch?: (id: string) => void
  onUnmatch?: (id: string) => void
  onRefreshMetadata?: (id: string) => void
  onEditMetadata?: (id: string) => void
  onDelete?: (id: string) => void
}

export function MediaCardMenu({
  show,
  position,
  isAdmin,
  isSeries,
  currentId,
  detailUrl,
  onClose,
  onManualMatch,
  onUnmatch,
  onRefreshMetadata,
  onEditMetadata,
  onDelete,
}: MediaCardMenuProps) {
  const toast = useToast()
  const navigate = () => {
    // 导航逻辑由父组件处理，这里只是关闭菜单
    onClose()
  }

  const handleShare = () => {
    const url = `${window.location.origin}${detailUrl}`
    navigator.clipboard.writeText(url)
      .then(() => toast.success('链接已复制'))
      .catch(() => toast.error('复制失败'))
    onClose()
  }

  if (!show) return null

  return createPortal(
    <div>
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
              {isSeries ? '剧集管理' : '媒体管理'}
            </div>
            <button
              onClick={() => { onClose(); onManualMatch ? onManualMatch(currentId) : navigate() }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Link2 size={14} />
              手动匹配{isSeries ? '剧集' : '影片'}
            </button>
            <button
              onClick={() => { onClose(); onUnmatch ? onUnmatch(currentId) : navigate() }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Unlink size={14} />
              解除匹配{isSeries ? '剧集' : '影片'}
            </button>
            <button
              onClick={() => { onClose(); onRefreshMetadata ? onRefreshMetadata(currentId) : navigate() }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <RefreshCw size={14} />
              刷新元数据
            </button>
            <button
              onClick={() => { onClose(); onEditMetadata ? onEditMetadata(currentId) : navigate() }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-neon-blue/5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Pencil size={14} />
              编辑元数据
            </button>
            <button
              onClick={() => { onClose(); onDelete ? onDelete(currentId) : navigate() }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 size={14} />
              删除{isSeries ? '剧集' : '影片'}
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
    </div>,
    document.body
  )
}