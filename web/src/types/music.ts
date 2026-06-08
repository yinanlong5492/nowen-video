import type { MusicTrack, MusicAlbum } from '@/types'

/** 歌曲详情页 Props */
export interface MusicTrackDetailProps {
  track: MusicTrack
  tracks: MusicTrack[]
  albums: MusicAlbum[]
  lyricsText: string
  parsedLyrics: {
    timedLines: string[]
    colWidth: number
    metadataParts: string[]
    trackTitle: string
  } | null
  failedTrackCovers: Set<string>
  failedAlbumCovers: Set<string>
  moreMenuType: 'track' | 'album' | 'artist' | null
  moreMenuRef: React.RefObject<HTMLDivElement>
  showDeleteConfirm: boolean
  detailTrackId: string
  onSetMoreMenuType: (type: 'track' | 'album' | 'artist' | null) => void
  onSetShowDeleteConfirm: (show: boolean) => void
  onToggleLove: (trackId: string, e: React.MouseEvent) => void
  onDelete: (track: MusicTrack) => void
  onAddToQueue: (track: MusicTrack, e: React.MouseEvent) => void
  onEditMeta: (meta: Partial<MusicTrack>) => void
  onCopyPath: (track: MusicTrack) => void
  onShare: () => void
  onPlay: (track: MusicTrack) => void
  onSelectTrack: (trackId: string) => void
  onSelectAlbum: (albumId: string) => void
  onBack: () => void
}

/** 专辑详情页 Props */
export interface MusicAlbumDetailProps {
  album: MusicAlbum
  albumTracks: MusicTrack[]
  failedAlbumCovers: Set<string>
  allAlbumLoved: boolean
  moreMenuType: 'track' | 'album' | 'artist' | null
  moreMenuRef: React.RefObject<HTMLDivElement>
  onSetMoreMenuType: (type: 'track' | 'album' | 'artist' | null) => void
  onToggleLove: (trackId: string, e: React.MouseEvent) => void
  onToggleAlbumLove: (albumTracks: MusicTrack[], e: React.MouseEvent) => void
  onAddToQueue: (track: MusicTrack, e: React.MouseEvent) => void
  onAddAlbumToQueue: (albumTracks: MusicTrack[]) => void
  onEditMeta: (meta: Partial<MusicAlbum>) => void
  onShare: () => void
  onRefreshMeta: () => void
  onAlbumCoverError: (albumId: string) => void
  onPlay: (track: MusicTrack) => void
  onSelectTrack: (trackId: string) => void
  onBack: () => void
}

/** 艺术家详情页 Props */
export interface MusicArtistDetailProps {
  artistName: string
  artistTracks: MusicTrack[]
  artistAlbums: MusicAlbum[]
  selectedAlbumId: string
  failedAlbumCovers: Set<string>
  moreMenuType: 'track' | 'album' | 'artist' | null
  moreMenuRef: React.RefObject<HTMLDivElement>
  onSetMoreMenuType: (type: 'track' | 'album' | 'artist' | null) => void
  onSetSelectedAlbumId: (id: string) => void
  onToggleLove: (trackId: string, e: React.MouseEvent) => void
  onAddToQueue: (track: MusicTrack, e: React.MouseEvent) => void
  onAddAlbumToQueue: (albumTracks: MusicTrack[]) => void
  onEditMeta: (meta: { artist_name?: string; genre?: string }) => void
  onShare: () => void
  onPlay: (track: MusicTrack) => void
  onSelectTrack: (trackId: string) => void
  onBack: () => void
}

/** 主库视图 Props */
export interface MusicLibrarySectionsProps {
  libraryName?: string
  lovedTracks: MusicTrack[]
  recentTracks: MusicTrack[]
  recentItems: ({ type: 'track'; track: MusicTrack; sortDate: number } | { type: 'album'; album: MusicAlbum; tracks: MusicTrack[]; sortDate: number })[]
  popularTracks: MusicTrack[]
  albums: MusicAlbum[]
  artists: string[]
  tracks: MusicTrack[]
  failedTrackCovers: Set<string>
  failedAlbumCovers: Set<string>
  recentTracksRef: React.RefObject<HTMLDivElement>
  albumsRef: React.RefObject<HTMLDivElement>
  artistsRef: React.RefObject<HTMLDivElement>
  onToggleLove: (trackId: string, e: React.MouseEvent) => void
  onToggleAlbumLove: (albumTracks: MusicTrack[], e: React.MouseEvent) => void
  onAddToQueue: (track: MusicTrack, e: React.MouseEvent) => void
  onPlay: (track: MusicTrack, queue?: MusicTrack[]) => void
  onSelectTrack: (trackId: string) => void
  onSelectAlbum: (albumId: string) => void
  onSelectArtist: (artist: string) => void
  onScrollLeft: (ref: React.RefObject<HTMLDivElement>) => void
  onScrollRight: (ref: React.RefObject<HTMLDivElement>) => void
  onTrackCoverError: (trackId: string) => void
  onAlbumCoverError: (albumId: string) => void
}

/** 编辑弹窗 Props */
export interface MusicEditDialogsProps {
  showEditTrackMeta: boolean
  editTrackMeta: Partial<MusicTrack>
  showEditAlbumMeta: boolean
  editAlbumMeta: Partial<MusicAlbum>
  showEditArtistMeta: boolean
  editArtistMeta: { artist_name?: string; genre?: string }
  savingMeta: boolean
  onCloseTrackMeta: () => void
  onCloseAlbumMeta: () => void
  onCloseArtistMeta: () => void
  onSetEditTrackMeta: React.Dispatch<React.SetStateAction<Partial<MusicTrack>>>
  onSetEditAlbumMeta: React.Dispatch<React.SetStateAction<Partial<MusicAlbum>>>
  onSetEditArtistMeta: React.Dispatch<React.SetStateAction<{ artist_name?: string; genre?: string }>>
  onSaveTrackMeta: () => void
  onSaveAlbumMeta: () => void
  onSaveArtistMeta: () => void
}