import { useState } from 'react'
import type { Media, MixedItem } from '@/types'
import { adminApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/components/Toast'
import EditMetadataModal from '@/components/EditMetadataModal'
import RefreshSingleModal from '@/components/RefreshSingleModal'
import { formatErrMsg } from '@/utils/error'
import MediaCard from './MediaCard'
import { motion } from 'framer-motion'
import { useStaggerVariants } from '@/hooks/useMotion'

interface MediaGridProps {
  items?: Media[]
  mixedItems?: MixedItem[]
  title?: string
  loading?: boolean
  columns?: number
}

const COLUMN_CLASSES: Record<number, string> = {
  6: 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  7: 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7',
  8: 'grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8',
  9: 'grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9',
  10: 'grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10',
  12: 'grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 xl:grid-cols-12',
}

export default function MediaGrid({ items, mixedItems, title, loading, columns }: MediaGridProps) {
  const { container, item: itemVariant } = useStaggerVariants()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin'
  const toast = useToast()

  const [showRefreshModal, setShowRefreshModal] = useState(false)
  const [refreshId, setRefreshId] = useState<string | null>(null)
  const [refreshTitle, setRefreshTitle] = useState('')
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false)
  const [unmatchId, setUnmatchId] = useState<string | null>(null)
  const [matchQuery, setMatchQuery] = useState('')
  const [matchResults, setMatchResults] = useState<any[]>([])
  const [matchSearching, setMatchSearching] = useState(false)
  const [matchSelecting, setMatchSelecting] = useState(false)
  const [matchSource, setMatchSource] = useState<'tmdb' | 'douban'>('tmdb')
  const [editForm, setEditForm] = useState<{
    title: string; orig_title: string; year: number | undefined; overview: string;
    rating: number | undefined; genres: string; country: string; language: string; studio: string
  }>({ title: '', orig_title: '', year: undefined, overview: '', rating: undefined, genres: '', country: '', language: '', studio: '' })

  const gridClass = columns ? (COLUMN_CLASSES[columns] || COLUMN_CLASSES[6]) : COLUMN_CLASSES[6]

  const handleRefreshMetadata = (id: string) => {
    setRefreshId(id)
    setRefreshTitle('')
    setShowRefreshModal(true)
  }

  const handleManualMatch = (id: string) => {
    setMatchId(id)
    setMatchQuery('')
    setMatchResults([])
    setMatchSource('tmdb')
    setShowMatchModal(true)
  }

  const handleUnmatchClick = (id: string) => {
    setUnmatchId(id)
    setShowUnmatchConfirm(true)
  }

  const handleUnmatch = async () => {
    if (!unmatchId) return
    try {
      await adminApi.unmatchSeriesMetadata(unmatchId)
      setShowUnmatchConfirm(false)
      toast.success('已解除匹配')
    } catch {
      toast.error('解除匹配失败')
    }
  }

  const handleEditMetadata = (id: string) => {
    setEditId(id)
    setEditForm({ title: '', orig_title: '', year: undefined, overview: '', rating: undefined, genres: '', country: '', language: '', studio: '' })
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    if (!editId) return
    try {
      await adminApi.updateSeriesMetadata(editId, editForm)
      setShowEditModal(false)
      toast.success('元数据已更新')
    } catch {
      toast.error('更新失败')
    }
  }

  const handleDeleteClick = (id: string) => {
    setDeleteId(id)
    setShowDeleteConfirm(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await adminApi.deleteSeries(deleteId)
      setShowDeleteConfirm(false)
      toast.success('剧集已删除')
    } catch {
      toast.error('删除失败')
    }
  }

  const handleMatchSearch = async () => {
    if (!matchQuery.trim()) return
    setMatchSearching(true)
    try {
      if (matchSource === 'tmdb') {
        const res = await adminApi.searchMetadata(matchQuery, 'tv')
        setMatchResults(res.data.data || [])
        if ((res.data.data || []).length === 0) {
          toast.info('TMDb 未找到匹配结果，请尝试其他关键词或切换到其他数据源')
        }
      } else if (matchSource === 'douban') {
        const res = await adminApi.searchDouban(matchQuery, undefined)
        setMatchResults(res.data.data || [])
        if ((res.data.data || []).length === 0) {
          toast.info('豆瓣未找到匹配结果，请尝试其他关键词')
        }
      }
    } catch (err) {
      const errorMap: Record<string, string> = {
        tmdb: '搜索失败，请检查 TMDb API Key 或网络/代理配置',
        douban: '豆瓣搜索失败',
      }
      toast.error(formatErrMsg(err, errorMap[matchSource] || '搜索失败'))
    } finally {
      setMatchSearching(false)
    }
  }

  const handleMatchSelect = async (resultId: number | string) => {
    if (!matchId) return
    setMatchSelecting(true)
    try {
      if (matchSource === 'tmdb') {
        await adminApi.matchSeriesMetadata(matchId, resultId as number)
      } else if (matchSource === 'douban') {
        await adminApi.matchSeriesDouban(matchId, resultId as string)
      }
      setShowMatchModal(false)
      toast.success('剧集匹配成功')
    } catch {
      toast.error('匹配失败')
    } finally {
      setMatchSelecting(false)
    }
  }

  const handleRefreshSuccess = () => {
    toast.success('元数据刷新成功')
  }

  const renderModals = () => {
    return (
      <>
        {showRefreshModal && refreshId && (
          <RefreshSingleModal
            open={showRefreshModal}
            mediaId={refreshId}
            mediaTitle={refreshTitle}
            onClose={() => setShowRefreshModal(false)}
            onSuccess={handleRefreshSuccess}
            onScrape={(id, replaceImages) => adminApi.scrapeSeriesMetadata(id, replaceImages)}
          />
        )}

        {showMatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="relative w-full max-w-2xl rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
              <h3 className="mb-4 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>手动匹配剧集</h3>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => { setMatchSource('tmdb'); setMatchResults([]) }}
                  className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all"
                  style={{
                    background: matchSource === 'tmdb' ? 'linear-gradient(135deg, var(--neon-blue), var(--neon-blue-mid))' : 'var(--bg-surface)',
                    color: matchSource === 'tmdb' ? '#fff' : 'var(--text-secondary)',
                    border: matchSource === 'tmdb' ? 'none' : '1px solid var(--border-default)',
                  }}
                >
                  🎬 TMDb
                </button>
                <button
                  onClick={() => { setMatchSource('douban'); setMatchResults([]) }}
                  className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all"
                  style={{
                    background: matchSource === 'douban' ? 'linear-gradient(135deg, #00b414, #009910)' : 'var(--bg-surface)',
                    color: matchSource === 'douban' ? '#fff' : 'var(--text-secondary)',
                    border: matchSource === 'douban' ? 'none' : '1px solid var(--border-default)',
                  }}
                >
                  🎯 豆瓣
                </button>
              </div>
              <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {{
                  tmdb: '搜索 TMDb 数据库，适合欧美电视剧。',
                  douban: '搜索豆瓣数据库，适合国产剧集和电影。',
                }[matchSource]}
              </p>
              <div className="mb-4 flex gap-2">
                <input
                  value={matchQuery}
                  onChange={(e) => setMatchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMatchSearch()}
                  placeholder="输入剧集名称搜索..."
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  autoFocus
                />
                <button
                  onClick={handleMatchSearch}
                  disabled={matchSearching}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: { tmdb: 'linear-gradient(135deg, var(--neon-blue), var(--neon-blue-mid))', douban: 'linear-gradient(135deg, #00b414, #009910)' }[matchSource] }}
                >
                  {matchSearching ? '搜索中...' : '搜索'}
                </button>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {matchResults.map((result: any) => {
                  let displayTitle = '', displayOrigTitle = '', displayYear = '', displayOverview = '', posterUrl: string | null = null
                  let displayRating = 0

                  if (matchSource === 'tmdb') {
                    displayTitle = result.name || result.title
                    displayOrigTitle = result.original_name || result.original_title
                    displayYear = (result.first_air_date || result.release_date)?.split('-')[0] || ''
                    displayRating = result.vote_average || 0
                    displayOverview = result.overview || ''
                    posterUrl = result.poster_path ? `https://image.tmdb.org/t/p/w92${result.poster_path}` : null
                  } else if (matchSource === 'douban') {
                    displayTitle = result.title
                    displayYear = result.year > 0 ? String(result.year) : ''
                    displayRating = result.rating || 0
                    displayOverview = result.overview || ''
                    posterUrl = result.cover || null
                  }

                  return (
                    <button
                      key={result.id}
                      onClick={() => handleMatchSelect(result.id)}
                      disabled={matchSelecting}
                      className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                    >
                      {posterUrl ? (
                        <img src={posterUrl} alt="" className="h-16 w-11 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-16 w-11 items-center justify-center rounded-lg" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                          <span className="text-xs">N/A</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {displayTitle}
                          </div>
                        </div>
                        {displayOrigTitle && displayOrigTitle !== displayTitle && (
                          <div className="truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>{displayOrigTitle}</div>
                        )}
                        <div className="mt-0.5 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {displayYear && <span>{displayYear}</span>}
                          {displayRating > 0 && (
                            <span className="text-yellow-400">★ {displayRating.toFixed(1)}</span>
                          )}
                        </div>
                        {displayOverview && (
                          <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>{displayOverview}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setShowMatchModal(false)}
                className="mt-4 w-full rounded-xl py-2.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
              >
                关闭
              </button>
            </div>
          </div>
        )}

        {showEditModal && (
          <EditMetadataModal
            type="series"
            id={editId!}
            mediaType="tv"
            entity={null}
            currentPoster={''}
            currentBackdrop={''}
            hasPoster={false}
            hasBackdrop={false}
            onSave={handleEditSave}
            onClose={() => setShowEditModal(false)}
          />
        )}

        {showUnmatchConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
              <h3 className="mb-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>解除匹配剧集</h3>
              <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                确定要解除此剧集的元数据匹配吗？
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowUnmatchConfirm(false)}
                  className="rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  取消
                </button>
                <button
                  onClick={handleUnmatch}
                  className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-500"
                >
                  确认解除
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
              <h3 className="mb-2 text-lg font-bold text-red-400">删除剧集</h3>
              <p className="mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                确定要删除此剧集合集及其所有剧集记录吗？
              </p>
              <p className="mb-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                此操作仅从数据库中移除记录，不会删除磁盘上的视频文件。重新扫描媒体库后可恢复。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-500"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {loading ? (
        <motion.div variants={container} initial="hidden" animate="visible">
          {title && (
            <motion.h2 variants={itemVariant} className="mb-4 font-display text-xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
              {title}
            </motion.h2>
          )}
          <div className={gridClass}>
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div key={i} variants={itemVariant}>
                <div className="skeleton aspect-[2/3] rounded-xl" />
                <div className="skeleton mt-2 h-4 w-3/4 rounded" />
                <div className="skeleton mt-1 h-3 w-1/2 rounded" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : mixedItems ? (
        mixedItems.length === 0 ? null : (
          <motion.div variants={container} initial="hidden" animate="visible">
            {title && (
              <motion.h2 variants={itemVariant} className="mb-4 font-display text-xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
                {title}
              </motion.h2>
            )}
            <div className={gridClass}>
              {mixedItems.map((item) => {
                if (item.type === 'series' && item.series) {
                  return (
                    <motion.div key={`s-${item.series.id}`} variants={itemVariant}>
                      <MediaCard
                        series={item.series}
                        onManualMatch={isAdmin ? handleManualMatch : undefined}
                        onUnmatch={isAdmin ? handleUnmatchClick : undefined}
                        onRefreshMetadata={isAdmin ? handleRefreshMetadata : undefined}
                        onEditMetadata={isAdmin ? handleEditMetadata : undefined}
                        onDelete={isAdmin ? handleDeleteClick : undefined}
                      />
                    </motion.div>
                  )
                }
                if (item.type === 'music' && item.music) {
                  return (
                    <motion.div key={`mu-${item.music.id}`} variants={itemVariant}>
                      <MediaCard music={item.music} />
                    </motion.div>
                  )
                }
                if (item.media) {
                  return (
                    <motion.div key={`m-${item.media.id}`} variants={itemVariant}>
                      <MediaCard
                        media={item.media}
                        onManualMatch={isAdmin ? handleManualMatch : undefined}
                        onUnmatch={isAdmin ? handleUnmatchClick : undefined}
                        onRefreshMetadata={isAdmin ? handleRefreshMetadata : undefined}
                        onEditMetadata={isAdmin ? handleEditMetadata : undefined}
                        onDelete={isAdmin ? handleDeleteClick : undefined}
                      />
                    </motion.div>
                  )
                }
                return null
              })}
            </div>
          </motion.div>
        )
      ) : (!items || items.length === 0) ? null : (
        <motion.div variants={container} initial="hidden" animate="visible">
          {title && (
            <motion.h2 variants={itemVariant} className="mb-4 font-display text-xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
              {title}
            </motion.h2>
          )}
          <div className={gridClass}>
            {items.map((media) => (
              <motion.div key={media.id} variants={itemVariant}>
                <MediaCard
                  media={media}
                  onManualMatch={isAdmin ? handleManualMatch : undefined}
                  onUnmatch={isAdmin ? handleUnmatchClick : undefined}
                  onRefreshMetadata={isAdmin ? handleRefreshMetadata : undefined}
                  onEditMetadata={isAdmin ? handleEditMetadata : undefined}
                  onDelete={isAdmin ? handleDeleteClick : undefined}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
      {renderModals()}
    </>
  )
}
