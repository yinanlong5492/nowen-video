import { useState, useEffect, useCallback, memo } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { streamApi } from '@/api'
import { useTranslation } from '@/i18n'
import type { Media, MediaPlayInfo, Playlist, WatchHistory, SubtitleTrack, StreamDetail, Series } from '@/types'
import { formatDuration } from '@/utils/format'
import { HeroBackdrop } from './HeroBackdrop'
import { HeroActions } from './HeroActions'
import { HeroSubtitleSelector } from './HeroSubtitleSelector'
import { HeroAudioSelector } from './HeroAudioSelector'
import { HeroSeasonLayout } from './HeroSeasonLayout'

export type HeroSectionVariant = 'media' | 'series' | 'season'

function ChevronRightIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

interface HeroSectionCommonProps {
  variant: HeroSectionVariant
  isFavorited: boolean
  isWatched?: boolean
  scraping?: boolean
  isAdmin: boolean
  posterVersion?: number
  playlists?: Playlist[]
  onFavorite: () => void
  onMarkWatched?: () => void
  onAddToPlaylist?: (playlistId: string) => void
  onManualMatch?: () => void
  onUnmatch?: () => void
  onRefreshMetadata?: () => void
  onEditMetadata?: () => void
  onDelete?: () => void
  showMoreMenu?: boolean
  showPlaylistMenu?: boolean
  onToggleMoreMenu?: () => void
  onTogglePlaylistMenu?: () => void
}

interface HeroSectionMediaProps extends HeroSectionCommonProps {
  variant: 'media'
  media: Media
  playInfo?: MediaPlayInfo | null
  watchProgress?: WatchHistory | null
  onShowTrailer?: () => void
  subtitleTracks?: SubtitleTrack[]
  audioStreams?: StreamDetail[]
  onSelectSubtitle?: (index: number) => void
  onSelectAudio?: (index: number) => void
}

interface HeroSectionSeriesProps extends HeroSectionCommonProps {
  variant: 'series'
  series: Series
  firstEpisode?: { id: string; duration?: number } | null
}

interface HeroSectionSeasonProps extends HeroSectionCommonProps {
  variant: 'season'
  series: Series
  seasonNum: number
  episodeCount: number
  firstEpisodeId?: string
  overview?: string
}

export type HeroSectionProps =
  | HeroSectionMediaProps
  | HeroSectionSeriesProps
  | HeroSectionSeasonProps

export default memo(function HeroSection(props: HeroSectionProps) {
  const { t } = useTranslation()

  const [selectedSubtitleIdx, setSelectedSubtitleIdx] = useState(-1)
  const [selectedAudioIdx, setSelectedAudioIdx] = useState(-1)

  const mediaProps = props as HeroSectionMediaProps
  const seriesProps = props as HeroSectionSeriesProps
  const seasonProps = props as HeroSectionSeasonProps

  useEffect(() => {
    if (props.variant === 'media' && mediaProps.subtitleTracks && mediaProps.subtitleTracks.length > 0) {
      const def = mediaProps.subtitleTracks.find((t) => t.default)
      setSelectedSubtitleIdx(def ? def.index : mediaProps.subtitleTracks[0].index)
    }
  }, [props.variant, mediaProps.subtitleTracks])

  useEffect(() => {
    if (props.variant === 'media' && mediaProps.audioStreams && mediaProps.audioStreams.length > 0) {
      const def = mediaProps.audioStreams.find((s) => s.is_default)
      setSelectedAudioIdx(def ? def.index : mediaProps.audioStreams[0].index)
    }
  }, [props.variant, mediaProps.audioStreams])

  const getPlayUrl = () => {
    if (props.variant === 'media') {
      return `/play/${mediaProps.media.id}`
    } else if (props.variant === 'series' && seriesProps.firstEpisode) {
      return `/play/${seriesProps.firstEpisode.id}`
    } else if (props.variant === 'season' && seasonProps.firstEpisodeId) {
      return `/play/${seasonProps.firstEpisodeId}`
    }
    return ''
  }

  const getTitle = () => {
    if (props.variant === 'media') {
      return mediaProps.media.media_type === 'episode'
        ? (mediaProps.media.episode_title || t('hero.episodeNum', { num: String(mediaProps.media.episode_num) }))
        : mediaProps.media.title
    } else if (props.variant === 'series') {
      return seriesProps.series.title
    } else {
      return seasonProps.series.title
    }
  }

  const getSubtitle = () => {
    if (props.variant === 'media') {
      if (mediaProps.media.orig_title && mediaProps.media.orig_title !== mediaProps.media.title && mediaProps.media.media_type !== 'episode') {
        return mediaProps.media.orig_title
      }
    } else if (props.variant === 'series') {
      if (seriesProps.series.orig_title && seriesProps.series.orig_title !== seriesProps.series.title) {
        return seriesProps.series.orig_title
      }
    }
    return null
  }

  const getRating = () => {
    if (props.variant === 'media') {
      return mediaProps.media.rating
    } else {
      return seriesProps.series.rating
    }
  }

  const getYear = () => {
    if (props.variant === 'media') {
      return mediaProps.media.year
    } else {
      return seriesProps.series.year
    }
  }

  const getDuration = () => {
    if (props.variant === 'media') {
      return mediaProps.media.duration
    }
    return null
  }

  const getGenres = () => {
    if (props.variant === 'media') {
      return mediaProps.media.genres
    } else {
      return seriesProps.series.genres
    }
  }

  const getResolution = () => {
    if (props.variant === 'media') {
      return mediaProps.media.resolution
    }
    return null
  }

  const getVideoCodec = () => {
    if (props.variant === 'media') {
      return mediaProps.media.video_codec
    }
    return null
  }

  const getSubtitleTracks = () => {
    if (props.variant === 'media') {
      return mediaProps.subtitleTracks
    }
    return null
  }

  const getAudioStreams = () => {
    if (props.variant === 'media') {
      return mediaProps.audioStreams
    }
    return null
  }

  const getBackdropUrl = () => {
    if (props.variant === 'media') {
      if (mediaProps.media.media_type === 'episode') {
        return streamApi.getPosterUrl(mediaProps.media.id, props.posterVersion)
      } else if (mediaProps.media.backdrop_path) {
        return streamApi.getBackdropUrl(mediaProps.media.id, props.posterVersion)
      }
      return streamApi.getPosterUrl(mediaProps.media.id, props.posterVersion)
    } else {
      return streamApi.getSeriesBackdropUrl(seriesProps.series.id, props.posterVersion)
    }
  }

  const getLogoUrl = () => {
    if (props.variant === 'media') {
      return streamApi.getLogoUrl(mediaProps.media.id, props.posterVersion)
    } else {
      return streamApi.getSeriesLogoUrl(seriesProps.series.id, props.posterVersion)
    }
  }

  const getPosterUrl = () => {
    if (props.variant === 'media') {
      return streamApi.getPosterUrl(mediaProps.media.id, props.posterVersion)
    } else if (props.variant === 'season') {
      return streamApi.getSeasonPosterUrl(seasonProps.series.id, seasonProps.seasonNum)
    }
    return streamApi.getSeriesPosterUrl(seriesProps.series.id, props.posterVersion)
  }

  const getSeasonInfo = () => {
    if (props.variant === 'series') {
      return `${seriesProps.series.season_count} 季 · ${seriesProps.series.episode_count} 集`
    } else if (props.variant === 'season') {
      return `${seasonProps.episodeCount} 集`
    }
    return null
  }

  const getSeasonTitle = () => {
    if (props.variant === 'season') {
      return seasonProps.seasonNum === 0 ? '特别篇' : `第 ${seasonProps.seasonNum} 季`
    }
    return null
  }

  const getOverview = () => {
    if (props.variant === 'season') {
      return seasonProps.overview
    } else if (props.variant === 'media') {
      return mediaProps.media.tagline
    }
    return null
  }

  const getBreadcrumb = () => {
    if (props.variant === 'media' && mediaProps.media.media_type === 'episode' && mediaProps.media.series_id) {
      return {
        seriesId: mediaProps.media.series_id,
        seriesTitle: mediaProps.media.series?.title || mediaProps.media.series?.orig_title || t('hero.unknownSeries'),
        seasonNum: mediaProps.media.season_num,
        episodeNum: mediaProps.media.episode_num,
      }
    }
    return null
  }

  const handleSelectSubtitle = useCallback((idx: number) => {
    setSelectedSubtitleIdx(idx)
    mediaProps.onSelectSubtitle?.(idx)
  }, [mediaProps.onSelectSubtitle])

  const handleSelectAudio = useCallback((idx: number) => {
    setSelectedAudioIdx(idx)
    mediaProps.onSelectAudio?.(idx)
  }, [mediaProps.onSelectAudio])

  const playUrl = getPlayUrl()
  const breadcrumb = getBreadcrumb()
  const subtitleTracks = getSubtitleTracks()
  const audioStreams = getAudioStreams()

  return (
    <>
      <div className="relative" style={{ background: 'var(--bg-base)' }}>
        <HeroBackdrop
          posterUrl={getPosterUrl()}
          backdropUrl={getBackdropUrl()}
        />

        <div className="relative px-4 pb-2 sm:px-6 lg:px-8" style={{ marginTop: '-12rem' }}>
          <div className="mx-auto">
            <div className="flex min-w-0 flex-col justify-end">
              {props.variant === 'season' ? (
                <HeroSeasonLayout
                  series={seasonProps.series}
                  seasonNum={seasonProps.seasonNum}
                  firstEpisodeId={seasonProps.firstEpisodeId}
                  overview={getOverview()}
                  posterUrl={getPosterUrl()}
                  title={getTitle()}
                  seasonTitle={getSeasonTitle() || ''}
                  seasonInfo={getSeasonInfo() || ''}
                  year={getYear()}
                  rating={getRating()}
                  isFavorited={props.isFavorited}
                  isWatched={props.isWatched}
                  scraping={props.scraping}
                  isAdmin={props.isAdmin}
                  playlists={props.playlists}
                  onFavorite={props.onFavorite}
                  onMarkWatched={props.onMarkWatched}
                  onAddToPlaylist={props.onAddToPlaylist}
                  onManualMatch={props.onManualMatch}
                  onUnmatch={props.onUnmatch}
                  onRefreshMetadata={props.onRefreshMetadata}
                  onEditMetadata={props.onEditMetadata}
                  onDelete={props.onDelete}
                  showMoreMenu={props.showMoreMenu}
                  showPlaylistMenu={props.showPlaylistMenu}
                  onToggleMoreMenu={props.onToggleMoreMenu}
                  onTogglePlaylistMenu={props.onTogglePlaylistMenu}
                />
              ) : (
                <>
                  <div className="flex flex-col">
                    <div>
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

                      {getLogoUrl() ? (
                        <div className="mb-1 min-h-[4rem] sm:min-h-[5rem] flex items-center">
                          <img
                            src={getLogoUrl()}
                            alt={getTitle()}
                            className="max-h-20 sm:max-h-24 w-auto object-contain drop-shadow-lg"
                          />
                        </div>
                      ) : (
                        <h1 className="font-display text-3xl font-bold tracking-wide drop-shadow-lg sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
                          {getTitle()}
                        </h1>
                      )}

                      {getSubtitle() && <p className="mt-1.5 text-base" style={{ color: 'var(--text-secondary)' }}>{getSubtitle()}</p>}
                      {getOverview() && <p className="mt-1 text-sm italic" style={{ color: 'var(--text-tertiary)' }}>{getOverview()}</p>}

                      <div className="my-3 h-[2px] w-24 rounded-full" style={{
                        background: 'linear-gradient(90deg, var(--neon-blue), var(--neon-purple), transparent)',
                        boxShadow: '0 0 8px var(--neon-blue-30)',
                      }} />
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 min-h-[6rem]">
                      <div className="flex flex-wrap items-center gap-3">
                        {playUrl ? (
                          <HeroActions
                            playUrl={playUrl}
                            isFavorited={props.isFavorited}
                            isWatched={props.isWatched}
                            scraping={props.scraping}
                            isAdmin={props.isAdmin}
                            playlists={props.playlists}
                            watchProgressPosition={mediaProps.watchProgress?.position}
                            onFavorite={props.onFavorite}
                            onMarkWatched={props.onMarkWatched}
                            onAddToPlaylist={props.onAddToPlaylist}
                            onManualMatch={props.onManualMatch}
                            onUnmatch={props.onUnmatch}
                            onRefreshMetadata={props.onRefreshMetadata}
                            onEditMetadata={props.onEditMetadata}
                            onDelete={props.onDelete}
                            onShowTrailer={mediaProps.onShowTrailer}
                            hasTrailer={props.variant === 'media' && mediaProps.media.trailer_url !== undefined}
                            mediaId={props.variant === 'media' ? mediaProps.media.id : seriesProps.series.id}
                            mediaType={props.variant === 'media' ? mediaProps.media.media_type : 'series'}
                            title={getTitle()}
                          />
                        ) : (
                          <div className="flex gap-3">
                            <div className="skeleton h-12 w-32 rounded-xl" />
                            <div className="skeleton h-12 w-12 rounded-xl" />
                            <div className="skeleton h-12 w-12 rounded-xl" />
                            <div className="skeleton h-12 w-12 rounded-xl" />
                            <div className="skeleton h-12 w-12 rounded-xl" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-3 min-h-[5rem]">
                        {getTitle() ? (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              {getRating() && getRating() > 0 && (
                                <span className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold text-yellow-400"
                                  style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.15)' }}
                                >
                                  <Star size={13} fill="currentColor" />
                                  {getRating()?.toFixed(1)}
                                </span>
                              )}
                              {getYear() && getYear() > 0 && (
                                <span className="rounded-lg px-2.5 py-1 text-sm"
                                  style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                                >
                                  {getYear()}
                                </span>
                              )}
                              {(() => {
                                const duration = getDuration()
                                return duration !== null && duration > 0 && (
                                  <span className="rounded-lg px-2.5 py-1 text-sm"
                                    style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                                  >
                                    {formatDuration(duration)}
                                  </span>
                                )
                              })()}
                              {getSeasonInfo() && (
                                <span className="rounded-lg px-2.5 py-1 text-sm"
                                  style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                                >
                                  {getSeasonInfo()}
                                </span>
                              )}
                              {getGenres() && (
                                getGenres()?.split(',').slice(0, 3).map((g) => (
                                  <Link key={g} to={`/search?q=${encodeURIComponent(g.trim())}`}
                                    className="rounded-lg px-2.5 py-1 text-sm transition-all duration-200 hover:scale-[1.04] hover:brightness-125 cursor-pointer"
                                    style={{ background: 'var(--neon-blue-4)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                                  >
                                    {g.trim()}
                                  </Link>
                                ))
                              )}
                              {getResolution() && <span className="badge-neon font-bold">{getResolution()}</span>}
                              {getVideoCodec() && <span className="badge-neon">{getVideoCodec()}</span>}
                            </div>

                            {props.variant === 'media' && (
                              <div className="flex flex-wrap items-center gap-2">
                                {subtitleTracks && subtitleTracks.length > 0 && (
                                  <HeroSubtitleSelector
                                    subtitleTracks={subtitleTracks}
                                    selectedIndex={selectedSubtitleIdx}
                                    onSelect={handleSelectSubtitle}
                                  />
                                )}

                                {audioStreams && audioStreams.length > 0 && (
                                  <HeroAudioSelector
                                    audioStreams={audioStreams}
                                    selectedIndex={selectedAudioIdx}
                                    onSelect={handleSelectAudio}
                                  />
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex gap-2">
                              <div className="skeleton h-7 w-16 rounded-lg" />
                              <div className="skeleton h-7 w-16 rounded-lg" />
                              <div className="skeleton h-7 w-16 rounded-lg" />
                              <div className="skeleton h-7 w-20 rounded-lg" />
                            </div>
                            <div className="flex gap-2">
                              <div className="skeleton h-8 w-24 rounded-lg" />
                              <div className="skeleton h-8 w-24 rounded-lg" />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
})