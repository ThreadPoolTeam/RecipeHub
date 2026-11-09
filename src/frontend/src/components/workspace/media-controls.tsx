import React from 'react';
import { UploadCloud } from 'lucide-react';
import type { MediaAsset, MediaSource, MediaState } from '@/lib/demo/types';
import { Button } from './fields';

type Props = {
  mediaList: MediaAsset[];
  filterSource: 'all' | MediaSource;
  setFilterSource: (value: 'all' | MediaSource) => void;
  filterState: 'all' | MediaState;
  setFilterState: (value: 'all' | MediaState) => void;
  uploadSource: MediaSource;
  setUploadSource: (value: MediaSource) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
};

export function MediaControls({ mediaList, filterSource, setFilterSource, filterState, setFilterState, uploadSource, setUploadSource, fileInputRef, handleFileUpload, isUploading }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" aria-label="Lọc theo nguồn ảnh">
          {([
            ['all', 'Tất cả'],
            ['Real', 'Ảnh thật'],
            ['AiIllustration', 'Ảnh AI'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={filterSource === value}
              onClick={() => setFilterSource(value)}
              className={`rounded-full border px-4 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${filterSource === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-accent'}`}>
              {label} {value === 'all' ? mediaList.length : mediaList.filter((item) => item.source === value).length}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Trạng thái:
          <select value={filterState} onChange={(event) => setFilterState(event.target.value as 'all' | MediaState)}
            className="rounded-md border border-input bg-card px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="all">Tất cả trạng thái</option>
            <option value="Active">Đang hoạt động</option>
            <option value="DeleteFailed">Lỗi xóa</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-border bg-secondary p-5"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!fileInputRef.current || isUploading || !event.dataTransfer.files.length) return;
          fileInputRef.current.files = event.dataTransfer.files;
          fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
        }}>
        <div className="flex items-center gap-3">
          <UploadCloud className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold">Kéo thả ảnh vào đây hoặc chọn từ máy</p>
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP, SVG · tối đa 5 MB/tệp</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Nguồn:
            <select value={uploadSource} onChange={(event) => setUploadSource(event.target.value as MediaSource)}
              className="rounded-md border border-input bg-card px-2 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="Real">Ảnh chụp SOP thực tế</option>
              <option value="AiIllustration">Concept AI (Minh họa)</option>
            </select>
          </label>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" />
          <Button variant="primary" size="sm" isLoading={isUploading} onClick={() => fileInputRef.current?.click()}>Chọn tệp từ máy</Button>
        </div>
      </div>
    </div>
  );
}
