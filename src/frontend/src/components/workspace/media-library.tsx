'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  UploadCloud,
  Camera,
  Sparkles,
  AlertTriangle,
  Eye,
  Trash2,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { MediaAsset, MediaSource, MediaState, MediaReferenceInfo } from '@/lib/demo/types';
import { useDemo } from '@/lib/demo/provider';
import { MediaSourceBadge, MediaStateBadge } from './status-badge';
import { Button, TextInput, Alert } from './fields';
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
    setLoading(true);

    repo
      .getMedia()
      .then((items) => {
        if (!isMounted) return;
        setMediaList(items);

        // Build object URLs safely
        const urls: Record<string, string> = {};
        for (const item of items) {
          if (item.blob) {
            urls[item.id] = URL.createObjectURL(item.blob);
          }
        }
        setPreviewUrls(urls);
      })
      .catch((err) => {
        if (isMounted) setErrorMsg(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
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
      {errorMsg && (
        <Alert variant="error" title="Thông báo lỗi">
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" title="Thành công">
          {successMsg}
        </Alert>
      )}

      {/* Upload Zone */}
      <div className="p-4 bg-white border border-[#E8E2D9] rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-[#1A1917] flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#B47820]" /> Tải lên tư liệu hình ảnh SOP &amp; R&amp;D
            </h4>
            <p className="text-xs text-[#706E68] mt-0.5">
              Hỗ trợ JPG, PNG, WebP, SVG. Giới hạn tối đa 5 MB/tệp.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#F5F0E8] px-2.5 py-1 rounded-md border border-[#E8E2D9] text-xs text-[#706E68]">
              <span>Nguồn:</span>
              <select
                value={uploadSource}
                onChange={(e) => setUploadSource(e.target.value as MediaSource)}
                className="bg-transparent text-[#1A1917] font-medium focus:outline-none"
              >
                <option value="Real">Ảnh chụp SOP thực tế</option>
                <option value="AiIllustration">Concept AI (Minh họa)</option>
              </select>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              id="media-file-upload-input"
            />
            <Button
              variant="gold"
              size="sm"
              isLoading={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Chọn tệp từ máy...
            </Button>
          </div>
        </div>
      </div>
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E2D9] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterSource('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              filterSource === 'all'
                ? 'bg-[#1A1917] text-white font-semibold'
                : 'bg-white text-[#706E68] border border-[#E8E2D9] hover:bg-[#F5F0E8]'
            }`}
          >
            Tất cả ({mediaList.length})
          </button>
          <button
            onClick={() => setFilterSource('Real')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
              filterSource === 'Real'
                ? 'bg-[#1A1917] text-white font-semibold'
                : 'bg-white text-[#706E68] border border-[#E8E2D9] hover:bg-[#F5F0E8]'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-[#B47820]" />
            <span>Thực tế ({mediaList.filter((m) => m.source === 'Real').length})</span>
          </button>
          <button
            onClick={() => setFilterSource('AiIllustration')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
              filterSource === 'AiIllustration'
                ? 'bg-[#1A1917] text-white font-semibold'
                : 'bg-white text-[#706E68] border border-[#E8E2D9] hover:bg-[#F5F0E8]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B47820]" />
            <span>AI Concept ({mediaList.filter((m) => m.source === 'AiIllustration').length})</span>
          </button>
        </div>

        {/* State filter */}
        <div className="flex items-center gap-2 text-xs text-[#706E68]">
          <span>Trạng thái:</span>
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value as 'all' | MediaState)}
            className="bg-white border border-[#E8E2D9] text-[#1A1917] rounded-md px-2 py-1 shadow-xs"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Active">Đang hoạt động</option>
            <option value="DeleteFailed">Lỗi xóa</option>
          </select>
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="p-12 text-center text-[#706E68]">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#B47820] mb-2"></div>
          <p className="text-xs">Đang tải danh mục tư liệu hình ảnh...</p>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="p-12 text-center text-[#706E68] bg-white border border-[#E8E2D9] rounded-lg">
          Không có tệp hình ảnh nào trong mục này.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredMedia.map((item) => {
            const isSelected = selectedMediaId === item.id;
            const previewUrl = previewUrls[item.id];

            return (
              <div
                key={item.id}
                className={`group relative bg-white border ${
                  isSelected ? 'border-[#B47820] ring-2 ring-[#B47820]/30' : 'border-[#E8E2D9] hover:border-[#B47820]'
                } rounded-lg overflow-hidden flex flex-col transition shadow-xs hover:shadow-sm`}
              >
                {/* Thumbnail Preview */}
                <div className="aspect-video w-full bg-[#F5F0E8] flex items-center justify-center overflow-hidden relative">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-[#8C887F] text-xs">Không có ảnh</span>
                  )}
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                    <MediaSourceBadge source={item.source} />
                  </div>
                  {item.state === 'DeleteFailed' && (
                    <div className="absolute bottom-1.5 left-1.5">
                      <MediaStateBadge state={item.state} />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h5 className="text-xs font-semibold text-[#1A1917] truncate" title={item.name}>
                      {item.name}
                    </h5>
                    <p className="text-[10px] text-[#706E68] mt-0.5">
                      {(item.sizeBytes / 1024).toFixed(1)} KB • {item.uploadedBy.split('@')[0]}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    {mode === 'picker' ? (
                      <Button
                        variant={isSelected ? 'gold' : 'secondary'}
                        size="sm"
                        className="w-full text-[11px]"
                        onClick={() => onSelect && onSelect(item)}
                      >
                        {isSelected ? '✓ Đã chọn' : 'Chọn ảnh'}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 text-[11px]"
                          onClick={() => handleInspect(item)}
                        >
                          <Eye className="w-3 h-3 mr-1" /> Chi tiết
                        </Button>
                        {item.state === 'DeleteFailed' && (
                          <Button
                            variant="danger"
                            size="sm"
                            className="text-[10px]"
                            isLoading={isRetrying}
                            onClick={() => handleRetryDelete(item)}
                          >
                            Thử lại
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Inspect & Delete Dialog */}
      {inspectingMedia && (
        <Dialog
          isOpen={true}
          onClose={() => setInspectingMedia(null)}
          title={`Tư liệu: ${inspectingMedia.name}`}
          description={`ID: ${inspectingMedia.id} | Người tải lên: ${inspectingMedia.uploadedBy}`}
        >
          <div className="space-y-4">
            <div className="aspect-video w-full rounded-md overflow-hidden bg-[#F5F0E8] flex items-center justify-center border border-[#E8E2D9]">
              {previewUrls[inspectingMedia.id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrls[inspectingMedia.id]}
                  alt={inspectingMedia.name}
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-[#FAF9F5] p-3 rounded-md border border-[#E8E2D9] text-[#1A1917]">
              <div>
                <span className="text-[#706E68]">Phân loại:</span>{' '}
                <span className="font-medium text-[#1A1917]">{inspectingMedia.source}</span>
              </div>
              <div>
                <span className="text-[#706E68]">Trạng thái:</span>{' '}
                <span className="font-medium text-[#1A1917]">{inspectingMedia.state}</span>
              </div>
              <div>
                <span className="text-[#706E68]">Kích thước:</span>{' '}
                <span className="font-medium text-[#1A1917]">{(inspectingMedia.sizeBytes / 1024).toFixed(1)} KB</span>
              </div>
              <div>
                <span className="text-[#706E68]">Định dạng:</span>{' '}
                <span className="font-medium text-[#1A1917]">{inspectingMedia.mimeType}</span>
              </div>
            </div>

            {/* Reference Inspection */}
            <div className="space-y-2 border-t border-[#E8E2D9] pt-3">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-[#706E68]">
                Ràng buộc tham chiếu công thức &amp; SOP:
              </h5>
              {inspectRefs ? (
                inspectRefs.recipes.length === 0 && inspectRefs.documents.length === 0 ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Không có công thức nào đang sử dụng tệp này. Có thể xóa an toàn khỏi hệ thống.</span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md space-y-1.5 text-xs">
                    <div className="text-amber-900 font-semibold flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Đang được tham chiếu ({inspectRefs.recipes.length} công thức, {inspectRefs.documents.length} tài liệu). Hệ thống sẽ chặn xóa!</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-800 pl-1 max-h-32 overflow-y-auto">
                      {inspectRefs.recipes.map((r, idx) => (
                        <li key={idx}>
                          <span className="font-semibold">{r.recipeCode}</span> ({r.versionLabel}) — {r.location}
                        </li>
                      ))}
                      {inspectRefs.documents.map((d, idx) => (
                        <li key={`doc-${idx}`}>
                          Tài liệu phát hành của {d.recipeCode} ({d.versionLabel})
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ) : (
                <p className="text-xs text-[#706E68]">Đang kiểm tra ràng buộc tham chiếu...</p>
              )}
            </div>

            {allowDelete && (
              <div className="pt-3 border-t border-[#E8E2D9] flex justify-between items-center">
                {inspectingMedia.state === 'DeleteFailed' ? (
                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={isRetrying}
                    onClick={() => handleRetryDelete(inspectingMedia)}
                  >
                    Thử lại xóa ảnh
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={isDeleting}
                    disabled={Boolean(inspectRefs && (inspectRefs.recipes.length > 0 || inspectRefs.documents.length > 0))}
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Xóa tệp này
                  </Button>
                )}
                <span className="text-[11px] text-[#706E68]">
                  {inspectRefs && (inspectRefs.recipes.length > 0 || inspectRefs.documents.length > 0)
                    ? 'Bị khóa do có tham chiếu'
                    : 'Hợp lệ để xóa'}
                </span>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
