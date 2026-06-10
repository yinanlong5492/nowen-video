import type { MatchStrategyType } from '@/hooks/useMatch'
import type { DeleteTarget } from '@/hooks/useEntityAdmin'
import EditMetadataModal from '@/components/EditMetadataModal'
import RefreshSingleModal from '@/components/RefreshSingleModal'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import { MatchModal } from '@/components/common/modals/MatchModal'
import { UnmatchConfirmModal } from '@/components/common/modals/UnmatchConfirmModal'

export interface DetailPageModalsProps {
  showEditModal: boolean
  showDeleteConfirm: boolean
  showUnmatchConfirm: boolean
  showRefreshModal: boolean
  showMatchModal: boolean
  
  // 删除目标类型（用于显示正确的确认信息）
  deleteTarget?: DeleteTarget
  
  // EditMetadataModal props
  editModalType: 'media' | 'series'
  editModalId: string
  editModalTmdbId?: number
  editModalMediaType?: string
  editModalEntity: Record<string, any> | null
  editModalCurrentPoster: string
  editModalCurrentBackdrop?: string
  editModalHasPoster: boolean
  editModalHasBackdrop: boolean
  editModalOnSave: (editForm: {
    title: string; orig_title: string; year: number; overview: string;
    rating: number; genres: string; country: string; language: string;
    tagline: string; studio: string
  }) => Promise<void> | void
  editModalOnClose: () => void
  editModalHasTagline?: boolean
  
  // DeleteConfirmModal props
  deleteModalTitle?: string
  deleteModalDescription?: string
  deleteModalHint?: string
  deleteModalOnClose: () => void
  deleteModalOnDelete: (deleteFiles: boolean) => Promise<void>
  
  // UnmatchConfirmModal props
  unmatchModalOnClose: () => void
  unmatchModalOnConfirm: () => void
  unmatchModalTitle?: string
  unmatchModalDescription?: string
  
  // RefreshSingleModal props
  refreshModalMediaId: string
  refreshModalMediaTitle: string
  refreshModalOnClose: () => void
  refreshModalOnSuccess?: () => void
  refreshModalOnScrape?: (id: string, replaceImages: boolean, mode: string) => Promise<unknown>
  
  // MatchModal props
  matchModalMediaId: string
  matchModalStrategyType: MatchStrategyType
  matchModalDefaultTitle?: string
  matchModalOnClose: () => void
  matchModalOnMatchSuccess: () => void
}

export function DetailPageModals(props: DetailPageModalsProps) {
  // 根据删除目标类型生成默认的确认信息
  const getDeleteConfirmInfo = () => {
    const deleteTarget = props.deleteTarget || 'movie'
    
    const deleteInfo: Record<DeleteTarget, { title: string; description: string; hint: string }> = {
      movie: {
        title: '删除电影',
        description: '确定要删除这部电影吗？此操作不可撤销。',
        hint: '删除后，电影将从媒体库中移除。选择"移除并删除文件"将同时删除本地文件。',
      },
      series: {
        title: '删除剧集',
        description: '确定要删除这部剧集吗？此操作将删除所有季和集，不可撤销。',
        hint: '删除后，剧集及其所有季和集将从媒体库中移除。选择"移除并删除文件"将同时删除本地文件。',
      },
      season: {
        title: '删除季',
        description: '确定要删除这个季吗？此操作将删除该季的所有集，不可撤销。',
        hint: '删除后，该季及其所有集将从媒体库中移除。选择"移除并删除文件"将同时删除本地文件。',
      },
      episode: {
        title: '删除集',
        description: '确定要删除这一集吗？此操作不可撤销。',
        hint: '删除后，该集将从媒体库中移除。选择"移除并删除文件"将同时删除本地文件。',
      },
    }
    
    return deleteInfo[deleteTarget]
  }
  
  const deleteConfirmInfo = getDeleteConfirmInfo()

  return (
    <>
      {/* 编辑元数据弹窗 */}
      {props.showEditModal && (
        <EditMetadataModal
          type={props.editModalType}
          id={props.editModalId}
          tmdbId={props.editModalTmdbId}
          mediaType={props.editModalMediaType}
          entity={props.editModalEntity}
          currentPoster={props.editModalCurrentPoster}
          currentBackdrop={props.editModalCurrentBackdrop}
          hasPoster={props.editModalHasPoster}
          hasBackdrop={props.editModalHasBackdrop}
          onSave={props.editModalOnSave}
          onClose={props.editModalOnClose}
          hasTagline={props.editModalHasTagline}
        />
      )}
      
      {/* 删除确认弹窗 */}
      <DeleteConfirmModal
        open={props.showDeleteConfirm}
        title={props.deleteModalTitle || deleteConfirmInfo.title}
        description={props.deleteModalDescription || deleteConfirmInfo.description}
        hint={props.deleteModalHint || deleteConfirmInfo.hint}
        onClose={props.deleteModalOnClose}
        onDelete={props.deleteModalOnDelete}
      />
      
      {/* 解除匹配确认弹窗 */}
      <UnmatchConfirmModal
        open={props.showUnmatchConfirm}
        title={props.unmatchModalTitle}
        description={props.unmatchModalDescription}
        onClose={props.unmatchModalOnClose}
        onConfirm={props.unmatchModalOnConfirm}
      />
      
      {/* 刷新元数据弹窗 */}
      <RefreshSingleModal
        open={props.showRefreshModal}
        mediaId={props.refreshModalMediaId}
        mediaTitle={props.refreshModalMediaTitle}
        onClose={props.refreshModalOnClose}
        onSuccess={props.refreshModalOnSuccess}
        onScrape={props.refreshModalOnScrape}
      />
      
      {/* 手动匹配弹窗 */}
      <MatchModal
        open={props.showMatchModal}
        onClose={props.matchModalOnClose}
        mediaId={props.matchModalMediaId}
        strategyType={props.matchModalStrategyType}
        defaultTitle={props.matchModalDefaultTitle}
        onMatchSuccess={props.matchModalOnMatchSuccess}
      />
    </>
  )
}