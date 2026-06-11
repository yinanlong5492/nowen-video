import { Link } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import type { Library } from '@/types'

interface LibraryWithCovers extends Library {
  coverUrls: string[]
}

interface LibraryGridProps {
  libraries: LibraryWithCovers[]
}

export default function LibraryGrid({ libraries }: LibraryGridProps) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
        我的媒体库
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {libraries.map((lib) => (
          <Link
            key={lib.id}
            to={`/library/${lib.id}`}
            className="group flex flex-col overflow-hidden rounded-xl transition-all duration-300"
          >
            <div className="relative flex flex-1 aspect-[16/9] overflow-hidden rounded-xl" style={{ background: 'var(--bg-surface)' }}>
              {lib.coverUrls.length > 0 ? (
                lib.coverUrls.map((url, index) => (
                  <div
                    key={index}
                    className={`flex-1 min-w-0 overflow-hidden ${index === 0 ? 'rounded-xl' : ''} ${index === lib.coverUrls.length - 1 ? 'rounded-xl' : ''}`}
                  >
                    <img
                      src={url}
                      alt=""
                      className={`h-full w-full max-w-full max-h-full object-cover transition-transform duration-500 group-hover:scale-105 ${index === 0 ? 'rounded-xl' : ''} ${index === lib.coverUrls.length - 1 ? 'rounded-xl' : ''}`}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                ))
              ) : (
                <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex flex-col items-center gap-2">
                    <FolderOpen size={32} />
                    <span className="text-xs text-center">{lib.name}</span>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/50">
                <span className="text-2xl font-bold text-white drop-shadow-lg">{lib.name}</span>
              </div>
            </div>
            <div className="p-2.5">
              <div className="truncate text-sm font-medium text-center align-middle transition-colors text-theme-primary group-hover:text-neon">
                {lib.name}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
