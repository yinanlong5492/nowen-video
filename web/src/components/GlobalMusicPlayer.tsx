import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useMusicPlayerStore } from '@/stores/musicPlayer'

export default function GlobalMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const { currentTrack, isPlaying, setIsPlaying, playNext, setCurrentTime, setDuration, isLoop, setCurrentTrack } = useMusicPlayerStore()
  const startTimeRef = useRef(0)
  const endTimeRef = useRef(0)
  const isVirtualTrackRef = useRef(false)

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return

    const audio = audioRef.current
    const token = useAuthStore.getState().token
    const src = `/api/music/tracks/${currentTrack.id}/stream?token=${token}`

    // 设置虚拟曲目的时间范围
    isVirtualTrackRef.current = currentTrack.is_virtual || false
    startTimeRef.current = currentTrack.start_time || 0
    endTimeRef.current = currentTrack.end_time || 0

    // 如果有 endTime，就使用 endTime - startTime 作为显示的时长
    if (endTimeRef.current > 0) {
      setDuration(endTimeRef.current - startTimeRef.current)
    } else {
      setDuration(currentTrack.duration || 0)
    }

    if (audio.src !== src) {
      audio.src = src
      audio.load()
    }

    // 如果是虚拟曲目，设置起始时间
    if (isVirtualTrackRef.current && startTimeRef.current > 0) {
      audio.currentTime = startTimeRef.current
    }

    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false)
      })
    } else {
      audio.pause()
    }
  }, [currentTrack, isPlaying, setIsPlaying, setDuration])

  useEffect(() => {
    if (!audioRef.current) return

    const audio = audioRef.current

    const handlePause = () => setIsPlaying(false)
    const handlePlay = () => setIsPlaying(true)
    const handleEnded = () => {
      if (isLoop) {
        // 单曲循环：从头播放
        if (isVirtualTrackRef.current && startTimeRef.current > 0) {
          audio.currentTime = startTimeRef.current
        } else {
          audio.currentTime = 0
        }
        audio.play().catch(() => {
          setIsPlaying(false)
        })
      } else {
        // 不是单曲循环，播放下一首
        playNext()
      }
    }
    
    const handleTimeUpdate = () => {
      // 如果是虚拟曲目，检查是否播放到结束时间
      if (isVirtualTrackRef.current && endTimeRef.current > 0) {
        const currentAbsoluteTime = audio.currentTime
        if (currentAbsoluteTime >= endTimeRef.current) {
          if (isLoop) {
            // 单曲循环：重新开始
            audio.currentTime = startTimeRef.current
            audio.play().catch(() => {
              setIsPlaying(false)
            })
          } else {
            // 到达结束时间，跳转到下一首
            audio.pause()
            playNext()
          }
          return
        }
        
        // 显示相对于起始时间的进度
        const relativeTime = currentAbsoluteTime - startTimeRef.current
        setCurrentTime(Math.max(0, relativeTime))
      } else {
        // 普通曲目
        setCurrentTime(audio.currentTime)
      }
    }
    
    const handleLoadedMetadata = () => {
      if (isVirtualTrackRef.current && endTimeRef.current > 0) {
        // 如果是虚拟曲目，使用我们自己计算的时长
        setDuration(endTimeRef.current - startTimeRef.current)
      } else {
        setDuration(audio.duration)
      }
    }

    const handleSeeked = () => {
      // 如果是虚拟曲目，将用户的 seek 转换为绝对时间
      if (isVirtualTrackRef.current) {
        // const relativeTime = audio.currentTime
        // 这里的逻辑需要额外处理，不过现在先简化处理
      }
    }

    const handleError = () => {
      const err = audio.error
      if (!err) return
      if (err.code === MediaError.MEDIA_ERR_NETWORK || err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        setCurrentTrack(null)
        setIsPlaying(false)
      }
    }

    audio.addEventListener('pause', handlePause)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('seeked', handleSeeked)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('seeked', handleSeeked)
      audio.removeEventListener('error', handleError)
    }
  }, [setIsPlaying, playNext, setCurrentTime, setDuration, isLoop, setCurrentTrack])

  // 暴露 seek 方法
  useEffect(() => {
    (window as any).seekMusic = (time: number) => {
      if (audioRef.current) {
        if (isVirtualTrackRef.current) {
          // 虚拟曲目，将相对时间转换为绝对时间
          audioRef.current.currentTime = startTimeRef.current + time
        } else {
          audioRef.current.currentTime = time
        }
      }
    }
  }, [])

  return <audio ref={audioRef} />
}
