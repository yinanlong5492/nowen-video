import clsx from 'clsx'

interface FilterBarProps {
  show: boolean
  genres: string[]
  selectedGenre: string | null
  onGenreSelect: (genre: string | null) => void
}

export default function FilterBar({ show, genres, selectedGenre, onGenreSelect }: FilterBarProps) {
  if (!show || genres.length === 0) return null

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl p-3 animate-slide-up"
      style={{
        background: 'var(--nav-hover-bg)',
        border: '1px solid var(--border-default)',
      }}
    >
      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
        类型:
      </span>
      <button
        onClick={() => onGenreSelect(null)}
        className={clsx(
          'rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
          !selectedGenre && 'text-neon'
        )}
        style={{
          background: !selectedGenre ? 'var(--nav-active-bg)' : 'transparent',
          border: `1px solid ${!selectedGenre ? 'var(--border-hover)' : 'transparent'}`,
          color: selectedGenre ? 'var(--text-secondary)' : undefined,
        }}
      >
        全部
      </button>
      {genres.map((genre) => (
        <button
          key={genre}
          onClick={() => onGenreSelect(selectedGenre === genre ? null : genre)}
          className={clsx(
            'rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
            selectedGenre === genre && 'text-neon'
          )}
          style={{
            background: selectedGenre === genre ? 'var(--nav-active-bg)' : 'transparent',
            border: `1px solid ${selectedGenre === genre ? 'var(--border-hover)' : 'transparent'}`,
            color: selectedGenre !== genre ? 'var(--text-secondary)' : undefined,
          }}
        >
          {genre}
        </button>
      ))}
    </div>
  )
}
