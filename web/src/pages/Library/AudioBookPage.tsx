import AudioBookPlayer from '@/components/AudioBookPlayer'
import type { Library } from '@/types'

interface AudioBookPageProps {
  library: Library
}

export function AudioBookPage({ library }: AudioBookPageProps) {
  return <AudioBookPlayer libraryId={library.id} libraryName={library.name} />
}