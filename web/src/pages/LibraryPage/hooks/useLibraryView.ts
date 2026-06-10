import { useState } from 'react'

type ViewMode = 'grid' | 'list'

interface UseLibraryViewReturn {
  viewMode: ViewMode
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>
}

export function useLibraryView(): UseLibraryViewReturn {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  return {
    viewMode,
    setViewMode,
  }
}
