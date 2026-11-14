'use client';

import React, { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Coffee, Trash2 } from 'lucide-react';
import { SearchInput } from './fields';
import { StyledSelect } from './styled-select';
import type { GroupedRecipe, SelectedRecipeItem } from './pdf-document-workspace';

interface PdfRecipeSelectorProps {
  selectedItems: SelectedRecipeItem[];
  loadingCatalog: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  catalogRecipes: GroupedRecipe[];
  totalCount: number;
  catalogSearch: string;
  setCatalogSearch: (value: string) => void;
  onLoadMore: () => void;
  onClear: () => void;
  onToggle: (group: GroupedRecipe) => void;
  onVersionChange: (recipeId: string, versionId: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (versionId: string) => void;
}

export function PdfRecipeSelector({ selectedItems, loadingCatalog, loadingMore, hasMore, catalogRecipes, totalCount, catalogSearch, setCatalogSearch, onLoadMore, onClear, onToggle, onVersionChange, onMove, onRemove }: PdfRecipeSelectorProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(onLoadMore);
  loadMoreRef.current = onLoadMore;

  // Cuộn gần cuối danh sách thì tải thêm 10 món.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = listRef.current;
    if (!sentinel || !root || !hasMore || loadingCatalog) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreRef.current();
    }, { root, rootMargin: '0px 0px 120px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingCatalog, catalogRecipes.length]);

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <h2 className="text-lg font-medium text-foreground font-display">1 · Chọn công thức</h2>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">{selectedItems.length > 0 ? `${selectedItems.length} đã chọn` : 'Chưa chọn'}</span>
        </div>
        {selectedItems.length > 0 && <button type="button" onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive">Bỏ chọn tất cả</button>}
      </div>
      <SearchInput value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} placeholder="Tìm theo tên hoặc mã công thức..." onClear={() => setCatalogSearch('')} />
      <div ref={listRef} className="max-h-[360px] space-y-2 overflow-y-auto">
        {loadingCatalog ? (
          <div className="p-8 text-center text-muted-foreground"><div className="mx-auto mb-2 h-5 w-5 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin" /><p className="text-xs">Đang tải công thức...</p></div>
        ) : catalogRecipes.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Không có công thức đã phát hành phù hợp.</div>
        ) : catalogRecipes.map((group) => {
          const isSelected = selectedItems.some((item) => item.recipeId === group.recipeId);
          const selectedItem = selectedItems.find((item) => item.recipeId === group.recipeId);
          const currentVersionId = selectedItem?.recipeVersionId || group.selectedVersionId;
          return (
            <div key={group.recipeId} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-3 ${isSelected ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-secondary'}`}>
              <label className="flex min-w-0 flex-1 cursor-pointer select-none items-center gap-3">
                <input type="checkbox" checked={isSelected} onChange={() => onToggle(group)} className="h-4 w-4 shrink-0 cursor-pointer rounded accent-primary" />
                <span className="flex min-w-0 flex-col"><span className="truncate text-sm font-medium text-foreground">{group.recipeName}</span><span className="text-xs text-muted-foreground">{group.recipeCode}</span></span>
              </label>
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                {group.versions.length > 1 ? (
                  <StyledSelect value={currentVersionId} onChange={(value) => onVersionChange(group.recipeId, value)} aria-label={`Chọn phiên bản ${group.recipeName}`}
                    options={group.versions.map((version) => ({ value: version.versionId || version.id, label: version.versionLabel || `v${version.versionNumber || 1}.0` }))} />
                ) : <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{group.versions[0]?.versionLabel || 'v1.0'}</span>}
              </div>
            </div>
          );
        })}
        {hasMore && <div ref={sentinelRef} className="py-2 text-center text-xs text-muted-foreground">{loadingMore ? 'Đang tải thêm...' : 'Cuộn để xem thêm'}</div>}
      </div>
      {!loadingCatalog && catalogRecipes.length > 0 && <p className="text-xs text-muted-foreground">Hiển thị {catalogRecipes.length}{totalCount > catalogRecipes.length ? ` / ${totalCount}` : ''} công thức đã phát hành.</p>}
      {selectedItems.length > 1 && (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="text-xs font-semibold text-foreground">Thứ tự trong tài liệu ({selectedItems.length} món):</div>
          <div className="max-h-[160px] space-y-1.5 overflow-y-auto pr-1">
            {selectedItems.map((item, index) => (
              <div key={item.recipeVersionId} className="flex items-center justify-between rounded-lg border border-border bg-secondary p-2 text-xs">
                <div className="flex items-center gap-2 truncate"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-[10px] font-bold text-muted-foreground">{index + 1}</span><span className="truncate font-medium text-foreground">{item.recipeName}</span></div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" disabled={index === 0} onClick={(e) => { e.stopPropagation(); onMove(index, -1); }} className="rounded p-1 text-muted-foreground hover:bg-card disabled:opacity-30" title="Đưa lên"><ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
                  <button type="button" disabled={index === selectedItems.length - 1} onClick={(e) => { e.stopPropagation(); onMove(index, 1); }} className="rounded p-1 text-muted-foreground hover:bg-card disabled:opacity-30" title="Đưa xuống"><ArrowDown className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(item.recipeVersionId); }} className="rounded p-1 text-destructive hover:bg-card" title="Bỏ chọn"><Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
