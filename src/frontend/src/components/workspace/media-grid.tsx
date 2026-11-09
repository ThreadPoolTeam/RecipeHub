import React from 'react';
import type { MediaAsset } from '@/lib/demo/types';
import { Button } from './fields';
import { MediaSourceBadge, MediaStateBadge } from './status-badge';

type Props = {
  items: MediaAsset[];
  loading: boolean;
  mode: 'picker' | 'manage';
  selectedMediaId?: string;
  inspectingMedia: MediaAsset | null;
  previewUrls: Record<string, string>;
  isRetrying: boolean;
  onSelect?: (media: MediaAsset) => void;
  onInspect: (media: MediaAsset) => void;
  onRetry: (media: MediaAsset) => void;
};

export function MediaGrid({ items, loading, mode, selectedMediaId, inspectingMedia, previewUrls, isRetrying, onSelect, onInspect, onRetry }: Props) {
  if (loading) return <div className="rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">Đang tải danh mục tư liệu hình ảnh...</div>;
  if (!items.length) return <div className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">Không có tệp hình ảnh nào trong mục này.</div>;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const isSelected = mode === 'picker' ? selectedMediaId === item.id : inspectingMedia?.id === item.id;
        const name = item.name === item.id ? 'Chưa cập nhật' : item.name;
        return (
          <div key={item.id} className={`overflow-hidden rounded-2xl border bg-card shadow-soft ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
            <button type="button" onClick={() => mode === 'picker' ? onSelect?.(item) : onInspect(item)}
              aria-pressed={isSelected} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-secondary">
                {previewUrls[item.id] ? (
                  <img src={previewUrls[item.id]} alt={name} className="h-full w-full object-cover" />
                ) : <span className="text-xs text-muted-foreground">Không có ảnh</span>}
                <div className="absolute left-2 top-2"><MediaSourceBadge source={item.source} /></div>
                {item.state === 'DeleteFailed' && <div className="absolute bottom-2 left-2"><MediaStateBadge state={item.state} /></div>}
              </div>
              <div className="space-y-1 p-3">
                <h3 className="truncate text-sm font-semibold" title={name}>{name}</h3>
                <p className="text-xs text-muted-foreground">{(item.sizeBytes / 1024).toFixed(1)} KB · {item.uploadedBy.split('@')[0] || 'Chưa cập nhật'}</p>
                {mode === 'picker' && <p className="text-xs font-medium text-primary">{isSelected ? 'Đã chọn' : 'Chọn ảnh'}</p>}
              </div>
            </button>
            {mode === 'manage' && item.state === 'DeleteFailed' && (
              <div className="px-3 pb-3"><Button variant="danger" size="sm" isLoading={isRetrying} onClick={() => onRetry(item)}>Thử lại</Button></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
