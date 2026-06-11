import { Film } from 'lucide-react'
import { adminApi } from '@/api'
import { usePermissions } from '@/hooks/useAuth'
import { useMediaActions } from '@/hooks/useMedia'
import { PageLoader } from '@/components/common/PageLoader'
import { EmptyState } from '@/components/common/EmptyState'
import { MediaModals } from '@/components/common/MediaModals'
import { useLibraryContent } from './hooks/useLibraryContent'
import { useLibraryFilters } from './hooks/useLibraryFilters'
import { useLibraryView } from './hooks/useLibraryView'
import { useLibraryDetailPageModalConfig } from '@/hooks/useMediaModalConfig'
import LibraryToolbar from './components/LibraryToolbar'
import FilterBar from './components/FilterBar'
import LibraryGridView from './components/LibraryGridView'
import LibraryListView from './components/LibraryListView'
import LibrarySkeleton from './components/LibrarySkeleton'
import MusicPlayer from '@/components/MusicPlayer'
import AudioBookPlayer from '@/components/AudioBookPlayer'
import Pagination from '@/components/Pagination'

export default function LibraryPage() {
  const { isAdmin } = usePermissions()

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
    setSortValue,
    setShowSortDropdown,
    setFilterGenre,
    setShowFilters,
    clearFilters,
  } = useLibraryFilters(mixedItems)

  const { viewMode, setViewMode } = useLibraryView()

  // 使用统一的弹窗配置 hook
  const {
    showRefreshModal,
    showMatchModal,
    showEditModal,
    showDeleteConfirm,
    showUnmatchConfirm,
    handleRefreshMetadata,
    handleManualMatch,
    handleUnmatchClick,
    handleEditMetadata,
    handleDeleteClick,
    modalProps,
  } = useLibraryDetailPageModalConfig({
    mixedItems,
    onRefresh: () => Promise.resolve(),
    setPosterVersion: () => {},
  })

  // 使用统一的媒体操作 Hook
  const mediaActions = useMediaActions({
    isAdmin,
    onManualMatch: handleManualMatch,
    onUnmatch: handleUnmatchClick,
    onRefreshMetadata: handleRefreshMetadata,
    onEditMetadata: handleEditMetadata,
    onDelete: handleDeleteClick as unknown as (id: string) => void,
  })

  // 如果是音乐库，渲染音乐播放器
  if (library?.type === 'music') {
    return <MusicPlayer libraryId={id!} libraryName={library.name} />
  }

  // 如果是有声书库，渲染有声书播放器
  if (library?.type === 'audiobook') {
    return <AudioBookPlayer libraryId={id!} libraryName={library.name} />
  }

  const emptyStateContent = !loading && !library && (
    <EmptyState
      title="媒体库未找到"
      description="该媒体库可能已被删除"
    />
  )

  const contentEmptyState = !loading && filteredMixed.length === 0 && (
    <EmptyState
      icon={<Film size={48} className="text-surface-700" />}
      title={searchQuery || filterGenre ? '没有找到匹配的内容' : '此媒体库暂无内容'}
    />
  )

  return (
    <div className="pr-20">
      <PageLoader
        loading={loading}
        skeleton={<LibrarySkeleton />}
        emptyState={emptyStateContent}
        isEmpty={!loading && !library}
      >
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
            items={filteredMixed}
            isAdmin={isAdmin}
            {...mediaActions}
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
        {contentEmptyState}
      </PageLoader>

      {/* ===== 使用统一的弹窗组件 ===== */}
      <MediaModals
        {...modalProps}
        refreshModalOnScrape={(id, replaceImages) => adminApi.scrapeSeriesMetadata(id, replaceImages)}
      />
    </div>
  )
}