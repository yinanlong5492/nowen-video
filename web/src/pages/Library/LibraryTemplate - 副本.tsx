import type { Library } from '@/types'

interface LibraryTemplateProps {
  library: Library
  children: React.ReactNode
}

export function LibraryTemplate({ library, children }: LibraryTemplateProps) {
  const typeLabel = {
    movie: '电影库',
    tvshow: '剧集库',
    mixed: '混合库',
    other: '其他库',
    music: '音乐库',
    audiobook: '有声书库',
  }[library.type] || '视频库'

  return (
    <div
      className="min-h-full rounded-2xl p-6"
      style={{ background: 'var(--bg-surface)' }}
    >
      <header className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {library.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {typeLabel}
        </p>
      </header>

      <main>{children}</main>
    </div>

  )
}