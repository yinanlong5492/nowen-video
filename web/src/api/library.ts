import api from './client'
import type {
  Library,
  CreateLibraryRequest,
  ListResponse,
} from '@/types'

// ==================== 媒体库 ====================
export const libraryApi = {
  list: (params?: { sort?: string; sort_order?: string }) =>
    api.get<ListResponse<Library>>('/libraries', { params }),

  create: (data: CreateLibraryRequest) =>
    api.post<{ data: Library }>('/libraries', data),

  update: (id: string, data: Partial<CreateLibraryRequest>) =>
    api.put<{ data: Library }>(`/libraries/${id}`, data),

  scan: (id: string) =>
    api.post(`/libraries/${id}/scan`),

  refreshMetadata: (id: string, mode: string, replaceImages: boolean) =>
    api.post(`/libraries/${id}/refresh-metadata`, { mode, replace_images: replaceImages }),

  reindex: (id: string) =>
    api.post(`/libraries/${id}/reindex`),

  delete: (id: string) =>
    api.delete(`/libraries/${id}`),
}
