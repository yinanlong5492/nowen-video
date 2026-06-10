export function formatCodecName(codec?: string, longName?: string): string {
  if (!codec) return '-'
  return longName || codec.toUpperCase()
}

export function formatBitRate(bitRate?: string): string {
  if (!bitRate) return '-'
  const num = parseInt(bitRate)
  if (isNaN(num)) return bitRate
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)} Mbps`
  if (num >= 1000) return `${(num / 1000).toFixed(0)} Kbps`
  return `${num} bps`
}

export function getHDRLabel(stream: { color_transfer?: string; video_range?: string }): string {
  if (!stream) return 'SDR'
  const transfer = stream.color_transfer?.toLowerCase() || ''
  if (transfer === 'smpte2084' || transfer === 'smpte 2084') return 'HDR10 (PQ)'
  if (transfer === 'arib-std-b67' || transfer === 'hlg') return 'HLG'
  if (transfer === 'smpte2094' || transfer === 'smpte 2094') return 'HDR10+'
  if (stream.video_range === 'HDR') return 'HDR'
  if (stream.video_range === 'DOVI') return 'Dolby Vision'
  return 'SDR'
}
