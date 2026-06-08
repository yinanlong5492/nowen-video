import { useState, useMemo, useCallback } from 'react'
import type { MixedItem } from '@/types'

export function useLibraryFilter(initialItems: MixedItem[]) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortValue, setSortValue] = useState('created_desc')
  const [filterGenre, setFilterGenre] = useState<string | null>(null)

  const filteredItems = useMemo(() => {
    let result = [...initialItems]

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(item => {
        const title = item.media?.title?.toLowerCase() || item.series?.title?.toLowerCase() || ''
        const origTitle = item.media?.orig_title?.toLowerCase() || ''
        return title.includes(query) || origTitle.includes(query)
      })
    }

    // 类型筛选
    if (filterGenre) {
      result = result.filter(item => {
        const genres = item.media?.genres || item.series?.genres || ''
        // genres 是逗号分隔的字符串
        return genres.split(',').some(g => g.trim() === filterGenre)
      })
    }

    // 排序
    result.sort((a, b) => {
      const getValue = (item: MixedItem) => {
        switch (sortValue) {
          case 'created_desc':
            return item.media?.created_at || item.series?.created_at || ''
          case 'created_asc':
            return item.media?.created_at || item.series?.created_at || ''
          case 'title_asc':
            return (item.media?.title || item.series?.title || '').toLowerCase()
          case 'title_desc':
            return (item.media?.title || item.series?.title || '').toLowerCase()
          case 'year_desc':
            return item.media?.year || item.series?.year || 0
          case 'year_asc':
            return item.media?.year || item.series?.year || 0
          case 'rating_desc':
            return item.media?.rating || item.series?.rating || 0
          default:
            return ''
        }
      }

      const valA = getValue(a)
      const valB = getValue(b)

      if (sortValue.includes('_asc')) {
        return String(valA).localeCompare(String(valB))
      }
      return String(valB).localeCompare(String(valA))
    })

    return result
  }, [initialItems, searchQuery, sortValue, filterGenre])

  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setSortValue('created_desc')
    setFilterGenre(null)
  }, [])

  return {
    searchQuery,
    sortValue,
    filterGenre,
    filteredItems,
    setSearchQuery,
    setSortValue,
    setFilterGenre,
    resetFilters,
  }
}