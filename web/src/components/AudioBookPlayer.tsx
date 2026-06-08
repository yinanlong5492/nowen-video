import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

import { audiobookApi } from '@/api'
import type { AudioBook, AudioBookChapter, XimalayaSearchResult } from '@/types'
import { useAudioBookPlayerStore } from '@/stores/audioBookPlayer'
import { useToast } from '@/components/Toast'
import { useWebSocket, WS_EVENTS } from '@/hooks/useWebSocket'
import AudioBookLibrarySections from '@/components/audiobook/AudioBookLibrarySections'
import AudioBookDetail from '@/components/audiobook/AudioBookDetail'
import { X, ExternalLink } from 'lucide-react'

interface AudioBookPlayerProps {
  libraryId: string
  libraryName?: string
}

export default function AudioBookPlayer({ libraryId, libraryName }: AudioBookPlayerProps) {
  const [books, setBooks] = useState<AudioBook[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [chapters, setChapters] = useState<AudioBookChapter[]>([])
  const [failedCovers, setFailedCovers] = useState<Set<string>>(new Set())
  const [scrapingBookId, setScrapingBookId] = useState<string | null>(null)
  const [showScrapeDialog, setShowScrapeDialog] = useState(false)
  const [scrapeQuery, setScrapeQuery] = useState('')
  const [scrapeResults, setScrapeResults] = useState<XimalayaSearchResult[]>([])
  const [scrapeTotal, setScrapeTotal] = useState(0)
  const [scrapeSearching, setScrapeSearching] = useState(false)
  const [scrapingById, setScrapingById] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const toast = useToast()

  const recentBooksRef = useRef<HTMLDivElement>(null!)
  const seriesRef = useRef<HTMLDivElement>(null!)
  const authorsRef = useRef<HTMLDivElement>(null!)
  const moreMenuRef = useRef<HTMLDivElement>(null!)

  const {
    currentChapter,
    isPlaying,
    currentTime,
    duration,
    playBook,
    setChapters: setStoreChapters,
  } = useAudioBookPlayerStore()

  useEffect(() => {
    loadBooks()
  }, [libraryId])

  useEffect(() => {
    if (selectedBookId) {
      loadChapters(selectedBookId)
    }
  }, [selectedBookId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false)
      }
    }
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [moreMenuOpen])

  const { on, off } = useWebSocket()

  const loadBooks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await audiobookApi.list({ library_id: libraryId, page: 1, size: 200 })
      setBooks(res.data?.data || [])
    } catch {
      toast.error('加载有声书列表失败')
    } finally {
      setLoading(false)
    }
  }, [libraryId])

  useEffect(() => {
    const handleScrapeDone = (event: any) => {
      if (event?.library_id === libraryId) {
        loadBooks()
      }
    }
    on(WS_EVENTS.SCRAPE_COMPLETED, handleScrapeDone)
    return () => {
      off(WS_EVENTS.SCRAPE_COMPLETED, handleScrapeDone)
    }
  }, [on, off, libraryId, loadBooks])

  const loadChapters = useCallback(async (bookId: string) => {
    try {
      const res = await audiobookApi.getChapters(bookId)
      const chapterList = res.data?.data || []
      setChapters(chapterList)
      setStoreChapters(chapterList)
    } catch {
      setChapters([])
      setStoreChapters([])
    }
  }, [setStoreChapters])

  const handlePlayBook = (book: AudioBook, chapter?: AudioBookChapter) => {
    setStoreChapters(chapters)
    playBook(book, chapter)
  }

  const handlePlayChapter = (chapter: AudioBookChapter) => {
    if (selectedBook) {
      setStoreChapters(chapters)
      playBook(selectedBook, chapter)
    }
  }

  const handlePlayAll = () => {
    if (selectedBook && chapters.length > 0) {
      setStoreChapters(chapters)
      playBook(selectedBook, chapters[0])
    }
  }

  const handleScrape = async (bookId: string) => {
    setScrapingBookId(bookId)
    try {
      await audiobookApi.scrape(bookId)
      toast.success('刮削任务已提交，请稍候刷新')
      setTimeout(() => loadBooks(), 8000)
    } catch {
      toast.error('刮削失败')
    } finally {
      setScrapingBookId(null)
    }
  }

  const handleOpenScrapeDialog = (bookId: string) => {
    setSelectedBookId(bookId)
    setScrapeQuery('')
    setScrapeResults([])
    setScrapeTotal(0)
    setShowScrapeDialog(true)
  }

  const handleScrapeSearch = async () => {
    if (!scrapeQuery.trim()) return
    setScrapeSearching(true)
    try {
      const res = await audiobookApi.searchXimalaya({ q: scrapeQuery, page: 1 })
      setScrapeResults(res.data?.data || [])
      setScrapeTotal(res.data?.total || 0)
    } catch {
      toast.error('搜索失败')
    } finally {
      setScrapeSearching(false)
    }
  }

  const handleScrapeByResult = async (albumId: number) => {
    if (!selectedBookId) return
    setScrapingById(true)
    try {
      await audiobookApi.scrapeById(selectedBookId, albumId)
      toast.success('刮削任务已提交，请稍候刷新')
      setShowScrapeDialog(false)
      setTimeout(() => loadBooks(), 8000)
    } catch {
      toast.error('指定ID刮削失败')
    } finally {
      setScrapingById(false)
    }
  }

  const handleToggleFavorite = (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const book = books.find(b => b.id === bookId)
    if (!book) return
    const newFav = !book.is_favorite
    setBooks(prev => prev.map(b =>
      b.id === bookId ? { ...b, is_favorite: newFav } : b
    ))
    audiobookApi.update(bookId, { is_favorite: newFav }).catch(() => {
      setBooks(prev => prev.map(b =>
        b.id === bookId ? { ...b, is_favorite: !newFav } : b
      ))
    })
  }

  const handleCoverError = useCallback((bookId: string) => {
    setFailedCovers(prev => new Set(prev).add(bookId))
  }, [])

  const handleSelectBook = useCallback((bookId: string) => {
    setSelectedBookId(bookId)
  }, [])

  const handleSelectAuthor = useCallback((_author: string) => {
  }, [])

  const handleSelectSeries = useCallback((_series: string) => {
  }, [])

  const handleBack = useCallback(() => {
    setSelectedBookId(null)
  }, [])

  const handleScrollLeft = useCallback((ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: -300, behavior: 'smooth' })
    }
  }, [])

  const handleScrollRight = useCallback((ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 300, behavior: 'smooth' })
    }
  }, [])

  const derivedData = useMemo(() => {
    const favoriteBooks = books.filter(b => b.is_favorite)
    const recentBooks = books.filter(b => b.last_play_time).sort((a, b) => {
      const aTime = a.last_play_time ? new Date(a.last_play_time).getTime() : 0
      const bTime = b.last_play_time ? new Date(b.last_play_time).getTime() : 0
      return bTime - aTime
    })
    const popularBooks = books.sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 20)
    const recentItems = [...books].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      return bTime - aTime
    })

    const seriesSet = new Set<string>()
    const seriesMap = new Map<string, AudioBook[]>()
    books.forEach(b => {
      if (b.series_name) {
        seriesSet.add(b.series_name)
        if (!seriesMap.has(b.series_name)) seriesMap.set(b.series_name, [])
        seriesMap.get(b.series_name)!.push(b)
      }
    })
    const seriesList = Array.from(seriesSet)

    const authorSet = new Set<string>()
    const authorCount = new Map<string, number>()
    books.forEach(b => {
      if (b.author) {
        authorSet.add(b.author)
        authorCount.set(b.author, (authorCount.get(b.author) || 0) + 1)
      }
    })
    const authors = Array.from(authorSet)

    return { favoriteBooks, recentBooks, popularBooks, recentItems, seriesList, seriesMap, authors, authorCount }
  }, [books])

  const selectedBook = selectedBookId ? books.find(b => b.id === selectedBookId) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="p-4">
        {selectedBook ? (
          <AudioBookDetail
            book={selectedBook}
            chapters={chapters}
            failedCovers={failedCovers}
            isPlaying={isPlaying}
            currentChapterIndex={currentChapter?.index ?? null}
            currentTime={currentTime}
            duration={duration}
            moreMenuOpen={moreMenuOpen}
            moreMenuRef={moreMenuRef}
            onSetMoreMenuOpen={setMoreMenuOpen}
            onToggleFavorite={handleToggleFavorite}
            onScrape={() => handleScrape(selectedBook.id)}
            onOpenScrapeDialog={() => handleOpenScrapeDialog(selectedBook.id)}
            onRefreshMeta={() => handleScrape(selectedBook.id)}
            onPlayChapter={handlePlayChapter}
            onPlayAll={handlePlayAll}
            onCoverError={handleCoverError}
            onBack={handleBack}
            scraping={scrapingBookId === selectedBook.id}
          />
        ) : (
          <AudioBookLibrarySections
            libraryName={libraryName}
            favoriteBooks={derivedData.favoriteBooks}
            recentBooks={derivedData.recentBooks}
            popularBooks={derivedData.popularBooks}
            recentItems={derivedData.recentItems}
            seriesList={derivedData.seriesList}
            seriesBooksMap={derivedData.seriesMap}
            authors={derivedData.authors}
            authorBookCount={derivedData.authorCount}
            books={books}
            failedCovers={failedCovers}
            recentBooksRef={recentBooksRef}
            seriesRef={seriesRef}
            authorsRef={authorsRef}
            onToggleFavorite={handleToggleFavorite}
            onPlay={handlePlayBook}
            onSelectBook={handleSelectBook}
            onSelectAuthor={handleSelectAuthor}
            onSelectSeries={handleSelectSeries}
            onScrollLeft={handleScrollLeft}
            onScrollRight={handleScrollRight}
            onCoverError={handleCoverError}
            onScrape={handleScrape}
          />
        )}
      </div>

      {showScrapeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowScrapeDialog(false)}>
          <div
            className="w-full max-w-lg max-h-[80vh] mx-4 rounded-2xl shadow-2xl flex flex-col"
            style={{ backgroundColor: 'var(--bg-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                搜索喜马拉雅专辑
              </h2>
              <button
                onClick={() => setShowScrapeDialog(false)}
                className="p-1 rounded transition-colors hover:bg-[var(--nav-hover-bg)]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 flex items-center gap-2">
              <input
                type="text"
                value={scrapeQuery}
                onChange={(e) => setScrapeQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleScrapeSearch() }}
                placeholder="输入关键词搜索喜马拉雅专辑..."
                className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                autoFocus
              />
              <button
                onClick={handleScrapeSearch}
                disabled={scrapeSearching || !scrapeQuery.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#8B5CF6', color: '#fff' }}
              >
                {scrapeSearching ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  '搜索'
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {scrapeTotal > 0 && (
                <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  共找到 {scrapeTotal} 个专辑
                </p>
              )}
              {scrapeResults.length === 0 && !scrapeSearching && (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {scrapeQuery ? '无搜索结果' : '输入关键词搜索喜马拉雅有声书专辑'}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {scrapeResults.map((result) => (
                  <div
                    key={result.album_id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-[var(--nav-hover-bg)]"
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[#8B5CF6]/10">
                      {result.cover_url ? (
                        <img
                          src={result.cover_url}
                          alt={result.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ExternalLink size={20} className="text-[#8B5CF6]/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {result.title}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {result.author || ''}{result.album_id ? ` · ID: ${result.album_id}` : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <a
                          href={`https://www.ximalaya.com/album/${result.album_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-[#8B5CF6] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={10} />
                          查看
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => handleScrapeByResult(result.album_id)}
                      disabled={scrapingById}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 disabled:opacity-50"
                      style={{ backgroundColor: '#8B5CF6', color: '#fff' }}
                    >
                      {scrapingById ? '刮削中...' : '选择'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}