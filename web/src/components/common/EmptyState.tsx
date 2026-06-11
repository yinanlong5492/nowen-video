interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  className?: string
}

export function EmptyState({ icon, title, description, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center ${className}`}>
      {icon && <div className="mb-4">{icon}</div>}
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        {title}
      </p>
      {description && (
        <p className="text-xs mt-2 opacity-70" style={{ color: 'var(--text-tertiary)' }}>
          {description}
        </p>
      )}
    </div>
  )
}
