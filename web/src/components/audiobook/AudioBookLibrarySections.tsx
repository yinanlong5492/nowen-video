import { memo, useMemo, useCallback, useEffect, useState } from 'react'
import { Heart, Play, BookOpen, Headphones, User, Library, Sparkles } from 'lucide-react'
import type { AudioBook } from '@/types'
import { getAudioBookCoverUrl } from '@/api'
import ScrollButton from '@/components/shared/ScrollButton'

const CARD_WIDTH = 'w-36 sm:w-40' as const

interface CardBookItemProps {
  book: AudioBook
  onPlay: (book: AudioBook) => void
}

interface BookCardProps {
  book: AudioBook
  failedCovers: Set<string>
  onSelectBook: (bookId: string) => void
  onToggleFavorite: (bookId: string, e: React.MouseEvent) => void
  onCoverError: (bookId: string) => void
  onScrape: (bookId: string) => void
}

interface AuthorCardProps {
  author: string
  books: AudioBook[]
  bookCount: number
  failedCovers: Set<string>
  onSelectAuthor: (author: string) => void
  onCoverError: (bookId: string) => void
}

interface AudioBookLibrarySectionsProps {
  libraryName?: string
  favoriteBooks: AudioBook[]
  recentBooks: AudioBook[]
  popularBooks: AudioBook[]
  recentItems: AudioBook[]
  seriesList: string[]
  seriesBooksMap: Map<string, AudioBook[]>
  authors: string[]
  authorBookCount: Map<string, number>
  books: AudioBook[]
  failedCovers: Set<string>
  recentBooksRef: React.RefObject<HTMLDivElement>
  seriesRef: React.RefObject<HTMLDivElement>
  authorsRef: React.RefObject<HTMLDivElement>
  onToggleFavorite: (bookId: string, e: React.MouseEvent) => void
  onPlay: (book: AudioBook) => void
  onSelectBook: (bookId: string) => void
  onSelectAuthor: (author: string) => void
  onSelectSeries: (series: string) => void
  onScrollLeft: (ref: React.RefObject<HTMLDivElement>) => void
  onScrollRight: (ref: React.RefObject<HTMLDivElement>) => void
  onCoverError: (bookId: string) => void
  onScrape: (bookId: string) => void
}

function formatMinutes(seconds: number): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m}分钟`
  return `${m}分钟`
}

const CardBookItem = memo(function CardBookItem({ book, onPlay }: CardBookItemProps) {
  return (
    <div
      className="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200 group hover:scale-[1.02] bg-white/10 hover:bg-white/[0.22]"
      onClick={() => onPlay(book)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{book.title}</p>
          {book.author && (
            <p className="text-xs text-white/70 truncate">- {book.author}</p>
          )}
        </div>
      </div>
      <Play size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0" />
      {book.duration > 0 && (
        <p className="text-xs text-white/70 flex-shrink-0">{formatMinutes(book.duration)}</p>
      )}
    </div>
  )
})

const BookCard = memo(function BookCard({
  book, failedCovers, onSelectBook, onToggleFavorite, onCoverError, onScrape,
}: BookCardProps) {
  const coverFailed = failedCovers.has(book.id)

  return (
    <div className={`flex-shrink-0 ${CARD_WIDTH} rounded-2xl overflow-hidden transition-all group card-surface hover:border-[var(--neon-purple-30)]`}>
      <div className="aspect-square relative cursor-pointer bg-[var(--bg-surface)]" onClick={() => onSelectBook(book.id)}>
        {coverFailed ? (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-theme-tertiary" />
          </div>
        ) : (
          <img
            src={getAudioBookCoverUrl(book.id)}
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => onCoverError(book.id)}
          />
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <button
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2.5 rounded-full bg-neon-purple/80 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-neon-purple hover:scale-110 shadow-lg"

          
          title="播放"
        >
          <Play className="h-4 w-4 ml-0.5" />
        </button>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-theme-primary truncate transition-colors group-hover:text-neon">{book.title}</p>
        <p className="text-xs text-theme-secondary truncate">{book.author || book.narrator}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-theme-secondary">
            {book.chapter_count > 0 ? `${book.chapter_count}集` : ''}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onScrape(book.id) }}
              className="p-1 rounded transition-colors hover:bg-[var(--nav-hover-bg)]"
              title="刮削元数据"
            >
              <Sparkles size={14} className="text-theme-secondary hover:text-[#8B5CF6]" />
            </button>
            <button
              onClick={(e) => onToggleFavorite(book.id, e)}
              className="p-1 rounded transition-colors hover:bg-[var(--nav-hover-bg)]"
              title={book.is_favorite ? '取消收藏' : '加入收藏'}
            >
              <Heart size={14} className={book.is_favorite ? 'fill-red-500 text-red-500' : 'text-theme-secondary'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

const AuthorCard = memo(function AuthorCard({
  author, books, bookCount, failedCovers, onSelectAuthor, onCoverError,
}: AuthorCardProps) {
  const coverBook = useMemo(
    () => books.filter(b => b.author === author).find(b => b.cover_path),
    [books, author],
  )
  const coverFailed = coverBook ? failedCovers.has(coverBook.id) : false

  return (
    <div
      className={`flex-shrink-0 ${CARD_WIDTH} rounded-2xl overflow-hidden transition-all group card-surface hover:border-[var(--neon-purple-30)] cursor-pointer`}
      onClick={() => onSelectAuthor(author)}
    >
      <div className="aspect-square rounded-full overflow-hidden mx-auto mt-4 w-28 h-28 bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center">
        {coverBook && !coverFailed ? (
          <img
            src={getAudioBookCoverUrl(coverBook.id)}
            alt={author}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => onCoverError(coverBook.id)}
          />
        ) : (
          <User className="h-10 w-10 text-theme-tertiary" />
        )}
      </div>
      <div className="p-3 text-center">
        <p className="text-sm font-medium text-theme-primary truncate transition-colors group-hover:text-neon">{author}</p>
        {bookCount > 0 && (
          <p className="text-xs text-theme-secondary mt-0.5">{bookCount} 本书</p>
        )}
      </div>
    </div>
  )
})

const AudioBookLibrarySections = memo(function AudioBookLibrarySections({
  libraryName, favoriteBooks, recentBooks,
  recentItems, popularBooks,
  seriesList, seriesBooksMap,
  authors, authorBookCount,
  books,
  failedCovers,
  recentBooksRef, seriesRef, authorsRef,
  onToggleFavorite, onPlay,
  onSelectBook, onSelectAuthor, onSelectSeries,
  onScrollLeft, onScrollRight,
  onCoverError, onScrape,
}: AudioBookLibrarySectionsProps) {

  const [scrollEdge, setScrollEdge] = useState({
    recentBooks: { left: true, right: true },
    series: { left: true, right: true },
    authors: { left: true, right: true },
  })

  const makeScrollHandler = useCallback(
    (section: 'recentBooks' | 'series' | 'authors') =>
      (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget
        setScrollEdge(prev => ({
          ...prev,
          [section]: {
            left: el.scrollLeft <= 1,
            right: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
          },
        }))
      },
    [],
  )

  useEffect(() => {
    const check = (ref: React.RefObject<HTMLDivElement>, key: 'recentBooks' | 'series' | 'authors') => {
      const el = ref.current
      if (!el) return
      setScrollEdge(prev => ({
        ...prev,
        [key]: {
          left: el.scrollLeft <= 1,
          right: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
        },
      }))
    }
    check(recentBooksRef, 'recentBooks')
    check(seriesRef, 'series')
    check(authorsRef, 'authors')
  }, [recentItems, seriesList, authors, recentBooksRef, seriesRef, authorsRef])

  return (
    <div className="space-y-10">
      <div>
        <h2 className="mb-5 font-display text-xl font-bold tracking-wide text-theme-primary">
          {libraryName || '有声书库'}
        </h2>
      </div>

      {/* 三卡片网格 */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* 我的收藏 */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-6 w-6 text-white" />
              <h3 className="text-base font-semibold text-white">我的收藏</h3>
            </div>
            <div className="space-y-2">
              {favoriteBooks.slice(0, 4).map(book => (
                <CardBookItem key={book.id} book={book} onPlay={onPlay} />
              ))}
              {favoriteBooks.length === 0 && (
                <p className="text-white/60 text-sm py-4 text-center">暂无收藏</p>
              )}
            </div>
          </div>

          {/* 最近收听 */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-500">
            <div className="flex items-center gap-2 mb-4">
              <Play className="h-6 w-6 text-white" />
              <h3 className="text-base font-semibold text-white">最近收听</h3>
            </div>
            <div className="space-y-2">
              {recentBooks.slice(0, 4).map(book => (
                <CardBookItem key={book.id} book={book} onPlay={onPlay} />
              ))}
              {recentBooks.length === 0 && (
                <p className="text-white/60 text-sm py-4 text-center">暂无收听记录</p>
              )}
            </div>
          </div>

          {/* 热门排行 */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400">
            <div className="flex items-center gap-2 mb-4">
              <Headphones className="h-6 w-6 text-white" />
              <h3 className="text-base font-semibold text-white">热门排行</h3>
            </div>
            <div className="space-y-2">
              {popularBooks.slice(0, 4).map(book => (
                <CardBookItem key={book.id} book={book} onPlay={onPlay} />
              ))}
              {popularBooks.length === 0 && (
                <p className="text-white/60 text-sm py-4 text-center">暂无热门有声书</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 最新添加 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold tracking-wide text-theme-primary">最新添加</h2>
          <div className="flex items-center gap-2">
            <ScrollButton direction="left" onClick={() => onScrollLeft(recentBooksRef)} disabled={scrollEdge.recentBooks.left} />
            <ScrollButton direction="right" onClick={() => onScrollRight(recentBooksRef)} disabled={scrollEdge.recentBooks.right} />
          </div>
        </div>
        <div ref={recentBooksRef} onScroll={makeScrollHandler('recentBooks')} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {recentItems.map(book => (
            <BookCard
              key={book.id}
              book={book}
              failedCovers={failedCovers}
              onSelectBook={onSelectBook}
              onToggleFavorite={onToggleFavorite}
              onCoverError={onCoverError}
              onScrape={onScrape}
            />
          ))}
          {recentItems.length === 0 && (
            <div className="w-full text-center py-8">
              <BookOpen className="h-8 w-8 text-theme-tertiary mx-auto mb-2" />
              <p className="text-theme-secondary text-sm">暂无最近添加的有声书</p>
            </div>
          )}
        </div>
      </div>

      {/* 书籍系列 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold tracking-wide text-theme-primary">书籍系列</h2>
          <div className="flex items-center gap-2">
            <ScrollButton direction="left" onClick={() => onScrollLeft(seriesRef)} disabled={scrollEdge.series.left} />
            <ScrollButton direction="right" onClick={() => onScrollRight(seriesRef)} disabled={scrollEdge.series.right} />
          </div>
        </div>
        <div ref={seriesRef} onScroll={makeScrollHandler('series')} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {seriesList.map(series => {
            const seriesBooks = seriesBooksMap.get(series) || []
            const firstBook = seriesBooks[0]
            const coverFailed = firstBook ? failedCovers.has(firstBook.id) : false
            return (
              <div
                key={series}
                className={`flex-shrink-0 ${CARD_WIDTH} rounded-2xl overflow-hidden transition-all group card-surface hover:border-[var(--neon-purple-30)] cursor-pointer`}
                onClick={() => onSelectSeries(series)}
              >
                <div className="aspect-square relative bg-[var(--bg-surface)]">
                  {firstBook && !coverFailed ? (
                    <img
                      src={getAudioBookCoverUrl(firstBook.id)}
                      alt={series}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() => onCoverError(firstBook.id)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Library className="h-10 w-10 text-theme-tertiary" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-theme-primary truncate transition-colors group-hover:text-neon">{series}</p>
                  <p className="text-xs text-theme-secondary mt-0.5">{seriesBooks.length} 本书</p>
                </div>
              </div>
            )
          })}
          {seriesList.length === 0 && (
            <div className="w-full text-center py-8">
              <Library className="h-8 w-8 text-theme-tertiary mx-auto mb-2" />
              <p className="text-theme-secondary text-sm">暂无系列</p>
            </div>
          )}
        </div>
      </div>

      {/* 作者 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold tracking-wide text-theme-primary">作者</h2>
          <div className="flex items-center gap-2">
            <ScrollButton direction="left" onClick={() => onScrollLeft(authorsRef)} disabled={scrollEdge.authors.left} />
            <ScrollButton direction="right" onClick={() => onScrollRight(authorsRef)} disabled={scrollEdge.authors.right} />
          </div>
        </div>
        <div ref={authorsRef} onScroll={makeScrollHandler('authors')} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {authors.map(author => (
            <AuthorCard
              key={author}
              author={author}
              books={books}
              bookCount={authorBookCount.get(author) || 0}
              failedCovers={failedCovers}
              onSelectAuthor={onSelectAuthor}
              onCoverError={onCoverError}
            />
          ))}
          {authors.length === 0 && (
            <div className="w-full text-center py-8">
              <User className="h-8 w-8 text-theme-tertiary mx-auto mb-2" />
              <p className="text-theme-secondary text-sm">暂无作者</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default AudioBookLibrarySections