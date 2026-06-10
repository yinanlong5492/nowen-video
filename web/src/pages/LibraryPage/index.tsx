import { useState } from 'react'
import EditMetadataModal from '@/components/EditMetadataModal'
import RefreshSingleModal from '@/components/RefreshSingleModal'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import Pagination from '@/components/Pagination'
import MusicPlayer from '@/components/MusicPlayer'
import AudioBookPlayer from '@/components/AudioBookPlayer'
import { Film } from 'lucide-react'
import { adminApi } from '@/api'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useLibraryContent } from './hooks/useLibraryContent'
import { useLibraryFilters } from './hooks/useLibraryFilters'
import { useLibraryView } from './hooks/useLibraryView'
import { useLibraryAdmin } from './hooks/useLibraryAdmin'
import LibraryToolbar from './components/LibraryToolbar'
import FilterBar from './components/FilterBar'
import LibraryGridView from './components/LibraryGridView'
import LibraryListView from './components/LibraryListView'
import { MatchModal } from '@/components/common/modals/MatchModal'
import { UnmatchConfirmModal } from '@/components/common/modals/UnmatchConfirmModal'
import LibrarySkeleton from './components/LibrarySkeleton'

export default function LibraryPage() {
  const isAdmin = useIsAdmin()

  const {
    id,
    library,
    mixedItems,
    total,
    loading,
    page,
    size,
    totalPages,
    setPage,
    setSize,
  } = useLibraryContent()

  const {
    searchQuery,
    sortValue,
    showSortDropdown,
    filterGenre,
    showFilters,
    allGenres,
    filteredMixed,
    currentSortLabel,
    setSearchQuery,
    setSortValue,
    setShowSortDropdown,
    setFilterGenre,
    setShowFilters,
    clearFilters,
  } = useLibraryFilters(mixedItems)

  const { viewMode, setViewMode } = useLibraryView()

  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [deleteTargetType, setDeleteTargetType] = useState<'movie' | 'series'>('series')

  const {
    showRefreshModal,
    refreshId,
    refreshTitle,
    showEditModal,
    editId,
    showDeleteConfirm,
    deleteId,
    showUnmatchConfirm,
    unmatchId,
    editForm,
    setShowRefreshModal,
    setEditForm,
    handleRefreshMetadata,
    handleRefreshSuccess,
    handleUnmatchClick,
    handleUnmatch,
    handleEditMetadata,
    handleEditSave,
    handleDeleteClick,
    handleDelete,
  } = useLibraryAdmin()

  const handleManualMatch = (id: string) => {
    setMatchId(id)
    setShowMatchModal(true)
  }

  const handleMatchSuccess = () => {
    setShowMatchModal(false)
    setMatchId(null)
  }

  const handleDeleteClickWithType = (id: string, type: 'movie' | 'series') => {
    setDeleteTargetType(type)
    handleDeleteClick(id)
  }

  // 库信息尚未加载完毕时，显示骨架屏
  if (loading && !library) {
    return <LibrarySkeleton />
  }

  // 加载完毕但未找到库信息
  if (!library) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-theme-secondary">媒体库未找到</p>
          <p className="text-theme-tertiary text-sm mt-2">该媒体库可能已被删除</p>
        </div>
      </div>
    )
  }

  // 如果是音乐库，渲染音乐播放器
  if (library.type === 'music') {
    return <MusicPlayer libraryId={id!} libraryName={library.name} />
  }

  // 如果是有声书库，渲染有声书播放器
  if (library.type === 'audiobook') {
    return <AudioBookPlayer libraryId={id!} libraryName={library.name} />
  }

  return (
    <div className="pr-20">
      {/* ===== 工具栏 ===== */}
      <LibraryToolbar
        sortValue={sortValue}
        showSortDropdown={showSortDropdown}
        filterGenre={filterGenre}
        showFilters={showFilters}
        viewMode={viewMode}
        currentSortLabel={currentSortLabel}
        searchQuery={searchQuery}
        filteredCount={filteredMixed.length}
        onSortChange={setSortValue}
        onShowSortDropdown={setShowSortDropdown}
        onShowFilters={setShowFilters}
        onViewModeChange={setViewMode}
        onClearFilters={clearFilters}
      />

      {/* ===== 类型筛选标签行 ===== */}
      <FilterBar
        show={showFilters}
        genres={allGenres}
        selectedGenre={filterGenre}
        onGenreSelect={setFilterGenre}
      />

      {/* ===== 内容视图 ===== */}
      {viewMode === 'grid' ? (
        <LibraryGridView
          loading={loading}
          items={filteredMixed}
          isAdmin={isAdmin}
          onManualMatch={handleManualMatch}
          onUnmatch={handleUnmatchClick}
          onRefreshMetadata={handleRefreshMetadata}
          onEditMetadata={handleEditMetadata}
          onDelete={handleDeleteClickWithType}
        />
      ) : (
        <LibraryListView items={filteredMixed} />
      )}

      {/* 分页 */}
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={size}
        pageSizeOptions={[20, 30, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={setSize}
      />

      {/* 空状态 */}
      {!loading && filteredMixed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Film size={48} className="mb-4 text-surface-700" />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {searchQuery || filterGenre ? '没有找到匹配的内容' : '此媒体库暂无内容'}
          </p>
        </div>
      )}

      {/* ===== 弹窗 ===== */}

      {/* 刷新弹窗 */}
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

      {/* 手动匹配弹窗 */}
      <MatchModal
        open={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        mediaId={matchId!}
        strategyType={{ type: 'tv', source: 'tmdb' }}
        defaultTitle={''}
        onMatchSuccess={handleMatchSuccess}
      />

      {/* 编辑元数据弹窗 */}
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
          onClose={() => handleEditMetadata(null)}
        />
      )}

      {/* 解除匹配确认弹窗 */}
      <UnmatchConfirmModal
        open={showUnmatchConfirm}
        onClose={() => handleUnmatchClick(null)}
        onConfirm={handleUnmatch}
        title="解除匹配剧集"
        description="确定要解除此剧集的元数据匹配吗？"
      />

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          open={showDeleteConfirm}
          title={deleteTargetType === 'movie' ? '删除电影' : '删除剧集'}
          description={deleteTargetType === 'movie' 
            ? '确定要删除这部电影吗？此操作不可撤销。' 
            : '确定要删除这部剧集吗？此操作将删除所有季和集，不可撤销。'}
          hint={deleteTargetType === 'movie'
            ? '删除后，电影将从媒体库中移除。选择"移除并删除文件"将同时删除本地文件。'
            : '删除后，剧集及其所有季和集将从媒体库中移除。选择"移除并删除文件"将同时删除本地文件。'}
          onClose={() => handleDeleteClick(null)}
          onDelete={(deleteFiles: boolean) => handleDelete(deleteFiles, deleteTargetType)}
        />
      )}
    </div>
  )
}
