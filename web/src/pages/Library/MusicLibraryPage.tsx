import MusicPlayer from '@/components/MusicPlayer'
import type { Library } from '@/types'

interface MusicLibraryPageProps {
  library: Library
}

export function MusicLibraryPage({ library }: MusicLibraryPageProps) {
  // 音乐库直接渲染播放器组件
  return <MusicPlayer libraryId={library.id} libraryName={library.name} />
}