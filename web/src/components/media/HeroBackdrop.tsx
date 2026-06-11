import { useState } from 'react'
import clsx from 'clsx'

interface HeroBackdropProps {
  posterUrl: string
  backdropUrl: string
  onImgLoad?: () => void
}

export function HeroBackdrop({ posterUrl, backdropUrl, onImgLoad }: HeroBackdropProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [backdropError, setBackdropError] = useState(false)

  const handleLoad = () => {
    setImgLoaded(true)
    onImgLoad?.()
  }

  return (
    <div className="relative h-[420px] min-h-[420px] sm:h-[80vh] overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute inset-0" style={{ background: 'var(--bg-surface)' }}>
        {/* 模糊背景图 */}
        <img
          src={posterUrl}
          alt=""
          className="h-full w-full object-cover opacity-15 blur-2xl scale-110"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        {/* 主要背景图 */}
        {!backdropError && (
          <img
            src={backdropUrl}
            alt=""
            loading="lazy"
            className={clsx(
              'absolute inset-0 h-full w-full object-cover transition-all duration-1000',
              imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            )}
            onLoad={handleLoad}
            onError={() => { setBackdropError(true); setImgLoaded(true) }}
          />
        )}
      </div>
      <div className="absolute inset-0 gradient-overlay" />
    </div>
  )
}