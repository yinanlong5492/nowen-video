import { MediaInfoSection, CastGrid, CollectionCarousel } from '@/components/media'
import FileInfoSection from '@/components/common/FileInfoSection'
import VideoInfoSection from '@/components/common/VideoInfoSection'
import type { Media, Person, FileInfo, VideoStream, PlayInfo } from '@/types'

interface MediaDetailSectionsProps {
  media: Media
  playInfo?: PlayInfo
  persons: Person[]
  fileInfo?: FileInfo
  videoStreams: VideoStream[]
  mediaId?: string
  showCollection?: boolean
}

export function MediaDetailSections({
  media,
  playInfo,
  persons,
  fileInfo,
  videoStreams,
  mediaId,
  showCollection = false,
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

      {/* 合集轮播（仅电影） */}
      {showCollection && mediaId && <CollectionCarousel mediaId={mediaId} />}
    </>
  )
}