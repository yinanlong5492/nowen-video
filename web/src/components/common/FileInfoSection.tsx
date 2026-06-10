import { useTranslation } from '@/i18n'
import { FileText } from 'lucide-react'
import { formatSize, formatDuration, formatDate } from '@/utils/format'
import type { FileDetail } from '@/types'
import InfoItem from './InfoItem'

interface FileInfoSectionProps {
  fileInfo: FileDetail
  duration: number
}

export default function FileInfoSection({ fileInfo, duration }: FileInfoSectionProps) {
  const { t } = useTranslation()

  return (
    <section>
      <h3
        className="mb-4 flex items-center gap-2 font-display text-base font-semibold tracking-wide"
        style={{ color: 'var(--text-primary)' }}
      >
        <FileText size={16} className="text-neon/60" />
        {t('mediaInfo.fileInfo')}
      </h3>
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}
      >
        <div className="mb-3 flex items-start gap-3">
          <span className="shrink-0 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('mediaInfo.filePath')}</span>
          <code className="flex-1 truncate text-xs" style={{ color: 'var(--text-secondary)' }} title={fileInfo.file_dir + '/' + fileInfo.file_name}>
            {fileInfo.file_dir + '/' + fileInfo.file_name}
          </code>
        </div>
        <div className="grid grid-cols-5 gap-x-4 gap-y-2 text-xs">
          <InfoItem label={t('fileInfo.fileSize')} value={formatSize(fileInfo.file_size)} highlight />
          <InfoItem label={t('fileInfo.createdAt')} value={formatDate(fileInfo.created_at)} />
          <InfoItem label={t('fileInfo.modifiedAt')} value={formatDate(fileInfo.modified_at)} />
          <InfoItem label={t('mediaInfo.runtime')} value={formatDuration(duration)} />
          <InfoItem label={t('fileInfo.fileExt')} value={fileInfo.file_ext.replace('.', '').toUpperCase()} />
        </div>
        {fileInfo.md5 && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-default)' }}>
            <div className="flex items-start gap-3 text-xs">
              <span className="shrink-0 font-medium" style={{ color: 'var(--text-muted)' }}>{t('fileInfo.md5')}</span>
              <code className="break-all font-mono" style={{ color: 'var(--text-secondary)' }}>{fileInfo.md5}</code>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}