import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { formatDuration } from '@/utils/format'

interface BreadcrumbInfo {
  seriesId: string
  seriesTitle: string
  seasonNum: number
  episodeNum: number
}

interface HeroTitleProps {
  title: string
  subtitle?: string | null
  overview?: string | null
  rating?: number
  year?: number
  duration?: number | null
  genres?: string
  seasonInfo?: string | null
  resolution?: string | null
  videoCodec?: string | null
  logoUrl?: string
  breadcrumb?: BreadcrumbInfo | null
  showRating?: boolean
  showYear?: boolean
  showDuration?: boolean
  showGenres?: boolean
  showSeasonInfo?: boolean
}

export function HeroTitle({
  title,
  subtitle,
  overview,
  rating,
  year,
  duration,
  genres,
  seasonInfo,
  resolution,
  videoCodec,
  logoUrl,
  breadcrumb,
  showRating = true,
  showYear = true,
  showDuration = true,
  showGenres = true,
  showSeasonInfo = true,
}: HeroTitleProps) {
  const [logoError, setLogoError] = useState(false)

  return (
    <>
      {/* 剧集面包屑导航（仅 episode） */}
      {breadcrumb && (
        <Link
          to={`/series/${breadcrumb.seriesId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium transition-colors hover:text-neon"
          style={{ color: 'var(--text-secondary)' }}
        >
          {breadcrumb.seriesTitle}
          <ChevronRightIcon size={14} />
          <span style={{ color: 'var(--neon-blue)' }}>
            第{breadcrumb.seasonNum}季第{breadcrumb.episodeNum}集
          </span>
        </Link>
      )}

      {/* 标题 / Logo */}
      {logoUrl && !logoError ? (
        <div className="mb-1 min-h-[4rem] sm:min-h-[5rem] flex items-center">
          <img
            src={logoUrl}
            alt={title}
            className="max-h-20 sm:max-h-24 w-auto object-contain drop-shadow-lg"
            onError={() => setLogoError(true)}
          />
        </div>
      ) : (
        <h1 className="font-display text-3xl font-bold tracking-wide drop-shadow-lg sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h1>
      )}

      {subtitle && <p className="mt-1.5 text-base" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
      {overview && <p className="mt-1 text-sm italic" style={{ color: 'var(--text-tertiary)' }}>{overview}</p>}

      {/* 霓虹分隔线 */}
      <div className="my-3 h-[2px] w-24 rounded-full" style={{
        background: 'linear-gradient(90deg, var(--neon-blue), var(--neon-purple), transparent)',
        boxShadow: '0 0 8px var(--neon-blue-30)',
      }} />

      {/* 右侧元数据标签 */}
      <div className="ml-auto flex-col items-end gap-1.5 hidden lg:flex">
        <div className="flex flex-wrap items-center gap-2">
          {showRating && rating && rating > 0 && (
            <span className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold text-yellow-400"
              style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.15)' }}
            >
              <Star size={13} fill="currentColor" />
              {rating.toFixed(1)}
            </span>
          )}
          {showYear && year && year > 0 && (
            <span className="rounded-lg px-2.5 py-1 text-sm"
              style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              {year}
            </span>
          )}
          {showDuration && duration && duration > 0 && (
            <span className="rounded-lg px-2.5 py-1 text-sm"
              style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              {formatDuration(duration)}
            </span>
          )}
          {showSeasonInfo && seasonInfo && (
            <span className="rounded-lg px-2.5 py-1 text-sm"
              style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              {seasonInfo}
            </span>
          )}
          {showGenres && genres && (
            genres.split(',').slice(0, 3).map((g) => (
              <Link key={g} to={`/search?q=${encodeURIComponent(g.trim())}`}
                className="rounded-lg px-2.5 py-1 text-sm transition-all duration-200 hover:scale-[1.04] hover:brightness-125 cursor-pointer"
                style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
              >
                {g.trim()}
              </Link>
            ))
          )}
          {resolution && <span className="badge-neon font-bold">{resolution}</span>}
          {videoCodec && <span className="badge-neon">{videoCodec}</span>}
        </div>
      </div>
    </>
  )
}

function ChevronRightIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}