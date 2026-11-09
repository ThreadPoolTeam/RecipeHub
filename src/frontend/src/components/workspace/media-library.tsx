'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MediaAsset, MediaSource, MediaState, MediaReferenceInfo } from '@/lib/demo/types';
import { useDemo } from '@/lib/demo/provider';
import { Alert } from './fields';
import { MediaControls } from './media-controls';
import { MediaGrid } from './media-grid';
import { MediaDetail } from './media-detail';
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
  const [mediaList, setMediaList] = useState<MediaAsset[]>([]);
  const [filterSource, setFilterSource] = useState<'all' | MediaSource>('all');
  const [filterState, setFilterState] = useState<'all' | MediaState>('all');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSource, setUploadSource] = useState<MediaSource>('Real');
  const [uploadTags, setUploadTags] = useState('sop, beveragelab');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // References state (Inspection Dialog)
  const [inspectRefs, setInspectRefs] = useState<MediaReferenceInfo | null>(null);
  const [inspectingMedia, setInspectingMedia] = useState<MediaAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Map of object URLs for preview
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

        // Build object URLs safely
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
        setErrorMsg(err.message || 'Lỗi tải danh mục media');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
      // Revoke created URLs
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
      setErrorMsg('Dung lượng tệp vượt quá 5 MB!');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const tags = uploadTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const asset = await repo.uploadMedia(session, file, file.name, uploadSource, tags);
      setSuccessMsg(`Tải lên thành công: ${asset.name}`);
      // Refresh list
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
      const msg = err instanceof Error ? err.message : 'Tải tệp thất bại';
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInspect = async (item: MediaAsset) => {
    touch();
    setInspectingMedia(item);
    setErrorMsg(null);
    try {
      const refs = await repo.getMediaReferences(item.id);
      setInspectRefs(refs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lấy thông tin liên kết';
      setErrorMsg(msg);
    }
  };

  const handleDelete = async () => {
    if (!session || !inspectingMedia) return;
    touch();
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await repo.deleteMedia(session, inspectingMedia.id);
      setSuccessMsg(`Đã xóa ảnh ${inspectingMedia.name}`);
      setInspectingMedia(null);
      setInspectRefs(null);
      const updated = await repo.getMedia();
      setMediaList(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xóa ảnh thất bại';
      setErrorMsg(msg);
      // Re-fetch media list because it might have moved to DeleteFailed
      const updated = await repo.getMedia();
      setMediaList(updated);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetryDelete = async (item: MediaAsset) => {
    if (!session) return;
    touch();
    setIsRetrying(true);
    setErrorMsg(null);
    try {
      await repo.retryDeleteMedia(session, item.id);
      setSuccessMsg(`Thử lại xóa ảnh thành công: ${item.name}`);
      setInspectingMedia(null);
      setInspectRefs(null);
      const updated = await repo.getMedia();
      setMediaList(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thử lại xóa ảnh thất bại';
      setErrorMsg(msg);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg && <Alert variant="error" title="Thông báo lỗi">{errorMsg}</Alert>}
      {successMsg && <Alert variant="success" title="Thành công">{successMsg}</Alert>}
      <MediaControls
        mediaList={mediaList} filterSource={filterSource} setFilterSource={setFilterSource}
        filterState={filterState} setFilterState={setFilterState} uploadSource={uploadSource}
        setUploadSource={setUploadSource} fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload} isUploading={isUploading}
      />
      <div className={mode === 'manage' ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]' : ''}>
        <MediaGrid items={filteredMedia} loading={loading} mode={mode} selectedMediaId={selectedMediaId}
          inspectingMedia={inspectingMedia} previewUrls={previewUrls} isRetrying={isRetrying}
          onSelect={onSelect} onInspect={handleInspect} onRetry={handleRetryDelete} />
        {mode === 'manage' && <MediaDetail item={inspectingMedia} refs={inspectRefs}
          previewUrl={inspectingMedia ? previewUrls[inspectingMedia.id] : undefined}
          allowDelete={allowDelete} isDeleting={isDeleting} isRetrying={isRetrying}
          onClose={() => setInspectingMedia(null)} onDelete={handleDelete} onRetry={handleRetryDelete} />}
      </div>
    </div>
  );
}
