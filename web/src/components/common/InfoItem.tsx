interface InfoItemProps {
  label: string
  value: string
  highlight?: boolean
}

export default function InfoItem({ label, value, highlight }: InfoItemProps) {
  return (
    <div className="flex items-start gap-2">
      <span className="shrink-0 font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="truncate font-semibold" style={{ color: highlight ? 'var(--neon-blue)' : 'var(--text-primary)' }} title={value}>
        {value}
      </span>
    </div>
  )
}