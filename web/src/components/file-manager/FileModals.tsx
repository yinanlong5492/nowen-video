import { useState } from 'react'
import type { Media, Library, ScannedFile, FileImportRequest, FileOperationLog, RenamePreview, RenameTemplate } from '@/types'
import { fileManagerApi } from '@/api'
import { useToast } from '@/components/Toast'
import {
  Plus, Upload, Search, Loader2, Check, X, Eye, Edit3, Save,
  FileVideo, Sparkles, Wand2, ScanLine, CheckSquare, Square,
  HardDrive, History, Languages, ChevronsUpDown, Trash2,
} from 'lucide-react'
import clsx from 'clsx'
import { formatFileSize, LANGUAGE_OPTIONS } from './constants'
import { formatDuration } from '@/utils/format'
import { streamApi } from '@/api/stream'
import { getAudioBookCoverUrl } from '@/api'

// ==================== 导入文件对话框 ====================
interface ImportFileModalProps {
  libraries: Library[]
  onClose: () => void
  onSuccess: () => void
}

export function ImportFileModal({ libraries, onClose, onSuccess }: ImportFileModalProps) {
  const toast = useToast()
  const [importPath, setImportPath] = useState('')
  const [importTitle, setImportTitle] = useState('')
  const [importMediaType, setImportMediaType] = useState('movie')
  const [importLibraryId, setImportLibraryId] = useState('')
  const [importing, setImporting] = useState(false)

  const handleImport = async () => {
    if (!importPath) { toast.error('请输入文件路径'); return }
    setImporting(true)
    try {
      await fileManagerApi.importFile({
        file_path: importPath, title: importTitle || undefined,
        media_type: importMediaType, library_id: importLibraryId || undefined,
      })
      toast.success('文件导入成功')
      onClose()
      onSuccess()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '导入失败')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="glass-panel-strong rounded-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          <Plus className="inline-block mr-2 mb-0.5" size={20} /> 导入影视文件
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>文件路径 *</label>
            <input type="text" value={importPath} onChange={e => setImportPath(e.target.value)}
              placeholder="/path/to/movie.mkv" className="input-field w-full px-3 py-2 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>标题（留空自动提取）</label>
            <input type="text" value={importTitle} onChange={e => setImportTitle(e.target.value)}
              placeholder="自动从文件名提取" className="input-field w-full px-3 py-2 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>媒体类型</label>
              <select value={importMediaType} onChange={e => setImportMediaType(e.target.value)}
                className="input-field w-full px-3 py-2 rounded-lg text-sm">
                <option value="movie">电影</option>
                <option value="episode">剧集</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>媒体库</label>
              <select value={importLibraryId} onChange={e => setImportLibraryId(e.target.value)}
                className="input-field w-full px-3 py-2 rounded-lg text-sm">
                <option value="">不指定</option>
                {libraries.map(lib => <option key={lib.id} value={lib.id}>{lib.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost px-4 py-2 rounded-lg text-sm">取消</button>
          <button onClick={handleImport} disabled={importing}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm">
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {importing ? '导入中...' : '导入'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== 扫描目录对话框 ====================
interface ScanDirectoryModalProps {
  libraries: Library[]
  onClose: () => void
  onSuccess: () => void
}

export function ScanDirectoryModal({ libraries, onClose, onSuccess }: ScanDirectoryModalProps) {
  const toast = useToast()
  const [scanPath, setScanPath] = useState('')
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanSelectedPaths, setScanSelectedPaths] = useState<Set<string>>(new Set())
  const [importMediaType, setImportMediaType] = useState('movie')
  const [importLibraryId, setImportLibraryId] = useState('')
  const [importing, setImporting] = useState(false)

  const handleScan = async () => {
    if (!scanPath) { toast.error('请输入目录路径'); return }
    setScanning(true)
    try {
      const res = await fileManagerApi.scanDirectory(scanPath)
      setScannedFiles(res.data.data || [])
      setScanSelectedPaths(new Set())
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '扫描失败')
    } finally {
      setScanning(false)
    }
  }

  const handleBatchImport = async () => {
    const filesToImport: FileImportRequest[] = Array.from(scanSelectedPaths).map(path => {
      const file = scannedFiles.find(f => f.path === path)
      return { file_path: path, title: file?.title || '', media_type: importMediaType, library_id: importLibraryId || undefined }
    })
    if (filesToImport.length === 0) { toast.error('请选择要导入的文件'); return }
    setImporting(true)
    try {
      const res = await fileManagerApi.batchImportFiles(filesToImport)
      const result = res.data.data
      toast.success(`导入完成: 成功 ${result.success}, 跳过 ${result.skipped}, 失败 ${result.failed}`)
      onClose()
      onSuccess()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '批量导入失败')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="glass-panel-strong rounded-2xl p-6 w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          <ScanLine className="inline-block mr-2 mb-0.5" size={20} /> 扫描目录导入
        </h3>
        <div className="flex gap-2 mb-4">
          <input type="text" value={scanPath} onChange={e => setScanPath(e.target.value)}
            placeholder="输入目录路径，如 /media/movies" className="input-field flex-1 px-3 py-2 rounded-lg text-sm" />
          <button onClick={handleScan} disabled={scanning}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm whitespace-nowrap">
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            扫描
          </button>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <select value={importMediaType} onChange={e => setImportMediaType(e.target.value)}
            className="input-field px-2 py-1 text-xs rounded">
            <option value="movie">电影</option>
            <option value="episode">剧集</option>
          </select>
          <select value={importLibraryId} onChange={e => setImportLibraryId(e.target.value)}
            className="input-field px-2 py-1 text-xs rounded">
            <option value="">不指定媒体库</option>
            {libraries.map(lib => <option key={lib.id} value={lib.id}>{lib.name}</option>)}
          </select>
          {scannedFiles.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              找到 {scannedFiles.length} 个视频文件，已选 {scanSelectedPaths.size} 个
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {scannedFiles.length > 0 ? (
            <div className="space-y-1">
              <button onClick={() => {
                const unimported = scannedFiles.filter(f => !f.imported).map(f => f.path)
                setScanSelectedPaths(prev => prev.size === unimported.length ? new Set() : new Set(unimported))
              }} className="text-xs text-neon hover:underline mb-2">
                {scanSelectedPaths.size === scannedFiles.filter(f => !f.imported).length ? '取消全选' : '全选未导入'}
              </button>
              {scannedFiles.map((file, i) => (
                <div key={i} className={clsx('flex items-center gap-3 px-3 py-2 rounded-lg text-sm', file.imported ? 'opacity-50' : 'hover:bg-white/[0.02]')}>
                  <button onClick={() => {
                    if (file.imported) return
                    setScanSelectedPaths(prev => {
                      const next = new Set(prev)
                      if (next.has(file.path)) next.delete(file.path); else next.add(file.path)
                      return next
                    })
                  }} disabled={file.imported}>
                    {file.imported ? <Check size={16} className="text-green-400" /> :
                      scanSelectedPaths.has(file.path) ? <CheckSquare size={16} className="text-neon" /> : <Square size={16} className="text-surface-500" />}
                  </button>
                  <FileVideo size={16} className="text-surface-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{file.path}</div>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{formatFileSize(file.size)}</span>
                  {file.imported && <span className="text-xs text-green-400 flex-shrink-0">已导入</span>}
                </div>
              ))}
            </div>
          ) : !scanning && (
            <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>输入目录路径后点击扫描</div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <button onClick={onClose} className="btn-ghost px-4 py-2 rounded-lg text-sm">取消</button>
          <button onClick={handleBatchImport} disabled={importing || scanSelectedPaths.size === 0}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm">
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            导入选中 ({scanSelectedPaths.size})
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== 编辑对话框 ====================
interface EditFileModalProps {
  media: Media
  onClose: () => void
  onSuccess: () => void
}

export function EditFileModal({ media, onClose, onSuccess }: EditFileModalProps) {
  const toast = useToast()
  const isMusic = media.media_type === 'music'

  // 初始化表单数据 - 根据媒体类型使用不同的字段
  const [editForm, setEditForm] = useState<Record<string, unknown>>(() => {
    if (isMusic) {
      return {
        title: media.title,
        orig_title: (media as any).orig_title || '',
        alias: (media as any).alias || '',
        file_name: (media as any).file_name || '',
        artist: (media as any).artist || '',
        artist_group: (media as any).artist_group || '',
        band: (media as any).band || '',
        album: (media as any).album || '',
        album_artist: (media as any).album_artist || '',
        folder_level: (media as any).folder_level || 0,
        lyricist: (media as any).lyricist || '',
        composer: (media as any).composer || '',
        arranger: (media as any).arranger || '',
        original_singer: (media as any).original_singer || '',
        year: (media as any).year || 0,
        album_release_date: (media as any).album_release_date || '',
        record_label: (media as any).record_label || '',
        album_type: (media as any).album_type || '',
        music_language: (media as any).music_language || '',
        genre: (media as any).genre || '',
        tags: (media as any).tags || '',
        key: (media as any).key || '',
        isrc: (media as any).isrc || '',
        is_ost: (media as any).is_ost || false,
        notes: (media as any).notes || '',
        track_num: (media as any).track_num || 0,
        disc_num: (media as any).disc_num || 0,
      }
    }
    return {
      title: media.title, orig_title: media.orig_title, year: media.year,
      overview: media.overview, genres: media.genres, rating: media.rating,
      media_type: media.media_type, country: media.country, language: media.language,
    }
  })

  const handleSave = async () => {
    try {
      await fileManagerApi.updateFile(media.id, editForm)
      toast.success('更新成功')
      onClose()
      onSuccess()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '更新失败')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-panel-strong rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            <Edit3 className="inline-block mr-2 mb-0.5" size={20} /> 编辑文件信息
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors hover:bg-white/10" style={{ color: 'var(--text-tertiary)' }}>
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          {isMusic ? (
            // 音乐文件编辑字段
            <>
              {/* 一、核心基础 */}
              {[
                { key: 'title', label: '歌曲名称', type: 'text' },
                { key: 'orig_title', label: '原版名', type: 'text' },
                { key: 'alias', label: '别名', type: 'text' },
                { key: 'file_name', label: '文件名', type: 'text' },
                { key: 'artist', label: '歌手名', type: 'text' },
                { key: 'artist_group', label: '歌手分组', type: 'text' },
                { key: 'band', label: '乐队', type: 'text' },
                { key: 'album', label: '专辑名', type: 'text' },
                { key: 'album_artist', label: '专辑艺术家', type: 'text' },
                { key: 'folder_level', label: '目录层级', type: 'number' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{field.label}</label>
                  <input type={field.type} value={editForm[field.key] as string || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className="input" />
                </div>
              ))}
              {/* 二、创作制作 */}
              {[
                { key: 'lyricist', label: '作词', type: 'text' },
                { key: 'composer', label: '作曲', type: 'text' },
                { key: 'arranger', label: '编曲', type: 'text' },
                { key: 'original_singer', label: '原唱', type: 'text' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{field.label}</label>
                  <input type={field.type} value={editForm[field.key] as string || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="input" />
                </div>
              ))}
              {/* 四、专辑发行 */}
              {[
                { key: 'year', label: '年份', type: 'number' },
                { key: 'album_release_date', label: '发行日期', type: 'text', placeholder: 'YYYY-MM-DD' },
                { key: 'record_label', label: '唱片公司', type: 'text' },
                { key: 'album_type', label: '专辑类型', type: 'text', placeholder: 'album,single,ep,compilation' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{field.label}</label>
                  <input type={field.type} value={editForm[field.key] as string || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    placeholder={field.placeholder} className="input" />
                </div>
              ))}
              {/* 五、分类检索标签 */}
              {[
                { key: 'music_language', label: '语种', type: 'text', placeholder: '国语,粤语,英语,日语' },
                { key: 'genre', label: '曲风', type: 'text', placeholder: '流行,摇滚,电子,古典' },
                { key: 'tags', label: '风格标签', type: 'text', placeholder: '治愈,燃系,睡前,运动' },
                { key: 'key', label: '调式', type: 'text', placeholder: 'C Major, A Minor' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{field.label}</label>
                  <input type={field.type} value={editForm[field.key] as string || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder} className="input" />
                </div>
              ))}
              {/* 七、拓展实用 */}
              {[
                { key: 'isrc', label: 'ISRC 编码', type: 'text', placeholder: 'CN-XXX-XX-XXXXX' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{field.label}</label>
                  <input type={field.type} value={editForm[field.key] as string || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder} className="input" />
                </div>
              ))}
              <div className="flex items-center gap-3">
                <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>影视原声</label>
                <input type="checkbox" checked={!!editForm.is_ost}
                  onChange={e => setEditForm(prev => ({ ...prev, is_ost: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[var(--neon-blue)]" />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>备注</label>
                <textarea value={editForm.notes as string || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3} className="input resize-none" />
              </div>
              {/* 八、排序索引 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>曲目序号</label>
                  <input type="number" value={editForm.track_num as number || 0}
                    onChange={e => setEditForm(prev => ({ ...prev, track_num: Number(e.target.value) }))}
                    className="input" />
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>碟片编号</label>
                  <input type="number" value={editForm.disc_num as number || 0}
                    onChange={e => setEditForm(prev => ({ ...prev, disc_num: Number(e.target.value) }))}
                    className="input" />
                </div>
              </div>
            </>
          ) : (
            // 影视文件编辑字段
            <>
              {[
                { key: 'title', label: '标题', type: 'text' },
                { key: 'orig_title', label: '原始标题', type: 'text' },
                { key: 'year', label: '年份', type: 'number' },
                { key: 'genres', label: '类型', type: 'text', placeholder: '动作,科幻,冒险' },
                { key: 'rating', label: '评分', type: 'number' },
                { key: 'country', label: '国家/地区', type: 'text' },
                { key: 'language', label: '语言', type: 'text' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{field.label}</label>
                  <input type={field.type} value={editForm[field.key] as string || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    placeholder={field.placeholder} className="input" />
                </div>
              ))}
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>简介</label>
                <textarea value={editForm.overview as string || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, overview: e.target.value }))}
                  rows={4} className="input resize-none" />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>媒体类型</label>
                <select value={editForm.media_type as string || 'movie'}
                  onChange={e => setEditForm(prev => ({ ...prev, media_type: e.target.value }))}
                  className="input">
                  <option value="movie">电影</option>
                  <option value="episode">剧集</option>
                </select>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost px-4 py-2 rounded-lg text-sm">取消</button>
          <button onClick={handleSave} className="btn-primary px-4 py-2 rounded-lg text-sm">
            <Save size={14} className="inline-block mr-1 mb-0.5" />
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== 详情对话框 ====================
interface FileDetailModalProps {
  media: Media
  onClose: () => void
  onEdit: () => void
  onScrape: () => void
}

export function FileDetailModal({ media, onClose, onEdit, onScrape }: FileDetailModalProps) {
  const isMusic = media.media_type === 'music'
  const isAudiobook = media.media_type === 'audiobook'

  const getPosterSrc = () => {
    if (isMusic) return (window as any).$apiRoot + '/music/tracks/' + media.id + '/cover'
    if (isAudiobook) {
      const chIdx = media.id.indexOf('_ch_')
      const bookId = chIdx > 0 ? media.id.substring(0, chIdx) : media.id
      return getAudioBookCoverUrl(bookId)
    }
    return streamApi.getPosterUrl(media.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="glass-panel-strong rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            <Eye className="inline-block mr-2 mb-0.5" size={20} /> 文件详情
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10"><X size={18} /></button>
        </div>
        <div className="flex gap-4">
          <div className="w-32 h-48 rounded-lg overflow-hidden flex-shrink-0 bg-surface-800">
            <img
              src={getPosterSrc()}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <div className="flex-1 space-y-2 text-sm">
            {isMusic ? (
              // 音乐文件详情字段
              <>
                <div><span style={{ color: 'var(--text-tertiary)' }}>歌曲名称：</span><span style={{ color: 'var(--text-primary)' }}>{media.title}</span></div>
                {(media as any).orig_title && <div><span style={{ color: 'var(--text-tertiary)' }}>原版名：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).orig_title}</span></div>}
                {(media as any).alias && <div><span style={{ color: 'var(--text-tertiary)' }}>别名：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).alias}</span></div>}
                {(media as any).artist && <div><span style={{ color: 'var(--text-tertiary)' }}>歌手名：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).artist}</span></div>}
                {(media as any).artist_group && <div><span style={{ color: 'var(--text-tertiary)' }}>歌手分组：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).artist_group}</span></div>}
                {(media as any).band && <div><span style={{ color: 'var(--text-tertiary)' }}>乐队：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).band}</span></div>}
                {(media as any).album && <div><span style={{ color: 'var(--text-tertiary)' }}>专辑名：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).album}</span></div>}
                {(media as any).album_artist && <div><span style={{ color: 'var(--text-tertiary)' }}>专辑艺术家：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).album_artist}</span></div>}
                {(media as any).composer && <div><span style={{ color: 'var(--text-tertiary)' }}>作曲：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).composer}</span></div>}
                {(media as any).lyricist && <div><span style={{ color: 'var(--text-tertiary)' }}>作词：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).lyricist}</span></div>}
                {(media as any).arranger && <div><span style={{ color: 'var(--text-tertiary)' }}>编曲：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).arranger}</span></div>}
                {(media as any).original_singer && <div><span style={{ color: 'var(--text-tertiary)' }}>原唱：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).original_singer}</span></div>}
                {(media as any).genre && <div><span style={{ color: 'var(--text-tertiary)' }}>曲风：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).genre}</span></div>}
                {(media as any).tags && <div><span style={{ color: 'var(--text-tertiary)' }}>标签：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).tags}</span></div>}
                {(media as any).music_language && <div><span style={{ color: 'var(--text-tertiary)' }}>语种：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).music_language}</span></div>}
                {(media as any).key && <div><span style={{ color: 'var(--text-tertiary)' }}>调式：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).key}</span></div>}
                <div><span style={{ color: 'var(--text-tertiary)' }}>年份：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).year || '-'}</span></div>
                {(media as any).album_release_date && <div><span style={{ color: 'var(--text-tertiary)' }}>发行日期：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).album_release_date}</span></div>}
                {(media as any).record_label && <div><span style={{ color: 'var(--text-tertiary)' }}>唱片公司：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).record_label}</span></div>}
                {(media as any).album_type && <div><span style={{ color: 'var(--text-tertiary)' }}>专辑类型：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).album_type}</span></div>}
                {(media as any).isrc && <div><span style={{ color: 'var(--text-tertiary)' }}>ISRC：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).isrc}</span></div>}
                {(media as any).is_ost && <div><span style={{ color: 'var(--text-tertiary)' }}>影视原声：</span><span style={{ color: 'var(--text-secondary)' }}>是</span></div>}
                {(media as any).track_num > 0 && <div><span style={{ color: 'var(--text-tertiary)' }}>曲目序号：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).track_num}</span></div>}
                {(media as any).disc_num > 0 && <div><span style={{ color: 'var(--text-tertiary)' }}>碟片编号：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).disc_num}</span></div>}
                {(media as any).notes && <div><span style={{ color: 'var(--text-tertiary)' }}>备注：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).notes}</span></div>}
                <div><span style={{ color: 'var(--text-tertiary)' }}>文件名：</span><span style={{ color: 'var(--text-secondary)' }}>{(media as any).file_name || media.title}</span></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>文件大小：</span><span style={{ color: 'var(--text-secondary)' }}>{media.file_size > 0 ? formatFileSize(media.file_size) : '-'}</span></div>
              </>
            ) : isAudiobook ? (
              // 有声书详情字段
              <>
                <div><span style={{ color: 'var(--text-tertiary)' }}>章节名：</span><span style={{ color: 'var(--text-primary)' }}>{media.title}</span></div>
                {media.artist && <div><span style={{ color: 'var(--text-tertiary)' }}>作者：</span><span style={{ color: 'var(--text-secondary)' }}>{media.artist}</span></div>}
                <div><span style={{ color: 'var(--text-tertiary)' }}>年份：</span><span style={{ color: 'var(--text-secondary)' }}>{media.year || '-'}</span></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>评分：</span>{media.rating > 0 ? <span className="text-amber-400">★ {media.rating.toFixed(1)}</span> : <span style={{ color: 'var(--text-secondary)' }}>-</span>}</div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>类型：</span><span style={{ color: 'var(--text-secondary)' }}>{media.genres || '-'}</span></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>媒体类型：</span><span className="text-amber-400">有声书</span></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>时长：</span><span style={{ color: 'var(--text-secondary)' }}>{media.duration > 0 ? formatDuration(media.duration) : '-'}</span></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>文件大小：</span><span style={{ color: 'var(--text-secondary)' }}>{media.file_size > 0 ? formatFileSize(media.file_size) : '-'}</span></div>
              </>
            ) : (
              // 影视文件详情字段
              <>
                <div><span style={{ color: 'var(--text-tertiary)' }}>标题：</span><span style={{ color: 'var(--text-primary)' }}>{media.title}</span></div>
                {media.orig_title && <div><span style={{ color: 'var(--text-tertiary)' }}>原始标题：</span><span style={{ color: 'var(--text-secondary)' }}>{media.orig_title}</span></div>}
                <div><span style={{ color: 'var(--text-tertiary)' }}>年份：</span><span style={{ color: 'var(--text-secondary)' }}>{media.year || '-'}</span></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>评分：</span>{media.rating > 0 ? <span className="text-amber-400">★ {media.rating.toFixed(1)}</span> : <span style={{ color: 'var(--text-secondary)' }}>-</span>}</div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>类型：</span><span style={{ color: 'var(--text-secondary)' }}>{media.genres || '-'}</span></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>媒体类型：</span><span className={media.media_type === 'movie' ? 'text-purple-400' : 'text-green-400'}>{media.media_type === 'movie' ? '电影' : '剧集'}</span></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>分辨率：</span><span style={{ color: 'var(--text-secondary)' }}>{media.resolution || '-'}</span></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>文件大小：</span><span style={{ color: 'var(--text-secondary)' }}>{media.file_size > 0 ? formatFileSize(media.file_size) : '-'}</span></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>国家：</span><span style={{ color: 'var(--text-secondary)' }}>{media.country || '-'}</span></div>
                <div><span style={{ color: 'var(--text-tertiary)' }}>语言：</span><span style={{ color: 'var(--text-secondary)' }}>{media.language || '-'}</span></div>
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-tertiary)' }}>TMDb ID：</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{media.tmdb_id || '-'}</span>
                  {media.bangumi_id > 0 && <><span style={{ color: 'var(--text-tertiary)' }}>Bangumi：</span><span style={{ color: 'var(--text-secondary)' }}>{media.bangumi_id}</span></>}
                </div>
              </>
            )}
          </div>
        </div>
        {!isMusic && media.overview && (
          <div className="mt-4">
            <div className="text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>简介</div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{media.overview}</p>
          </div>
        )}
        <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-xs flex items-center gap-1 mb-1" style={{ color: 'var(--text-tertiary)' }}>
            <HardDrive size={12} /> 文件路径
          </div>
          <div className="text-xs font-mono break-all" style={{ color: 'var(--text-secondary)' }}>{media.file_path}</div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onEdit} className="btn-ghost flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm">
            <Edit3 size={14} /> 编辑
          </button>
          {!isMusic && (
            <button onClick={onScrape} className="btn-primary flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm">
              <Sparkles size={14} /> 刮削元数据
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== 重命名对话框 ====================
interface RenameModalProps {
  selectedCount: number
  selectedIds: Set<string>
  onClose: () => void
  onSuccess: () => void
}

export function RenameModal({ selectedCount, selectedIds, onClose, onSuccess }: RenameModalProps) {
  const toast = useToast()
  const [useAIRename, setUseAIRename] = useState(false)
  const [renameTemplate, setRenameTemplate] = useState('{title} ({year}) [{resolution}]')
  const [renamePreviews, setRenamePreviews] = useState<RenamePreview[]>([])
  const [renameTemplates, setRenameTemplates] = useState<RenameTemplate[]>([])
  const [renaming, setRenaming] = useState(false)
  const [targetLang, setTargetLang] = useState(() => localStorage.getItem('rename_target_lang') || '')
  const [previewsExpanded, setPreviewsExpanded] = useState(true)

  // 加载模板
  useState(() => {
    fileManagerApi.getRenameTemplates().then(res => setRenameTemplates(res.data.data || [])).catch(() => {})
  })

  const handleTargetLangChange = (lang: string) => {
    setTargetLang(lang)
    localStorage.setItem('rename_target_lang', lang)
    if (renamePreviews.length > 0) setRenamePreviews([])
  }

  const handlePreview = async () => {
    setRenaming(true)
    try {
      const ids = Array.from(selectedIds)
      const res = useAIRename
        ? await fileManagerApi.aiGenerateRenames(ids, targetLang || undefined)
        : await fileManagerApi.previewRename(ids, renameTemplate)
      setRenamePreviews(res.data.data || [])
      setPreviewsExpanded(true)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '生成预览失败')
    } finally {
      setRenaming(false)
    }
  }

  const handleExecute = async () => {
    setRenaming(true)
    try {
      const res = await fileManagerApi.executeRename(Array.from(selectedIds), renameTemplate)
      toast.success(`已重命名 ${res.data.renamed} 个文件`)
      onClose()
      onSuccess()
    } catch {
      toast.error('重命名失败')
    } finally {
      setRenaming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="glass-panel-strong rounded-2xl p-6 w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          <Wand2 className="inline-block mr-2 mb-0.5" size={20} /> AI批量重命名
          <span className="text-xs font-normal ml-2 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
            已选 {selectedCount} 个文件
          </span>
        </h3>

        {/* 模式选择 */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={!useAIRename} onChange={() => setUseAIRename(false)} className="accent-[var(--neon-blue)]" />
            <span className={clsx('text-sm', !useAIRename ? 'text-neon font-medium' : '')} style={{ color: useAIRename ? 'var(--text-secondary)' : undefined }}>模板重命名</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={useAIRename} onChange={() => setUseAIRename(true)} className="accent-[var(--neon-blue)]" />
            <span className={clsx('text-sm', useAIRename ? 'text-neon font-medium' : '')} style={{ color: !useAIRename ? 'var(--text-secondary)' : undefined }}>
              <Sparkles size={12} className="inline-block mr-1 mb-0.5" />AI智能重命名
            </span>
          </label>
        </div>

        {/* 模板选择 */}
        {!useAIRename && (
          <div className="mb-4 space-y-2">
            <label className="block text-sm" style={{ color: 'var(--text-secondary)' }}>命名模板</label>
            <input type="text" value={renameTemplate} onChange={e => setRenameTemplate(e.target.value)}
              className="input-field w-full px-3 py-2 rounded-lg text-sm font-mono" />
            <div className="flex flex-wrap gap-1.5">
              {renameTemplates.map((t, i) => (
                <button key={i} onClick={() => setRenameTemplate(t.pattern)}
                  className={clsx('px-2 py-1 rounded text-xs border transition-all', renameTemplate === t.pattern ? 'border-neon text-neon bg-neon-blue/5' : 'border-surface-700 text-surface-400 hover:border-surface-500')}
                  title={`示例: ${t.example}`}>
                  {t.pattern}
                </button>
              ))}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              可用变量: {'{title}'} {'{orig_title}'} {'{year}'} {'{resolution}'} {'{media_type}'}
            </div>
          </div>
        )}

        {/* AI模式 - 语言选择器 */}
        {useAIRename && (
          <div className="mb-4 space-y-2">
            <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Languages size={14} /> 目标翻译语言
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGE_OPTIONS.map(lang => (
                <button key={lang.value} onClick={() => handleTargetLangChange(lang.value)}
                  className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all',
                    targetLang === lang.value
                      ? 'border-neon text-neon bg-neon-blue/10 shadow-[0_0_8px_rgba(0,170,255,0.15)]'
                      : 'border-surface-700 text-surface-400 hover:border-surface-500 hover:text-surface-300'
                  )}>
                  <span>{lang.flag}</span><span>{lang.label}</span>
                </button>
              ))}
            </div>
            {targetLang && (
              <div className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                <Sparkles size={10} />
                AI将生成规范化标题并翻译为 {LANGUAGE_OPTIONS.find(l => l.value === targetLang)?.label}
              </div>
            )}
          </div>
        )}

        {/* 预览按钮 */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={handlePreview} disabled={renaming}
            className="btn-ghost flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm">
            {renaming ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            {renaming ? '生成中...' : '生成预览'}
          </button>
          {renamePreviews.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>共 {renamePreviews.length} 条预览结果</span>
          )}
        </div>

        {/* 预览列表 */}
        <div className="flex-1 min-h-0 flex flex-col">
          {renamePreviews.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => setPreviewsExpanded(!previewsExpanded)}
                  className="flex items-center gap-1 text-xs hover:text-neon transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                  <ChevronsUpDown size={12} />{previewsExpanded ? '折叠预览' : '展开预览'}
                </button>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">{renamePreviews.length} 项将被重命名</span>
              </div>
              {previewsExpanded && (
                <div className="overflow-y-auto pr-1" style={{ maxHeight: 'calc(85vh - 420px)', minHeight: '120px', scrollBehavior: 'smooth', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>
                  <div className="space-y-2">
                    {renamePreviews.map((p, i) => (
                      <div key={i} className="p-3 rounded-lg transition-colors hover:ring-1 hover:ring-white/5" style={{ background: 'var(--bg-secondary)' }}>
                        <div className="flex items-start gap-3 text-sm">
                          <span className="text-xs font-mono text-surface-500 mt-0.5 flex-shrink-0 w-5 text-right">{i + 1}</span>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-red-400/80 line-through break-all" style={{ wordBreak: 'break-word' }}>{p.old_title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span style={{ color: 'var(--text-tertiary)' }}>↓</span>
                              <span className="text-green-400 font-medium break-all" style={{ wordBreak: 'break-word' }}>{p.new_title}</span>
                            </div>
                          </div>
                        </div>
                        {p.reason && (
                          <div className="text-xs mt-2 ml-8 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                            <Sparkles size={10} className="flex-shrink-0" />{p.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-8">
                <Wand2 size={32} className="mx-auto mb-3 text-surface-600" />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {useAIRename ? '选择语言后点击"生成预览"查看AI重命名效果' : '点击"生成预览"查看重命名效果'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <button onClick={onClose} className="btn-ghost px-4 py-2 rounded-lg text-sm">取消</button>
          <button onClick={handleExecute} disabled={renaming || renamePreviews.length === 0}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm">
            {renaming ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            执行重命名 {renamePreviews.length > 0 && `(${renamePreviews.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== 操作日志对话框 ====================
interface OperationLogsModalProps {
  onClose: () => void
}

export function OperationLogsModal({ onClose }: OperationLogsModalProps) {
  const [opLogs, setOpLogs] = useState<FileOperationLog[]>([])

  useState(() => {
    fileManagerApi.getOperationLogs(50).then(res => setOpLogs(res.data.data || [])).catch(() => {})
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="glass-panel-strong rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          <History className="inline-block mr-2 mb-0.5" size={20} /> 操作日志
        </h3>
        <div className="flex-1 overflow-y-auto min-h-0">
          {opLogs.length > 0 ? (
            <div className="space-y-2">
              {opLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <div className={clsx('mt-0.5 p-1 rounded', {
                    'bg-green-500/10 text-green-400': log.action === 'import',
                    'bg-blue-500/10 text-blue-400': log.action === 'edit',
                    'bg-red-500/10 text-red-400': log.action === 'delete',
                    'bg-purple-500/10 text-purple-400': log.action === 'scrape',
                    'bg-amber-500/10 text-amber-400': log.action === 'rename',
                  })}>
                    {log.action === 'import' && <Upload size={14} />}
                    {log.action === 'edit' && <Edit3 size={14} />}
                    {log.action === 'delete' && <Trash2 size={14} />}
                    {log.action === 'scrape' && <Sparkles size={14} />}
                    {log.action === 'rename' && <Wand2 size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{log.detail}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{new Date(log.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>暂无操作记录</div>
          )}
        </div>
        <div className="flex justify-end mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <button onClick={onClose} className="btn-ghost px-4 py-2 rounded-lg text-sm">关闭</button>
        </div>
      </div>
    </div>
  )
}
