import { Film, SearchX, FolderX } from 'lucide-react'

type EmptyType = 'default' | 'search' | 'not-found'

interface LibraryEmptyProps {
  type?: EmptyType
}

export function LibraryEmpty({ type = 'default' }: LibraryEmptyProps) {
  const configs = {
    default: {
      icon: Film,
      title: '此媒体库暂无内容',
      description: '',
    },
    search: {
      icon: SearchX,
      title: '没有找到匹配的内容',
      description: '尝试调整搜索条件或筛选条件',
    },
    'not-found': {
      icon: FolderX,
      title: '媒体库不存在',
      description: '请检查媒体库ID是否正确',
    },
  }

  const config = configs[type]
  const Icon = config.icon

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Icon size={48} className="mb-4" style={{ color: 'var(--text-tertiary)' }} />
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        {config.title}
      </p>
      {config.description && (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {config.description}
        </p>
      )}
    </div>
  )
}