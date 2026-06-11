import { MediaInfoSection, CastGrid } from '@/components/media'
import FileInfoSection from '@/components/common/FileInfoSection'
import VideoInfoSection from '@/components/common/VideoInfoSection'
import type { Media, MediaPerson, FileDetail, StreamDetail, MediaPlayInfo } from '@/types'

interface MediaDetailSectionsProps {
  media: Media
  playInfo: MediaPlayInfo | null
  persons: MediaPerson[]
  fileInfo?: FileDetail
  videoStreams: StreamDetail[]
}

export function MediaDetailSections({
  media,
  playInfo,
  persons,
  fileInfo,
  videoStreams,
}: MediaDetailSectionsProps) {
  return (
    <>
      {/* 媒体信息（简介 + 类型 + 演职） */}
      <MediaInfoSection media={media} playInfo={playInfo} />

      {/* 演职人员 */}
      <CastGrid persons={persons} />

      {/* 文件信息 */}
      {fileInfo && (
        <FileInfoSection fileInfo={fileInfo} duration={media.duration} />
      )}

      {/* 视频信息 */}
      {videoStreams.length > 0 && <VideoInfoSection videoStreams={videoStreams} />}
    </>
  )
}