import { useEffect, useRef } from 'react'
import { useAudioBookPlayerStore } from '@/stores/audioBookPlayer'
import { getAudioBookStreamUrl } from '@/api'

export default function GlobalAudioBookPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const {
    currentBook,
    currentChapter,
    isPlaying,
    pendingSeek,
    playbackRate,
    sleepTimerEnd,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    clearPendingSeek,
    clearSleepTimer,
    playNextChapter,
  } = useAudioBookPlayerStore()

  useEffect(() => {
    if (!audioRef.current || !currentBook) return

    const audio = audioRef.current
    let url = getAudioBookStreamUrl(currentBook.id)
    if (currentChapter?.file) {
      const chapterFilename = currentChapter.file.split(/[/\\]/).pop() || ''
      url += `&chapter=${encodeURIComponent(chapterFilename)}`
    }

    audio.src = url
    audio.load()

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    }
  }, [currentBook?.id, currentChapter?.index])

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.playbackRate = playbackRate
  }, [playbackRate])

  useEffect(() => {
    if (!audioRef.current) return
    const audio = audioRef.current

    if (isPlaying && audio.paused) {
      audio.play().catch(() => setIsPlaying(false))
    } else if (!isPlaying && !audio.paused) {
      audio.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    if (!audioRef.current || pendingSeek < 0) return
    const audio = audioRef.current

    const handleCanPlay = () => {
      audio.currentTime = pendingSeek
      clearPendingSeek()
      audio.removeEventListener('canplay', handleCanPlay)
    }

    if (audio.readyState >= 2) {
      audio.currentTime = pendingSeek
      clearPendingSeek()
    } else {
      audio.addEventListener('canplay', handleCanPlay)
    }

    return () => {
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [pendingSeek])

  useEffect(() => {
    if (!sleepTimerEnd) return
    const check = setInterval(() => {
      if (Date.now() >= sleepTimerEnd) {
        setIsPlaying(false)
        clearSleepTimer()
      }
    }, 1000)
    return () => clearInterval(check)
  }, [sleepTimerEnd])

  useEffect(() => {
    if (!audioRef.current) return
    const audio = audioRef.current

    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleEnded = () => {
      setIsPlaying(false)
      playNextChapter()
    }
    const handleError = () => setIsPlaying(false)

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [setIsPlaying, setCurrentTime, setDuration, playNextChapter])

  return <audio ref={audioRef} />
}