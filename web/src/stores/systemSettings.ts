import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SystemSettings } from '@/types'

interface SystemSettingsState {
  settings: SystemSettings | null
  isLoading: boolean

  setSettings: (settings: SystemSettings) => void
  updateSettings: (partial: Partial<SystemSettings>) => void
  fetchSettings: () => Promise<void>
  resetSettings: () => void
}

const defaultSettings: SystemSettings = {
  enable_gpu_transcode: false,
  gpu_fallback_cpu: true,
  metadata_store_path: '',
  play_cache_path: '',
  enable_direct_link: false,
  auto_preprocess_on_scan: false,
  auto_transcode_on_play: true,
  prefer_direct_play: false,
  library_page_size: 20, // 默认每页20条
}

export const useSystemSettingsStore = create<SystemSettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isLoading: false,

      setSettings: (settings) => set({ settings }),

      updateSettings: (partial) =>
        set((state) => ({
          settings: state.settings ? { ...state.settings, ...partial } : { ...defaultSettings, ...partial },
        })),

      fetchSettings: async () => {
        try {
          set({ isLoading: true })
          const { adminApi } = await import('@/api')
          const res = await adminApi.getSystemSettings()
          // 合并后端数据与现有设置，保留未被后端返回的字段
          set((state) => ({
            settings: { ...state.settings, ...res.data.data }
          }))
        } catch (err) {
          console.error('Failed to fetch system settings:', err)
          // 保持当前设置不变，不重置为默认值
          // 这样可以避免覆盖用户之前设置的值
        } finally {
          set({ isLoading: false })
        }
      },

      resetSettings: () => set({ settings: null }),
    }),
    {
      name: 'nowen-system-settings', // localStorage key
      partialize: (state) => ({ settings: state.settings }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
      }),
    }
  )
)
