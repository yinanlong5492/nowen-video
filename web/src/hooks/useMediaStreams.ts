import { useMemo } from 'react'
import { getVideoStreams, getAudioStreams } from '@/utils/mediaHelpers'
import type { Stream, VideoStream, AudioStream } from '@/types'

interface UseMediaStreamsReturn {
  videoStreams: VideoStream[]
  audioStreams: AudioStream[]
}

export function useMediaStreams(streams: Stream[] | undefined): UseMediaStreamsReturn {
  const videoStreams = useMemo(() => getVideoStreams(streams || []), [streams])
  const audioStreams = useMemo(() => getAudioStreams(streams || []), [streams])

  return { videoStreams, audioStreams }
}