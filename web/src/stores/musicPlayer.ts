import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MusicTrack } from '@/types'

type PlayMode = 'sequential' | 'shuffle'

interface MusicPlayerState {
  currentTrack: MusicTrack | null
  isPlaying: boolean
  playQueue: MusicTrack[]
  playMode: PlayMode
  isLoop: boolean
  currentTime: number
  duration: number
  setCurrentTrack: (track: MusicTrack | null) => void
  setIsPlaying: (playing: boolean) => void
  setPlayQueue: (queue: MusicTrack[]) => void
  setPlayMode: (mode: PlayMode) => void
  setIsLoop: (loop: boolean) => void
  toggleLoop: () => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  playTrack: (track: MusicTrack, queue?: MusicTrack[]) => void
  playNext: () => void
  playPrevious: () => void
  removeFromQueue: (index: number) => void
  addToQueue: (track: MusicTrack) => void
  addAlbumToQueue: (tracks: MusicTrack[]) => void
  clearQueue: () => void
}

export const useMusicPlayerStore = create<MusicPlayerState>()(
  persist(
    (set, get) => ({
  currentTrack: null,
  isPlaying: false,
  playQueue: [],
  playMode: 'sequential',
  isLoop: false,
  currentTime: 0,
  duration: 0,

  setCurrentTrack: (track) => set({ currentTrack: track, currentTime: 0, duration: 0 }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlayQueue: (queue) => set({ playQueue: queue }),
  setPlayMode: (mode) => set({ playMode: mode }),
  setIsLoop: (loop) => set({ isLoop: loop }),
  toggleLoop: () => set(state => ({ isLoop: !state.isLoop })),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration: duration }),

  playTrack: (track, queue) => {
    if (queue) {
      set({ currentTrack: track, playQueue: queue, isPlaying: true, currentTime: 0, duration: 0 })
    } else {
      set({ currentTrack: track, isPlaying: true, currentTime: 0, duration: 0 })
    }
  },

  playNext: () => {
    const { currentTrack, playQueue, playMode, isLoop } = get()
    if (!currentTrack || playQueue.length === 0) return

    if (isLoop) {
      set({ currentTime: 0 })
      return
    }

    const currentIndex = playQueue.findIndex(t => t.id === currentTrack.id)
    if (currentIndex === -1) {
      set({ currentTrack: playQueue[0], isPlaying: true, currentTime: 0, duration: 0 })
      return
    }

    if (playMode === 'shuffle') {
      let nextIndex: number
      do {
        nextIndex = Math.floor(Math.random() * playQueue.length)
      } while (nextIndex === currentIndex && playQueue.length > 1)
      set({ currentTrack: playQueue[nextIndex], isPlaying: true, currentTime: 0, duration: 0 })
    } else {
      if (currentIndex < playQueue.length - 1) {
        set({ currentTrack: playQueue[currentIndex + 1], isPlaying: true, currentTime: 0, duration: 0 })
      }
    }
  },

  playPrevious: () => {
    const { currentTrack, playQueue, isLoop } = get()
    if (!currentTrack || playQueue.length === 0) return

    if (isLoop) {
      set({ currentTime: 0 })
      return
    }

    const currentIndex = playQueue.findIndex(t => t.id === currentTrack.id)
    if (currentIndex > 0) {
      set({ currentTrack: playQueue[currentIndex - 1], isPlaying: true, currentTime: 0, duration: 0 })
    }
  },

  removeFromQueue: (index) => {
    const { playQueue } = get()
    set({
      playQueue: playQueue.filter((_, i) => i !== index)
    })
  },

  addToQueue: (track) => {
    const { playQueue } = get()
    if (!playQueue.find(t => t.id === track.id)) {
      set({ playQueue: [...playQueue, track] })
    }
  },

  addAlbumToQueue: (tracks) => {
    const { playQueue } = get()
    const newTracks = tracks.filter(t => !playQueue.find(pt => pt.id === t.id))
    set({ playQueue: [...playQueue, ...newTracks] })
  },

  clearQueue: () => set({ playQueue: [] })
}),
    {
      name: 'nowen-music-player',
      partialize: (state) => ({
        currentTrack: state.currentTrack,
        playQueue: state.playQueue,
        playMode: state.playMode,
        isLoop: state.isLoop,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as any),
        isPlaying: false,
        currentTime: 0,
        duration: 0,
      }),
    }
  )
)
