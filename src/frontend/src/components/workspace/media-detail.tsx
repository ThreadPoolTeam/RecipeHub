import React from 'react';
import { CheckCircle2, ShieldAlert, Trash2, X } from 'lucide-react';
import type { MediaAsset, MediaReferenceInfo } from '@/lib/demo/types';
import { Button } from './fields';
import { MediaSourceBadge, MediaStateBadge } from './status-badge';

type Props = {
  item: MediaAsset | null;
  refs: MediaReferenceInfo | null;
  previewUrl?: string;
  allowDelete: boolean;
  isDeleting: boolean;
  isRetrying: boolean;
  onClose: () => void;
  onDelete: () => void;
  onRetry: (media: MediaAsset) => void;
};

export function MediaDetail({ item, refs, previewUrl, allowDelete, isDeleting, isRetrying, onClose, onDelete, onRetry }: Props) {
  if (!item) return <aside className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-soft">Chọn ảnh để xem chi tiết và kiểm tra tham chiếu.</aside>;
  const visibleRefs = refs?.mediaId === item.id ? refs : null;
  return (
    <aside aria-label="Chi tiết ảnh" className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ảnh đang chọn</p>
        <button type="button" onClick={onClose} aria-label="Đóng chi tiết" className="rounded-md p-1 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-4 w-4" strokeWidth={1.5} /></button>
      </div>
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-secondary">
        {previewUrl ? (
          <img src={previewUrl} alt={item.name} className="h-full w-full object-contain" />
        ) : <span className="text-xs text-muted-foreground">Không có ảnh</span>}
      </div>
      <h2 className="break-words font-display text-h3 font-medium">{item.name}</h2>
      <div className="flex flex-wrap gap-2"><MediaSourceBadge source={item.source} /><MediaStateBadge state={item.state} /></div>
      <dl className="space-y-2 rounded-lg bg-secondary p-4 text-xs">
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Dung lượng</dt><dd>{(item.sizeBytes / 1024).toFixed(1)} KB</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Định dạng</dt><dd className="break-all text-right">{item.mimeType}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Tải lên bởi</dt><dd className="break-all text-right">{item.uploadedBy || 'Chưa cập nhật'}</dd></div>
        {item.tags && item.tags.length > 0 && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Thẻ</dt><dd className="text-right">{item.tags.join(', ')}</dd></div>}
      </dl>
      <section className="space-y-2 border-t border-border pt-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ràng buộc tham chiếu công thức &amp; SOP</h3>
        {visibleRefs ? visibleRefs.recipes.length === 0 && visibleRefs.documents.length === 0 ? (
          <div className="flex gap-2 rounded-lg bg-success-soft p-3 text-xs text-success"><CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} /><span>Không có công thức nào đang sử dụng tệp này. Có thể xóa an toàn khỏi hệ thống.</span></div>
        ) : (
          <div className="space-y-2 rounded-lg bg-info-soft p-3 text-xs text-info">
            <div className="flex gap-2 font-semibold"><ShieldAlert className="h-4 w-4 shrink-0" strokeWidth={1.5} /><span>Đang được tham chiếu ({visibleRefs.recipes.length} công thức, {visibleRefs.documents.length} tài liệu). Hệ thống sẽ chặn xóa!</span></div>
            <ul className="max-h-32 list-inside list-disc space-y-1 overflow-y-auto">
              {visibleRefs.recipes.map((recipe, index) => <li key={index}>{recipe.recipeCode && <strong>{recipe.recipeCode} </strong>}{recipe.recipeName}{recipe.versionLabel && ` (${recipe.versionLabel})`} — {recipe.location}</li>)}
              {visibleRefs.documents.map((document, index) => <li key={`doc-${index}`}>Tài liệu phát hành của {document.recipeCode} ({document.versionLabel})</li>)}
            </ul>
          </div>
        ) : <p className="text-xs text-muted-foreground">Đang kiểm tra ràng buộc tham chiếu...</p>}
      </section>
      {allowDelete && <div className="space-y-2 border-t border-border pt-4">
        {item.state === 'DeleteFailed' ? <Button variant="danger" size="sm" isLoading={isRetrying} onClick={() => onRetry(item)}>Thử lại xóa ảnh</Button> :
          <Button variant="danger" size="sm" isLoading={isDeleting} disabled={Boolean(refs && (refs.recipes.length > 0 || refs.documents.length > 0))} onClick={onDelete}><Trash2 className="mr-1 h-4 w-4" strokeWidth={1.5} />Xóa tệp này</Button>}
        <p className="text-xs text-muted-foreground">{refs && (refs.recipes.length > 0 || refs.documents.length > 0) ? 'Bị khóa do có tham chiếu' : 'Hợp lệ để xóa'}</p>
      </div>}
    </aside>
  );
}
