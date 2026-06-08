export const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const formatDurationDetail = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m > 0) {
    return `${m}分${s}秒`
  }
  return `${s}秒`
}

export const formatDurationShort = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 1) return '刚刚'
  if (diffHours < 24) return `${Math.floor(diffHours)}小时前`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN')
}

export const formatProgress = (position: number, duration: number) => {
  if (!duration || duration <= 0) return 0
  return Math.round((position / duration) * 100)
}

export const formatTime = (sec: number) => {
  if (!Number.isFinite(sec) || sec < 0) return '00:00'
  const s = Math.floor(sec % 60)
  const m = Math.floor((sec / 60) % 60)
  const h = Math.floor(sec / 3600)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}