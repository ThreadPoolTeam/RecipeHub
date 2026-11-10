'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MediaAsset, MediaSource, MediaState, MediaReferenceInfo } from '@/lib/demo/types';
import { useDemo } from '@/lib/demo/provider';
import { Alert } from './fields';
import { useToast } from './toast';
import { MediaControls } from './media-controls';
import { MediaGrid } from './media-grid';
import { MediaDetail } from './media-detail';
import { Dialog } from './dialog';
interface MediaLibraryProps {
  mode?: 'picker' | 'manage';
  selectedMediaId?: string;
  onSelect?: (media: MediaAsset) => void;
  allowDelete?: boolean;
}

export function MediaLibrary({
  mode = 'manage',
  selectedMediaId,
  onSelect,
  allowDelete = false,
}: MediaLibraryProps) {
  const { session, repo, dataVersion, touch } = useDemo();
  const { toast } = useToast();
  const [mediaList, setMediaList] = useState<MediaAsset[]>([]);
  const [filterSource, setFilterSource] = useState<'all' | MediaSource>('all');
  const [filterState, setFilterState] = useState<'all' | MediaState>('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSource, setUploadSource] = useState<MediaSource>('Real');
  const [uploadTags, setUploadTags] = useState('sop, beveragelab');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inspectRefs, setInspectRefs] = useState<MediaReferenceInfo | null>(null);
  const [inspectingMedia, setInspectingMedia] = useState<MediaAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    setLoading(true);
    repo
      .getMedia(undefined, controller.signal)
      .then((items) => {
        if (!isMounted) return;
        setMediaList(items);
        const urls: Record<string, string> = {};
        for (const item of items) {
          if (item.blob && item.blob.size > 0) {
            urls[item.id] = URL.createObjectURL(item.blob);
          } else if (item.deliveryUrl) {
            urls[item.id] = item.deliveryUrl;
          }
        }
        setPreviewUrls(urls);
      })
      .catch((err) => {
        if (!isMounted || controller.signal.aborted) return;
        const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message?.includes('abort'));
        if (isAbort) return;
        setLoadError(err.message || 'Lỗi tải danh mục media');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
      controller.abort();
      Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [repo, dataVersion]);

  const filteredMedia = useMemo(() => {
    return mediaList.filter((m) => {
      if (filterSource !== 'all' && m.source !== filterSource) return false;
      if (filterState !== 'all' && m.state !== filterState) return false;
      return true;
    });
  }, [mediaList, filterSource, filterState]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!session || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    touch();
    if (file.size > 5 * 1024 * 1024) {
      toast({ type: 'error', title: 'Tệp quá lớn', description: 'Dung lượng tối đa cho mỗi ảnh là 5 MB.' });
      return;
    }
    setIsUploading(true);
    try {
      const tags = uploadTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const asset = await repo.uploadMedia(session, file, file.name, uploadSource, tags);
      toast({ type: 'success', title: 'Đã tải ảnh lên', description: asset.name });
      const updated = await repo.getMedia();
      setMediaList(updated);
      setPreviewUrls((prev) => ({
        ...prev,
        [asset.id]: URL.createObjectURL(asset.blob),
      }));
      if (onSelect) {
        onSelect(asset);
      }
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: 'Không thể tải ảnh lên',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const handleInspect = async (item: MediaAsset) => {
    touch();
    setInspectingMedia(item);
    setInspectRefs(null);
    setLoadError(null);
    try {
      const refs = await repo.getMediaReferences(item.id);
      setInspectRefs(refs);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Không thể lấy thông tin liên kết');
    }
  };
  const handleDelete = async () => {
    if (!session || !inspectingMedia || !window.confirm('Bạn có chắc muốn xóa ảnh này?')) return;
    touch();
    setIsDeleting(true);
    try {
      await repo.deleteMedia(session, inspectingMedia.id);
      toast({ type: 'success', title: 'Đã xóa ảnh', description: inspectingMedia.name });
      setInspectingMedia(null);
      setInspectRefs(null);
      const updated = await repo.getMedia();
      setMediaList(updated);
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: 'Không thể xóa ảnh',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
      });
      // Re-fetch media list because it might have moved to DeleteFailed
      const updated = await repo.getMedia();
      setMediaList(updated);
    } finally {
      setIsDeleting(false);
    }
  };
  const handleRetryDelete = async (item: MediaAsset) => {
    if (!session || !window.confirm('Bạn có chắc muốn thử xóa ảnh này?')) return;
    touch();
    setIsRetrying(true);
    try {
      await repo.retryDeleteMedia(session, item.id);
      toast({ type: 'success', title: 'Đã xóa ảnh', description: item.name });
      setInspectingMedia(null);
      setInspectRefs(null);
      const updated = await repo.getMedia();
      setMediaList(updated);
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: 'Không thể xóa ảnh',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
      });
    } finally {
      setIsRetrying(false);
    }
  };
  return (
    <div className="space-y-6">
      {loadError && !inspectingMedia && <Alert variant="error" title="Thông báo lỗi">{loadError}</Alert>}
      <MediaControls
        mediaList={mediaList} filterSource={filterSource} setFilterSource={setFilterSource}
        filterState={filterState} setFilterState={setFilterState} uploadSource={uploadSource}
        setUploadSource={setUploadSource} fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload} isUploading={isUploading}
      />
      <MediaGrid items={filteredMedia} loading={loading} mode={mode} selectedMediaId={selectedMediaId}
        inspectingMedia={inspectingMedia} previewUrls={previewUrls} isRetrying={isRetrying}
        onSelect={onSelect} onInspect={handleInspect} onRetry={handleRetryDelete} />
      {mode === 'manage' && <Dialog isOpen={Boolean(inspectingMedia)} onClose={() => { setInspectingMedia(null); setInspectRefs(null); setLoadError(null); }} title="Chi tiết ảnh" cancelLabel="Đóng" maxWidth="2xl">
        {loadError && <Alert variant="error" title="Không thể tải tham chiếu">{loadError}</Alert>}
        <MediaDetail item={inspectingMedia} refs={inspectRefs}
          previewUrl={inspectingMedia ? previewUrls[inspectingMedia.id] : undefined}
          allowDelete={allowDelete} isDeleting={isDeleting} isRetrying={isRetrying}
          onDelete={handleDelete} onRetry={handleRetryDelete} />
      </Dialog>}
    </div>
  );
}
