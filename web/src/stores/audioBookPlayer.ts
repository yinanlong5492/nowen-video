import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AudioBook, AudioBookChapter } from '@/types'

interface AudioBookPlayerState {
  currentBook: AudioBook | null
  currentChapter: AudioBookChapter | null
  chapters: AudioBookChapter[]
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackRate: number
  sleepTimer: number | null
  sleepTimerEnd: number | null
  pendingSeek: number

  setCurrentBook: (book: AudioBook | null) => void
  setCurrentChapter: (chapter: AudioBookChapter | null) => void
  setChapters: (chapters: AudioBookChapter[]) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setPlaybackRate: (rate: number) => void
  setSleepTimer: (minutes: number | null) => void
  clearSleepTimer: () => void
  clearPendingSeek: () => void

  playBook: (book: AudioBook, chapter?: AudioBookChapter) => void
  playNextChapter: () => void
  playPreviousChapter: () => void
  stopBook: () => void
}

export const useAudioBookPlayerStore = create<AudioBookPlayerState>()(
  persist(
    (set, get) => ({
      currentBook: null,
      currentChapter: null,
      chapters: [],
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playbackRate: 1,
      sleepTimer: null,
      sleepTimerEnd: null,
      pendingSeek: -1,

      setCurrentBook: (book) => set({ currentBook: book, currentTime: 0, duration: 0 }),
      setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
      setChapters: (chapters) => set({ chapters }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      setPlaybackRate: (rate) => set({ playbackRate: rate }),
      setSleepTimer: (minutes) => {
        if (minutes === null) {
          set({ sleepTimer: null, sleepTimerEnd: null })
          return
        }
        set({ sleepTimer: minutes, sleepTimerEnd: Date.now() + minutes * 60 * 1000 })
      },
      clearSleepTimer: () => set({ sleepTimer: null, sleepTimerEnd: null }),
      clearPendingSeek: () => set({ pendingSeek: -1 }),

      playBook: (book, chapter) => {
        set({
          currentBook: book,
          currentChapter: chapter || null,
          isPlaying: true,
          currentTime: book.play_position || 0,
          duration: 0,
          pendingSeek: book.play_position || 0,
        })
      },
      playNextChapter: () => {
        const { currentChapter, chapters, currentBook } = get()
        if (!currentBook || !currentChapter || chapters.length === 0) return
        const idx = chapters.findIndex(c => c.index === currentChapter.index)
        if (idx >= 0 && idx < chapters.length - 1) {
          set({
            currentChapter: chapters[idx + 1],
            currentTime: 0,
            duration: 0,
            pendingSeek: 0,
          })
        }
      },
      playPreviousChapter: () => {
        const { currentChapter, chapters, currentBook } = get()
        if (!currentBook || !currentChapter || chapters.length === 0) return
        const idx = chapters.findIndex(c => c.index === currentChapter.index)
        if (idx > 0) {
          set({
            currentChapter: chapters[idx - 1],
            currentTime: 0,
            duration: 0,
            pendingSeek: 0,
          })
        }
      },
      stopBook: () => {
        set({
          currentBook: null,
          currentChapter: null,
          chapters: [],
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          sleepTimer: null,
          sleepTimerEnd: null,
          pendingSeek: 0,
        })
      },
    }),
    {
      name: 'nowen-audiobook-player',
      partialize: (state) => ({
        currentBook: state.currentBook,
        currentChapter: state.currentChapter,
        currentTime: state.currentTime,
        playbackRate: state.playbackRate,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as any),
        isPlaying: false,
        duration: 0,
        pendingSeek: 0,
      }),
    }
  )
)