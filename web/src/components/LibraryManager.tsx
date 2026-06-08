import { useState } from 'react'
import { libraryApi } from '@/api'
import type { Library, CreateLibraryRequest } from '@/types'
import { getLibraryPaths } from '@/types'
import type { ScanProgressData, ScrapeProgressData, ScanPhaseData } from '@/hooks/useWebSocket'
import { useToast } from './Toast'
import { useDialog } from './Dialog'
import CreateLibraryModal from './CreateLibraryModal'
import EditLibraryModal from './EditLibraryModal'
import RefreshMetadataModal from './RefreshMetadataModal'
import LazyIngestModal from './LazyIngestModal'
import {
  FolderPlus,
  RefreshCw,
  Trash2,
  HardDrive,
  Film,
  Tv,
  Layers,
  Video,
  Music,
  Headphones,
  ArrowUpDown,
  ScanLine,
  Calendar,
  FolderOpen,
  ChevronRight,
  Pencil,
  Sparkles,
} from 'lucide-react'
import clsx from 'clsx'

// 类型配置映射
const TYPE_CONFIG: Record<string, { label: string; icon: typeof Film; color: string; bg: string }> = {
  movie: { label: '电影', icon: Film, color: 'var(--neon-blue)', bg: 'var(--neon-blue-8)' },
  tvshow: { label: '电视节目', icon: Tv, color: 'var(--neon-purple)', bg: 'var(--neon-purple-8)' },
  mixed: { label: '混合影片', icon: Layers, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)' },
  other: { label: '其他视频', icon: Video, color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)' },
  music: { label: '音乐库', icon: Music, color: 'var(--neon-pink)', bg: 'var(--neon-pink-8)' },
  audiobook: { label: '有声书', icon: Headphones, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.08)' },
}

interface LibraryManagerProps {
  libraries: Library[]
  setLibraries: React.Dispatch<React.SetStateAction<Library[]>>
  scanning: Set<string>
  setScanning: React.Dispatch<React.SetStateAction<Set<string>>>
  scanProgress: Record<string, ScanProgressData>
  scrapeProgress: Record<string, ScrapeProgressData>
  scanPhase: Record<string, ScanPhaseData>
  tmdbEnabled: boolean
  doubanEnabled: boolean
}

export default function LibraryManager({
  libraries,
  setLibraries,
  scanning,
  setScanning,
  scanProgress,
  scrapeProgress,
  scanPhase,
  tmdbEnabled,
  doubanEnabled,
}: LibraryManagerProps) {
  const toast = useToast()
  const dialog = useDialog()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showLazyIngestModal, setShowLazyIngestModal] = useState(false)
  // 从 localStorage 读取排序配置，如果不存在则使用默认值
  const savedSortBy = localStorage.getItem('library_sort_by') as 'name' | 'created' | 'type' | null
  const savedSortAsc = localStorage.getItem('library_sort_asc') === 'true'
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'type'>(savedSortBy || 'created')
  const [sortAsc, setSortAsc] = useState(savedSortAsc)
  const [scanAllLoading, setScanAllLoading] = useState(false)
  const [editingLibrary, setEditingLibrary] = useState<Library | null>(null)
  const [refreshMetaLib, setRefreshMetaLib] = useState<Library | null>(null)

  // 保存排序配置到 localStorage
  const saveSortConfig = (newSortBy: 'name' | 'created' | 'type', newSortAsc: boolean) => {
    localStorage.setItem('library_sort_by', newSortBy)
    localStorage.setItem('library_sort_asc', String(newSortAsc))
  }

  // 排序逻辑
  const sortedLibraries = [...libraries].sort((a, b) => {
    let cmp = 0
    if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
    else if (sortBy === 'type') cmp = a.type.localeCompare(b.type)
    else cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return sortAsc ? -cmp : cmp
  })

  const handleCreate = async (data: CreateLibraryRequest) => {
    const createRes = await libraryApi.create(data)
    const res = await libraryApi.list()
    setLibraries(res.data.data || [])

    // 音乐库创建后自动触发扫描
    const createdLib = createRes.data?.data
    if (createdLib && createdLib.type === 'music') {
      handleScan(createdLib.id)
    }
  }

  const handleScan = async (id: string) => {
    if (!tmdbEnabled && !doubanEnabled) {
      const ok = await dialog.confirm({
        title: '刮削数据源未启用',
        message: 'TMDB 和豆瓣刮削均已关闭，是否仅使用本地元数据文件进行扫描？',
        confirmText: '继续扫描',
      })
      if (!ok) return
    }
    setScanning((s) => new Set(s).add(id))
    try {
      await libraryApi.scan(id)
    } catch (err: any) {
      setScanning((s) => {
        const ns = new Set(s)
        ns.delete(id)
        return ns
      })
      const msg = err?.response?.data?.error || '扫描启动失败'
      toast.error(msg)
    }
  }

  const handleScanAll = async () => {
    if (!tmdbEnabled && !doubanEnabled) {
      const ok = await dialog.confirm({
        title: '刮削数据源未启用',
        message: 'TMDB 和豆瓣刮削均已关闭，是否仅使用本地元数据文件进行扫描？',
        confirmText: '继续扫描',
      })
      if (!ok) return
    }
    const toScan = libraries.filter((lib) => !scanning.has(lib.id))
    if (toScan.length === 0) {
      toast.info('所有媒体库已在扫描中')
      return
    }
    setScanAllLoading(true)
    try {
      for (const lib of toScan) {
        await handleScan(lib.id)
      }
      toast.success(`已启动 ${toScan.length} 个媒体库扫描`)
    } finally {
      setScanAllLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await dialog.confirm({
      title: '删除媒体库',
      message: '确定删除此媒体库？关联的媒体记录也会被清除。',
      confirmText: '删除',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await libraryApi.delete(id)
      setLibraries((libs) => libs.filter((l) => l.id !== id))
    } catch {
      toast.error('删除失败')
    }
  }

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      const newSortAsc = !sortAsc
      setSortAsc(newSortAsc)
      saveSortConfig(sortBy, newSortAsc)
    } else {
      setSortBy(field)
      setSortAsc(false)
      saveSortConfig(field, false)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '从未扫描'
    return new Date(date).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <section>
      {/* ===== 区域头部 — 飞牛风格工具栏 ===== */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* 标题 */}
        <h2
          className="flex items-center gap-2 font-display text-lg font-semibold tracking-wide"
          style={{ color: 'var(--text-primary)' }}
        >
          <HardDrive size={20} className="text-neon/60" />
          媒体库管理
        </h2>

        <div className="ml-auto flex items-center gap-2">
          {/* 一键入库（AI 全自动）— 极简入口 */}
          <button
            onClick={() => setShowLazyIngestModal(true)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all"
            style={{
              border: '1px solid var(--neon)',
              color: 'var(--neon)',
              background: 'var(--neon-tint, rgba(0,255,200,0.08))',
            }}
            title="只给一个目录，AI 自动整理 + 建库 + 扫描"
          >
            <Sparkles size={14} />
            一键入库
          </button>

          {/* 新增媒体库按钮 — 主要操作 */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary gap-1.5 px-4 py-2 text-sm"
          >
            <FolderPlus size={16} />
            新增媒体库
          </button>

          {/* 排序按钮 */}
          <div className="relative">
            <button
              onClick={() => toggleSort(sortBy === 'name' ? 'created' : sortBy === 'created' ? 'type' : 'name')}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all"
              style={{
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                background: 'transparent',
              }}
              title={`排序: ${sortBy === 'name' ? '名称' : sortBy === 'type' ? '类型' : '创建时间'}`}
            >
              <ArrowUpDown size={14} />
              排序
            </button>
          </div>

          {/* 扫描全部按钮 */}
          {libraries.length > 0 && (
            <button
              onClick={handleScanAll}
              disabled={scanAllLoading}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all disabled:opacity-40"
              style={{
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                background: 'transparent',
              }}
              title="扫描所有媒体库文件"
            >
              {scanAllLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <ScanLine size={14} />
              )}
              {scanAllLoading ? '扫描中...' : '扫描媒体库文件'}
            </button>
          )}
        </div>
      </div>

      {/* ===== 媒体库表格 — 飞牛风格列表 ===== */}
      {libraries.length > 0 ? (
        <div
          className="rounded-xl"
          style={{
            border: '1px solid var(--border-default)',
            background: 'var(--bg-card)',
            overflow: 'visible',
          }}
        >
          {/* 表头 */}
          <div
            className="grid gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider rounded-t-xl"
            style={{
              gridTemplateColumns: '2fr 2fr 1fr 1.5fr 120px',
              borderBottom: '1px solid var(--border-default)',
              color: 'var(--text-tertiary)',
              background: 'var(--nav-hover-bg)',
            }}
          >
            <button
              className="flex items-center gap-1 text-left hover:text-[var(--text-primary)] transition-colors"
              onClick={() => toggleSort('name')}
            >
              媒体库
              {sortBy === 'name' && <ChevronRight size={12} className={clsx('transition-transform', sortAsc ? '-rotate-90' : 'rotate-90')} />}
            </button>
            <span>媒体文件夹</span>
            <button
              className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
              onClick={() => toggleSort('type')}
            >
              类型
              {sortBy === 'type' && <ChevronRight size={12} className={clsx('transition-transform', sortAsc ? '-rotate-90' : 'rotate-90')} />}
            </button>
            <button
              className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
              onClick={() => toggleSort('created')}
            >
              最近更新
              {sortBy === 'created' && <ChevronRight size={12} className={clsx('transition-transform', sortAsc ? '-rotate-90' : 'rotate-90')} />}
            </button>
            <span className="text-center">操作</span>
          </div>

          {/* 列表项 */}
          {sortedLibraries.map((lib) => {
            const typeConfig = TYPE_CONFIG[lib.type] || TYPE_CONFIG.movie
            const TypeIcon = typeConfig.icon
            const isScanning = scanning.has(lib.id)
            const progress = scanProgress[lib.id]
            const scrape = scrapeProgress[lib.id]
            const phase = scanPhase[lib.id]

            // 计算阶段显示文本
            const phaseLabel = phase ? {
              scanning: '扫描文件',
              scraping: '识别信息',
              merging: '合并剧集',
              matching: '匹配合集',
              cleaning: '清理数据',
              completed: '处理完成',
            }[phase.phase] || phase.phase : null

            return (
              <div key={lib.id} className="group relative">
                <div
                  className="grid items-center gap-4 px-5 py-4 transition-colors duration-200"
                  style={{
                    gridTemplateColumns: '2fr 2fr 1fr 1.5fr 120px',
                    borderBottom: '1px solid var(--border-default)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--nav-hover-bg)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* 媒体库名称 */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ background: typeConfig.bg, color: typeConfig.color }}
                    >
                      <TypeIcon size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="truncate text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {lib.name}
                      </h3>
                    {isScanning && (
                        <p className="mt-0.5 text-xs text-neon animate-pulse">
                          {scrape
                            ? `识别中 [${scrape.current}/${scrape.total}] ${scrape.media_title || ''}`
                            : progress?.message
                              ? progress.message
                              : phase
                                ? `${phaseLabel} (${phase.step_current}/${phase.step_total})`
                                : '扫描中...'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 文件夹路径 */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FolderOpen
                      size={14}
                      className="flex-shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                    />
                    {(() => {
                      const allPaths = getLibraryPaths(lib)
                      const pathTitle = allPaths.join('\n')
                      const displayText =
                        allPaths.length > 1
                          ? `${allPaths[0]}  +${allPaths.length - 1}`
                          : allPaths[0] || lib.path
                      return (
                        <span
                          className="truncate text-sm font-mono"
                          style={{ color: 'var(--text-secondary)' }}
                          title={pathTitle}
                        >
                          {displayText}
                        </span>
                      )
                    })()}
                  </div>

                  {/* 类型标签 */}
                  <div>
                    <span
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
                      style={{
                        background: typeConfig.bg,
                        color: typeConfig.color,
                        border: `1px solid ${typeConfig.bg}`,
                      }}
                    >
                      {typeConfig.label}
                    </span>
                  </div>

                  {/* 更新时间 */}
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    <Calendar size={13} className="flex-shrink-0" />
                    <span>{formatDate(lib.last_scan)}</span>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-center gap-1">
                    {/* 扫描媒体库 */}
                    <button
                      onClick={() => handleScan(lib.id)}
                      disabled={scanning.has(lib.id)}
                      className="rounded-lg p-2 transition-all hover:bg-[var(--nav-hover-bg)] disabled:opacity-40"
                      style={{ color: 'var(--text-tertiary)' }}
                      title="扫描媒体库"
                    >
                      {scanning.has(lib.id) ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <ScanLine size={16} />
                      )}
                    </button>

                    {/* 刷新元数据 */}
                    <button
                      onClick={() => setRefreshMetaLib(lib)}
                      className="rounded-lg p-2 transition-all hover:bg-[var(--nav-hover-bg)]"
                      style={{ color: 'var(--text-tertiary)' }}
                      title="刷新元数据"
                    >
                      <RefreshCw
                        size={16}
                        className={clsx(
                          'transition-all',
                        )}
                      />
                    </button>

                    {/* 删除 */}
                    <button
                      onClick={() => handleDelete(lib.id)}
                      className="rounded-lg p-2 text-surface-500 transition-all hover:bg-red-500/5 hover:text-red-400"
                      title="删除媒体库"
                    >
                      <Trash2 size={16} />
                    </button>

                    {/* 编辑媒体库 */}
                    <button
                      onClick={() => setEditingLibrary(lib)}
                      className="rounded-lg p-2 transition-all hover:bg-[var(--nav-hover-bg)]"
                      style={{ color: 'var(--text-tertiary)' }}
                      title="编辑媒体库"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </div>

                {/* 扫描进度条（扫描中显示） */}
                {isScanning && (progress || scrape || phase) && (
                  <div className="px-5 pb-3">
                    {/* 阶段指示器 */}
                    {phase && phase.phase !== 'completed' && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: phase.step_total }, (_, i) => (
                            <div
                              key={i}
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: i < phase.step_current ? '20px' : '8px',
                                background: i < phase.step_current
                                  ? 'var(--neon-blue)'
                                  : 'var(--neon-blue-10)',
                                opacity: i < phase.step_current ? 1 : 0.4,
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-medium" style={{ color: 'var(--neon-blue)' }}>
                          {phaseLabel} ({phase.step_current}/{phase.step_total})
                        </span>
                      </div>
                    )}
                    {/* 进度条 */}
                    <div
                      className="h-1.5 overflow-hidden rounded-full"
                      style={{ background: 'var(--neon-blue-6)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          background: scrape
                            ? 'linear-gradient(90deg, var(--neon-purple), var(--neon-pink))'
                            : 'linear-gradient(90deg, var(--neon-blue), var(--neon-purple))',
                          width: scrape
                            ? `${scrape.total > 0 ? (scrape.current / scrape.total) * 100 : 0}%`
                            : '100%',
                          animation: !scrape ? 'shimmer 2s linear infinite' : undefined,
                          backgroundSize: !scrape ? '200% 100%' : undefined,
                        }}
                      />
                    </div>
                    {/* 刮削详细信息 */}
                    {scrape && scrape.total > 0 && (
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {scrape.media_title || '处理中...'}
                        </span>
                        <span className="text-[11px] font-mono" style={{ color: 'var(--neon-purple)' }}>
                          {scrape.current}/{scrape.total} (成功:{scrape.success} 失败:{scrape.failed})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ===== 空状态 ===== */
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{
            border: '2px dashed var(--border-default)',
            background: 'var(--nav-hover-bg)',
          }}
        >
          <div
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl animate-float"
            style={{
              background: 'var(--neon-blue-5)',
              border: '1px solid var(--neon-blue-10)',
            }}
          >
            <FolderPlus size={32} className="text-surface-600" />
          </div>
          <h3
            className="font-display text-base font-semibold tracking-wide"
            style={{ color: 'var(--text-secondary)' }}
          >
            还没有媒体库
          </h3>
          <p
            className="mt-1.5 mb-5 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            添加媒体库后系统将自动扫描并索引您的视频文件
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary gap-1.5 px-5 py-2.5 text-sm"
          >
            <FolderPlus size={16} />
            新增媒体库
          </button>
        </div>
      )}

      {/* ===== 创建媒体库弹窗 ===== */}
      <CreateLibraryModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />

      {/* ===== 编辑媒体库弹窗 ===== */}
      <EditLibraryModal
        open={!!editingLibrary}
        library={editingLibrary}
        onClose={() => setEditingLibrary(null)}
        onUpdate={(updated) => {
          setLibraries((libs) => libs.map((l) => (l.id === updated.id ? updated : l)))
          toast.success('媒体库已更新')
        }}
      />

      <RefreshMetadataModal
        open={!!refreshMetaLib}
        library={refreshMetaLib}
        onClose={() => setRefreshMetaLib(null)}
        tmdbEnabled={tmdbEnabled}
        doubanEnabled={doubanEnabled}
      />

      {/* ===== 智能重命名已收敛到「扫描归类 · 专家模式」（方案 B） ===== */}

      {/* ===== 一键入库（懒人模式） ===== */}
      <LazyIngestModal
        isOpen={showLazyIngestModal}
        onClose={() => setShowLazyIngestModal(false)}
        onCompleted={() => {
          // 任务完成 → 刷新媒体库列表
          libraryApi
            .list()
            .then((res) => setLibraries(res.data.data || []))
            .catch(() => {})
        }}
      />
    </section>
  )
}
