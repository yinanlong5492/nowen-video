import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { staggerItemVariants } from '@/lib/motion';
import { LibraryWithCovers } from '../utils/homeUtils';
import HorizontalScroll from '@/components/common/HorizontalScroll';
import MediaCard from '@/components/media/MediaCard';
import type { MixedItem } from '@/types';
import { DeleteModal, MatchModal, UnmatchModal, EditModal, RefreshModal } from '@/components/GlobalModals';
import { adminApi } from '@/api';
import { useToast } from '@/components/Toast';
import { useLibraryAdmin } from '@/pages/Library/hooks/useLibraryAdmin';

interface BaseProps {
  title: string;
}

interface LibraryModeProps extends BaseProps {
  mode: 'library';
  libraries: LibraryWithCovers[];
}

interface RecentModeProps extends BaseProps {
  mode: 'recent';
  library: LibraryWithCovers;
}

type Props = LibraryModeProps | RecentModeProps;

export default function LibraryRow(props: Props) {
  return props.mode === 'library' ? <LibraryMode {...props} /> : <RecentMode {...props} />;
}

// ===================== 媒体库横向滚动模式 =====================
function LibraryMode({ title, libraries }: LibraryModeProps) {
  return (
    <HorizontalScroll title={title} itemCount={libraries.length}>
      {libraries.map((lib) => (
        <motion.div key={lib.id} variants={staggerItemVariants} className="flex-shrink-0">
          <Link to={`/library/${lib.id}`} className="group block w-[260px]">
            <div className="relative aspect-video overflow-hidden rounded-xl" style={{ background: 'var(--bg-surface)' }}>
              {lib.coverUrls.length > 0 ? (
                <div className="h-full w-full grid grid-cols-3 gap-0.5">
                  {lib.coverUrls.slice(0, 3).map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`${lib.name} cover ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ))}
                  {/* 如果不足3张，填充空白 */}
                  {Array(Math.max(0, 3 - lib.coverUrls.length)).fill(null).map((_, i) => (
                    <div key={`empty-${i}`} className="h-full w-full bg-theme-bg-surface flex items-center justify-center">
                      <span className="text-xs text-theme-muted">{lib.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                  <span className="text-sm">{lib.name}</span>
                </div>
              )}
              <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
            <div className="mt-2 text-center">
              <h3 className="truncate text-sm font-medium transition-colors group-hover:text-neon text-theme-primary">
                {lib.name}
              </h3>
            </div>
          </Link>
        </motion.div>
      ))}
    </HorizontalScroll>
  );
}

// ===================== 最近添加横向滚动模式 =====================
function RecentMode({ title, library }: RecentModeProps) {
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

  const renderMediaCard = (item: MixedItem) => {
    if (item.type === 'series' && item.series) {
      return (
        <motion.div key={`s-${item.series.id}`} variants={staggerItemVariants} className="flex-shrink-0 w-[150px]">
          <MediaCard
            series={item.series}
            onManualMatch={handleManualMatch}
            onUnmatch={handleUnmatchClick}
            onRefreshMetadata={handleRefreshMetadata}
            onEditMetadata={handleEditMetadata}
            onDelete={handleDeleteClick}
          />
        </motion.div>
      );
    }
    if (item.type === 'music' && item.music) {
      return (
        <motion.div key={`mu-${item.music.id}`} variants={staggerItemVariants} className="flex-shrink-0 w-[150px]">
          <MediaCard music={item.music} />
        </motion.div>
      );
    }
    if (item.media) {
      return (
        <motion.div key={`m-${item.media.id}`} variants={staggerItemVariants} className="flex-shrink-0 w-[150px]">
          <MediaCard
            media={item.media}
            onManualMatch={handleManualMatch}
            onUnmatch={handleUnmatchClick}
            onRefreshMetadata={handleRefreshMetadata}
            onEditMetadata={handleEditMetadata}
            onDelete={handleDeleteClick}
          />
        </motion.div>
      );
    }
    return null;
  };

  return (
    <>
      <HorizontalScroll title={title} itemCount={library.recentItems.length}>
        {library.recentItems.map(renderMediaCard)}
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

