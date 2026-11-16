import React from 'react';
import { UploadCloud } from 'lucide-react';
import type { MediaAsset, MediaSource, MediaState } from '@/lib/demo/types';
import { Button } from './fields';
import { StyledSelect } from './styled-select';

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
              className={`rounded-full border px-4 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${filterSource === value ? 'border-primary bg-primary text-primary-foreground hover:brightness-90' : 'border-border bg-card text-foreground hover:bg-accent'}`}>
              {label} {value === 'all' ? mediaList.length : mediaList.filter((item) => item.source === value).length}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span id="media-state-label">Trạng thái:</span>
          <StyledSelect aria-labelledby="media-state-label" value={filterState} onChange={(value) => setFilterState(value as 'all' | MediaState)}
            options={[{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'Active', label: 'Đang hoạt động' }, { value: 'DeleteFailed', label: 'Lỗi xóa' }]} />
        </div>
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span id="media-source-label">Nguồn:</span>
            <StyledSelect aria-labelledby="media-source-label" value={uploadSource} onChange={(value) => setUploadSource(value as MediaSource)}
              options={[{ value: 'Real', label: 'Ảnh chụp SOP thực tế' }, { value: 'AiIllustration', label: 'Concept AI (Minh họa)' }]} />
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" />
          <Button variant="primary" size="sm" isLoading={isUploading} onClick={() => fileInputRef.current?.click()}>Chọn tệp từ máy</Button>
        </div>
      </div>
    </div>
  );
}
