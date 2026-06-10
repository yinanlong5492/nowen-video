import { useTranslation } from '@/i18n'
import { Monitor } from 'lucide-react'
import type { StreamDetail } from '@/types'
import InfoItem from './InfoItem'
import { formatCodecName, formatBitRate, getHDRLabel } from '@/utils/videoFormat'

interface VideoInfoSectionProps {
  videoStreams: StreamDetail[]
}

export default function VideoInfoSection({ videoStreams }: VideoInfoSectionProps) {
  const { t } = useTranslation()
  const videoStream = videoStreams[0]

  return (
    <section>
      <h3
        className="mb-4 flex items-center gap-2 font-display text-base font-semibold tracking-wide"
        style={{ color: 'var(--text-primary)' }}
      >
        <Monitor size={16} className="text-neon/60" />
        {t('videoInfo.title')}
      </h3>
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs sm:grid-cols-3 lg:grid-cols-4">
          <InfoItem label={t('videoInfo.codec')} value={formatCodecName(videoStream.codec_name, videoStream.codec_long_name)} />
          <InfoItem label={t('videoInfo.resolution')} value={videoStream.width && videoStream.height ? `${videoStream.width} × ${videoStream.height}` : '-'} highlight />
          <InfoItem label={t('videoInfo.frameRate')} value={videoStream.frame_rate ? `${parseFloat(videoStream.frame_rate).toFixed(2)} fps` : '-'} />
          <InfoItem label={t('videoInfo.bitRate')} value={formatBitRate(videoStream.bit_rate)} />
          {videoStream.bit_depth && <InfoItem label={t('videoInfo.bitDepth')} value={`${videoStream.bit_depth} bit`} />}
          <InfoItem label={t('videoInfo.pixelFormat')} value={videoStream.pix_fmt || '-'} />
          {videoStream.aspect_ratio && <InfoItem label={t('videoInfo.aspectRatio')} value={videoStream.aspect_ratio} />}
          <InfoItem label={t('videoInfo.hdr')} value={getHDRLabel(videoStream)} />
        </div>
      </div>
    </section>
  )
}