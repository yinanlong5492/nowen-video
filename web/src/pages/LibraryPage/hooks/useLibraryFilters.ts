import { useState, useMemo } from 'react'
import type { MixedItem } from '@/types'
import { extractGenres, filterAndSortItems, SORT_OPTIONS } from '../utils/libraryHelpers'

interface UseLibraryFiltersReturn {
  searchQuery: string
  sortValue: string
  showSortDropdown: boolean
  filterGenre: string | null
  showFilters: boolean
  allGenres: string[]
  filteredMixed: MixedItem[]
  currentSortLabel: string
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>
  setSortValue: React.Dispatch<React.SetStateAction<string>>
  setShowSortDropdown: React.Dispatch<React.SetStateAction<boolean>>
  setFilterGenre: React.Dispatch<React.SetStateAction<string | null>>
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>
  clearFilters: () => void
}

export function useLibraryFilters(mixedItems: MixedItem[]): UseLibraryFiltersReturn {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortValue, setSortValue] = useState('created_desc')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [filterGenre, setFilterGenre] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // 从混合列表提取类型标签
  const allGenres = useMemo(() => extractGenres(mixedItems), [mixedItems])

  // 筛选和排序后的混合列表
  const filteredMixed = useMemo(() =>
    filterAndSortItems(mixedItems, searchQuery, filterGenre, sortValue),
    [mixedItems, searchQuery, filterGenre, sortValue]
  )

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortValue)?.label || '排序'

  const clearFilters = () => {
    setSearchQuery('')
    setFilterGenre(null)
  }

  return {
    searchQuery,
    sortValue,
    showSortDropdown,
    filterGenre,
    showFilters,
    allGenres,
    filteredMixed,
    currentSortLabel,
    setSearchQuery,
    setSortValue,
    setShowSortDropdown,
    setFilterGenre,
    setShowFilters,
    clearFilters,
  }
}
