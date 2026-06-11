import type { MatchStrategyType } from '@/hooks/useMedia'
import type { DeleteTarget } from '@/hooks/useAdmin'
import type { Episode } from '@/types'
import { streamApi } from '@/api'
import EditMetadataModal from '@/components/EditMetadataModal'
import RefreshSingleModal from '@/components/RefreshSingleModal'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import TrailerModal from '@/components/media/TrailerModal'
import { MatchModal } from '@/components/common/modals/MatchModal'
import { UnmatchConfirmModal } from '@/components/common/modals/UnmatchConfirmModal'

export interface MediaModalsProps {
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

  // TrailerModal props
  showTrailer?: boolean
  trailerUrl?: string
  onCloseTrailer?: () => void

  // ===== 单集弹窗支持 =====
  episodeMode?: boolean
  episodeId?: string | null
  episodeEntity?: Episode | undefined
  episodeShowEditModal?: boolean
  episodeShowDeleteConfirm?: boolean
  episodeShowUnmatchConfirm?: boolean
  episodeShowRefreshModal?: boolean
  episodeShowMatchModal?: boolean
  episodeOnEditSave?: (form: Record<string, unknown>) => void
  episodeOnEditClose?: () => void
  episodeOnDelete?: (deleteFiles: boolean) => void
  episodeOnDeleteClose?: () => void
  episodeOnUnmatch?: () => void
  episodeOnUnmatchClose?: () => void
  episodeOnRefreshClose?: () => void
  episodeOnRefreshSuccess?: () => void
  episodeOnMatchClose?: () => void
  episodeOnMatchSuccess?: () => void
}

export function MediaModals(props: MediaModalsProps) {
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

      {/* 预告片弹窗 */}
      {props.showTrailer && props.trailerUrl && (
        <TrailerModal
          trailerUrl={props.trailerUrl}
          onClose={props.onCloseTrailer}
        />
      )}

      {/* ===== 单集弹窗 ===== */}
      {props.episodeMode && props.episodeId && (
        <>
          {/* 单集编辑元数据弹窗 */}
          {props.episodeShowEditModal && props.episodeOnEditSave && props.episodeOnEditClose && (
            <EditMetadataModal
              type="media"
              id={props.episodeId}
              mediaType="episode"
              entity={props.episodeEntity || null}
              currentPoster={streamApi.getPosterUrl(props.episodeId)}
              hasPoster={true}
              onSave={props.episodeOnEditSave}
              onClose={props.episodeOnEditClose}
            />
          )}

          {/* 单集删除确认弹窗 */}
          {props.episodeShowDeleteConfirm && props.episodeOnDelete && props.episodeOnDeleteClose && (
            <DeleteConfirmModal
              open={props.episodeShowDeleteConfirm}
              title="删除集"
              description="确定要删除这一集吗？此操作不可撤销。"
              hint={'删除后，该集将从媒体库中移除。选择"移除并删除文件"将同时删除本地文件。'}
              onClose={props.episodeOnDeleteClose}
              onDelete={props.episodeOnDelete}
            />
          )}

          {/* 单集解除匹配确认弹窗 */}
          {props.episodeShowUnmatchConfirm && props.episodeOnUnmatch && props.episodeOnUnmatchClose && (
            <UnmatchConfirmModal
              open={props.episodeShowUnmatchConfirm}
              title="解除匹配集"
              description="确定要解除此集的元数据匹配吗？这将清除所有从 TMDb/豆瓣获取的信息。"
              onClose={props.episodeOnUnmatchClose}
              onConfirm={props.episodeOnUnmatch}
            />
          )}

          {/* 单集刷新元数据弹窗 */}
          {props.episodeShowRefreshModal && props.episodeOnRefreshClose && props.episodeOnRefreshSuccess && (
            <RefreshSingleModal
              open={props.episodeShowRefreshModal}
              mediaId={props.episodeId}
              mediaTitle={props.episodeEntity?.title || ''}
              onClose={props.episodeOnRefreshClose}
              onSuccess={props.episodeOnRefreshSuccess}
              onScrape={(id, replaceImages) => import('@/api').then(m => m.adminApi.scrapeEpisodeMetadata(id, replaceImages))}
            />
          )}

          {/* 单集手动匹配弹窗 */}
          {props.episodeShowMatchModal && props.episodeOnMatchClose && props.episodeOnMatchSuccess && (
            <MatchModal
              open={props.episodeShowMatchModal}
              onClose={props.episodeOnMatchClose}
              mediaId={props.episodeId}
              strategyType={{ type: 'episode', source: 'tmdb' }}
              defaultTitle={props.episodeEntity?.title || ''}
              onMatchSuccess={props.episodeOnMatchSuccess}
            />
          )}
        </>
      )}
    </>
  )
}
