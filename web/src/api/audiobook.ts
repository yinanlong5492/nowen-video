import api from './client'
import { withToken } from './stream'
import type {
  AudioBook,
  AudioBookChapter,
  PaginatedResponse,
  XimalayaSearchResult,
} from '@/types'

export const audiobookApi = {
  list: (params: { library_id?: string; page?: number; size?: number }) =>
    api.get<PaginatedResponse<AudioBook>>('/audiobooks', { params }),

  detail: (id: string) =>
    api.get<{ data: AudioBook }>(`/audiobooks/${id}`),

  update: (id: string, data: Record<string, unknown>) =>
    api.put<{ data: AudioBook; message: string }>(`/audiobooks/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/audiobooks/${id}`),

  getChapters: (id: string) =>
    api.get<{ data: AudioBookChapter[] }>(`/audiobooks/${id}/chapters`),

  updatePlayPosition: (id: string, position: number) =>
    api.put<{ message: string }>(`/audiobooks/${id}/position`, { position }),

  search: (params: { q: string; page?: number; size?: number }) =>
    api.get<PaginatedResponse<AudioBook>>('/audiobooks/search', { params }),

  scrape: (id: string) =>
    api.post<{ message: string }>(`/audiobooks/${id}/scrape`),

  scrapeById: (id: string, ximalayaId: number) =>
    api.post<{ message: string }>(`/audiobooks/${id}/scrape-by-id`, { ximalaya_id: ximalayaId }),

  searchXimalaya: (params: { q: string; page?: number }) =>
    api.get<{ data: XimalayaSearchResult[]; total: number; page: number }>('/audiobooks/search-ximalaya', { params }),

  scrapeAll: (libraryId: string) =>
    api.post<{ message: string }>(`/audiobooks/library/${libraryId}/scrape-all`),
}

export function getAudioBookStreamUrl(id: string): string {
  return withToken(`/api/audiobooks/${id}/stream`)
}

export function getAudioBookCoverUrl(id: string): string {
  return withToken(`/api/audiobooks/${id}/cover`)
}
