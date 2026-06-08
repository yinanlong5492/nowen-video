import { useState } from 'react';
import { motion } from 'framer-motion';
import { staggerItemVariants } from '@/lib/motion';
import { useTranslation } from '@/i18n';
import type { WatchHistory } from '@/types';
import HorizontalScroll from '@/components/common/HorizontalScroll';
import MediaCard from '@/components/media/MediaCard';
import { DeleteModal, MatchModal, UnmatchModal, EditModal, RefreshModal } from '@/components/GlobalModals';
import { adminApi } from '@/api';
import { useToast } from '@/components/Toast';
import { useLibraryAdmin } from '@/pages/Library/hooks/useLibraryAdmin';

interface Props {
  items: WatchHistory[];
  title: string;
}

export default function ContinueWatchingRow({ items, title }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const { deleteMedia, unmatchMedia, editMetadata } = useLibraryAdmin();

  // 弹窗状态
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [refreshId, setRefreshId] = useState<string | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [unmatchId, setUnmatchId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', orig_title: '', year: undefined, overview: '',
    rating: undefined, genres: '', country: '', language: '', studio: ''
  });

  const handleRefreshMetadata = (id: string) => {
    setRefreshId(id);
    setShowRefreshModal(true);
  };

  const handleManualMatch = (id: string) => {
    setMatchId(id);
    setShowMatchModal(true);
  };

  const handleUnmatchClick = (id: string) => {
    setUnmatchId(id);
    setShowUnmatchModal(true);
  };

  const handleUnmatch = async () => {
    if (!unmatchId) return;
    await unmatchMedia(unmatchId);
    setShowUnmatchModal(false);
  };

  const handleEditMetadata = (id: string) => {
    setEditId(id);
    setEditForm({ title: '', orig_title: '', year: undefined, overview: '', rating: undefined, genres: '', country: '', language: '', studio: '' });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editId) return;
    await editMetadata(editId, editForm);
    setShowEditModal(false);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async (_deleteFiles: boolean) => {
    if (!deleteId) return;
    await deleteMedia(deleteId);
    setShowDeleteModal(false);
  };

  const handleMatchSuccess = () => {
    toast.success('剧集匹配成功');
  };

  const handleRefreshSuccess = () => {
    toast.success('元数据刷新成功');
  };

  const renderMediaCard = (item: WatchHistory) => {
    // 将 WatchHistory 转换为适合 MediaCard 的格式
    if (item.media.media_type === 'episode' && item.media.series) {
      return (
        <motion.div key={item.id} variants={staggerItemVariants} className="flex-shrink-0 w-[260px]">
          <MediaCard
            series={item.media.series}
            media={item.media}
            isWide={true}
            showEpisodeInfo={true}
            onManualMatch={handleManualMatch}
            onUnmatch={handleUnmatchClick}
            onRefreshMetadata={handleRefreshMetadata}
            onEditMetadata={handleEditMetadata}
            onDelete={handleDeleteClick}
          />
        </motion.div>
      );
    }
    return (
      <motion.div key={item.id} variants={staggerItemVariants} className="flex-shrink-0 w-[260px]">
        <MediaCard
          media={item.media}
          isWide={true}
          onManualMatch={handleManualMatch}
          onUnmatch={handleUnmatchClick}
          onRefreshMetadata={handleRefreshMetadata}
          onEditMetadata={handleEditMetadata}
          onDelete={handleDeleteClick}
        />
      </motion.div>
    );
  };

  return (
    <>
      <HorizontalScroll title={title} itemCount={items.length}>
        {items.map(renderMediaCard)}
      </HorizontalScroll>

      {/* 弹窗组件 */}
      {showRefreshModal && refreshId && (
        <RefreshModal
          open={showRefreshModal}
          mediaId={refreshId}
          mediaTitle=""
          onClose={() => setShowRefreshModal(false)}
          onSuccess={handleRefreshSuccess}
          onScrape={(id, replaceImages, _mode) => adminApi.scrapeSeriesMetadata(id, replaceImages)}
        />
      )}

      {showMatchModal && matchId && (
        <MatchModal
          open={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          onSuccess={handleMatchSuccess}
          matchType="series"
          itemId={matchId}
        />
      )}

      {showEditModal && (
        <EditModal
          type="series"
          id={editId!}
          mediaType="tv"
          editForm={editForm}
          setEditForm={setEditForm}
          currentPoster=""
          currentBackdrop=""
          hasPoster={false}
          hasBackdrop={false}
          onSave={handleEditSave}
          onClose={() => setShowEditModal(false)}
        />
      )}

      <UnmatchModal
        open={showUnmatchModal}
        onClose={() => setShowUnmatchModal(false)}
        onConfirm={handleUnmatch}
        type="series"
      />

      <DeleteModal
        open={showDeleteModal}
        title="删除剧集"
        description="确定要删除此剧集合集及其所有剧集记录吗？"
        hint="此操作仅从数据库中移除记录，不会删除磁盘上的视频文件。重新扫描媒体库后可恢复。"
        onClose={() => setShowDeleteModal(false)}
        onDelete={handleDelete}
      />
    </>
  );
}

