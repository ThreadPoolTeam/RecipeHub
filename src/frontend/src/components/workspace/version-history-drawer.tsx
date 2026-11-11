'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, History, Clock, ArrowRight, ShieldCheck, FileText, Eye, ChevronDown, Utensils } from 'lucide-react';
import { RecipeVersion } from '@/lib/demo/types';
import { StatusBadge } from './status-badge';

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: RecipeVersion | null;
  versions: RecipeVersion[];
  currentVersionId?: string;
  onSelectVersion?: (version: RecipeVersion) => void;
  ingredientsMap?: Record<string, { name: string }>;
}

export function VersionHistoryDrawer({
  isOpen,
  onClose,
  recipe,
  versions,
  currentVersionId,
  onSelectVersion,
  ingredientsMap,
}: VersionHistoryDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || !recipe) return null;

  // Sort versions descending: v3, v2, v1
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return createPortal(
    <div className="fixed inset-0 z-[9999] w-screen h-screen flex justify-end" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <aside className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border bg-card text-foreground shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-secondary p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-primary">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="flex items-center gap-1.5 font-display text-sm text-foreground font-medium">
                Lịch Sử Phiên Bản
              </h3>
              <p className="font-mono text-xs text-muted-foreground">
                {recipe.code} • {recipe.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Đóng bảng lịch sử"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="relative space-y-6 pl-6 before:absolute before:bottom-2 before:left-2.5 before:top-2 before:w-0.5 before:bg-border before:content-['']">
            {sortedVersions.map((v) => {
              const isCurrent = v.id === (currentVersionId || recipe.id);
              const isPublished = v.status === 'Published';
              const dotColor = isCurrent
                ? 'bg-primary ring-4 ring-primary/20'
                : isPublished
                ? 'bg-success ring-2 ring-card'
                : 'bg-muted-foreground ring-2 ring-card';

              return (
                <div key={v.id} className="relative group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-[19px] top-1.5 w-3 h-3 rounded-full ${dotColor} transition`}
                  />

                  {/* Version Card */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? 'border-primary/50 bg-card shadow-soft ring-1 ring-primary/15'
                        : 'border-border bg-card hover:border-primary/50 hover:shadow-soft'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {v.versionLabel}
                        </span>
                        <StatusBadge status={v.status} />
                      </div>
                      {isCurrent && (
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Bản hiện tại
                        </span>
                      )}
                    </div>

                    <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Cập nhật: {new Date(v.updatedAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>Nguyên liệu: <strong>{v.ingredients?.length || 0}</strong></span>
                        <span>•</span>
                        <span>Quy trình: <strong>{v.steps?.length || 0} bước</strong></span>
                        {v.targetYield && (
                          <>
                            <span>•</span>
                            <span>{v.targetYield} {v.yieldUnit || ''}</span>
                          </>
                        )}
                      </div>
                      {v.creatorEmail && (
                        <div className="font-mono text-[11px] text-muted-foreground">
                          Người sửa: {v.creatorEmail.split('@')[0]}
                        </div>
                      )}
                    </div>

                    {/* Collapsible toggle to inspect ingredients & SOP */}
                    <button
                      type="button"
                      onClick={() => setExpandedVersionId(expandedVersionId === v.id ? null : v.id)}
                      className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                        <Eye className="w-3.5 h-3.5" />
                        {expandedVersionId === v.id ? 'Thu gọn chi tiết' : 'Xem nội dung (Nguyên liệu & Quy trình)'}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                          expandedVersionId === v.id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Detailed inspection content */}
                    {expandedVersionId === v.id && (
                      <div className="mt-2.5 space-y-3 border-t border-border pt-2.5 text-xs">
                        {/* Ingredients */}
                        <div>
                          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                            <Utensils className="h-3.5 w-3.5 text-primary" />
                            Định lượng nguyên liệu ({v.ingredients?.length || 0}):
                          </div>
                          {v.ingredients && v.ingredients.length > 0 ? (
                            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-secondary p-2">
                              {v.ingredients.map((ing, idx) => {
                                const name = ingredientsMap?.[ing.ingredientId]?.name || ing.notes || 'Chưa xác định';
                                return (
                                  <div key={`${ing.ingredientId}-${idx}`} className="flex items-center justify-between border-b border-border py-0.5 text-[11px] last:border-b-0">
                                    <span className="font-medium text-foreground">{name}</span>
                                    <span className="font-mono font-semibold text-muted-foreground">
                                      {ing.quantity} {ing.unit || ''}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="pl-1 text-[11px] italic text-muted-foreground">Chưa thiết lập định lượng</div>
                          )}
                        </div>

                        {/* SOP Steps */}
                        <div>
                          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            Quy trình SOP ({v.steps?.length || 0} bước):
                          </div>
                          {v.steps && v.steps.length > 0 ? (
                            <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-secondary p-2">
                              {v.steps.map((st, idx) => (
                                <div key={st.id || idx} className="border-b border-border py-1 text-[11px] last:border-b-0">
                                  <div className="flex items-center justify-between font-medium text-foreground">
                                    <span>Bước {st.stepNumber || idx + 1}: {st.title || 'Thao tác'}</span>
                                    {st.durationSeconds ? (
                                      <span className="font-mono text-[10px] text-primary">
                                        {st.durationSeconds}s
                                      </span>
                                    ) : null}
                                  </div>
                                  {st.instruction && (
                                    <div className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                                      {st.instruction}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="pl-1 text-[11px] italic text-muted-foreground">Chưa có các bước quy trình</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action button */}
                    {!isCurrent && (
                      <div className="mt-2.5 flex justify-end border-t border-border pt-2.5">
                        {onSelectVersion ? (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectVersion(v);
                              onClose();
                            }}
                            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-primary transition hover:underline"
                          >
                            Xem phiên bản này <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <Link
                            href={`/rnd/recipes/${v.recipeId || v.id}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary transition hover:underline"
                          >
                            Mở xem công thức này <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info note */}
        <div className="flex items-start gap-2 border-t border-border bg-secondary p-4 text-[11px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Các bản <strong>Đã phát hành</strong> được bảo lưu bất biến làm tài liệu chuẩn SOP và truy xuất nguồn gốc R&amp;D.
          </p>
        </div>
      </aside>
    </div>,
    document.body
  );
}
