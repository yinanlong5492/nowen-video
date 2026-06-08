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
 
     <main>{children}</main>


  )
}