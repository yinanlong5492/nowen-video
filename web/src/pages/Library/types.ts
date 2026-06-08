import type { Media, Series } from '@/types'

export interface MixedItem {
  type: 'movie' | 'series' | 'music' | 'audiobook'
  media?: Media
  series?: Series
}

export interface LibraryFilterState {
  searchQuery: string
  sortValue: string
  filterGenre: string | null
}

export interface LibraryPaginationState {
  page: number
  size: number
  total: number
}

export type LibraryType = 'video' | 'music' | 'audiobook'