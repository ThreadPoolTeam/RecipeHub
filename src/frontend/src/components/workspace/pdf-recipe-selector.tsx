'use client';

import React from 'react';
import { ArrowDown, ArrowUp, Coffee, Trash2 } from 'lucide-react';
import { Button, SearchInput } from './fields';
import type { GroupedRecipe, SelectedRecipeItem } from './pdf-document-workspace';

interface PdfRecipeSelectorProps {
  selectedItems: SelectedRecipeItem[];
  loadingCatalog: boolean;
  paginatedCatalog: GroupedRecipe[];
  filteredCount: number;
  catalogSearch: string;
  catalogPage: number;
  catalogTotalPages: number;
  setCatalogSearch: React.Dispatch<React.SetStateAction<string>>;
  setCatalogPage: React.Dispatch<React.SetStateAction<number>>;
  onClear: () => void;
  onToggle: (group: GroupedRecipe) => void;
  onVersionChange: (recipeId: string, versionId: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (versionId: string) => void;
}

export function PdfRecipeSelector({ selectedItems, loadingCatalog, paginatedCatalog, filteredCount, catalogSearch, catalogPage, catalogTotalPages, setCatalogSearch, setCatalogPage, onClear, onToggle, onVersionChange, onMove, onRemove }: PdfRecipeSelectorProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <h2 className="text-lg font-medium text-foreground">1 · Chọn công thức</h2>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">{selectedItems.length > 0 ? `${selectedItems.length} đã chọn` : 'Chưa chọn'}</span>
        </div>
        {selectedItems.length > 0 && <button type="button" onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive">Bỏ chọn tất cả</button>}
      </div>
      <SearchInput value={catalogSearch} onChange={(e) => { setCatalogSearch(e.target.value); setCatalogPage(1); }} placeholder="Tìm theo tên hoặc mã công thức..." onClear={() => { setCatalogSearch(''); setCatalogPage(1); }} />
      <div className="max-h-[360px] space-y-2 overflow-y-auto">
        {loadingCatalog ? (
          <div className="p-8 text-center text-muted-foreground"><div className="mx-auto mb-2 h-5 w-5 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin" /><p className="text-xs">Đang tải công thức...</p></div>
        ) : paginatedCatalog.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Không có công thức đã phát hành phù hợp.</div>
        ) : paginatedCatalog.map((group) => {
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
                  <select value={currentVersionId} onChange={(e) => onVersionChange(group.recipeId, e.target.value)} className="cursor-pointer rounded-md border border-input bg-card px-2 py-1 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title="Chọn phiên bản công thức">
                    {group.versions.map((version) => <option key={version.versionId || version.id} value={version.versionId || version.id}>{version.versionLabel || `v${version.versionNumber || 1}.0`}</option>)}
                  </select>
                ) : <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{group.versions[0]?.versionLabel || 'v1.0'}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {catalogTotalPages > 1 && (
        <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
          <span>{catalogPage} / {catalogTotalPages} ({filteredCount} món)</span>
          <div className="flex gap-1"><Button variant="ghost" size="sm" disabled={catalogPage <= 1} onClick={() => setCatalogPage((page) => page - 1)}>Trước</Button><Button variant="ghost" size="sm" disabled={catalogPage >= catalogTotalPages} onClick={() => setCatalogPage((page) => page + 1)}>Sau</Button></div>
        </div>
      )}
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
