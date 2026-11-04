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
      <aside className="relative w-full max-w-lg bg-white border-l border-[#E8E2D9] h-full shadow-2xl flex flex-col z-10 text-[#1A1917]">
        {/* Header */}
        <div className="p-5 border-b border-[#E8E2D9] flex items-center justify-between bg-[#FAF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F5F0E8] border border-[#E8E2D9] flex items-center justify-center text-[#B47820]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1A1917] flex items-center gap-1.5">
                Lịch Sử Phiên Bản
              </h3>
              <p className="text-xs text-[#706E68] font-mono">
                {recipe.code} • {recipe.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#706E68] hover:text-[#1A1917] hover:bg-[#F5F0E8] transition"
            aria-label="Đóng bảng lịch sử"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E8E2D9]">
            {sortedVersions.map((v) => {
              const isCurrent = v.id === (currentVersionId || recipe.id);
              const isPublished = v.status === 'Published';
              const dotColor = isCurrent
                ? 'bg-[#B47820] ring-4 ring-[#B47820]/20'
                : isPublished
                ? 'bg-emerald-600 ring-2 ring-white'
                : 'bg-zinc-400 ring-2 ring-white';

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
                        ? 'bg-[#FFFDF9] border-[#B47820]/50 shadow-xs ring-1 ring-[#B47820]/15'
                        : 'bg-white border-[#E8E2D9] hover:border-[#D5CEBF] hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#1A1917]">
                          {v.versionLabel}
                        </span>
                        <StatusBadge status={v.status} />
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#B47820]/10 text-[#B47820] border border-[#B47820]/20">
                          Bản hiện tại
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#706E68] space-y-1 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#8C887F]" />
                        <span>Cập nhật: {new Date(v.updatedAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#8C887F]">
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
                        <div className="text-[11px] text-[#8C887F] font-mono">
                          Người sửa: {v.creatorEmail.split('@')[0]}
                        </div>
                      )}
                    </div>

                    {/* Collapsible toggle to inspect ingredients & SOP */}
                    <button
                      type="button"
                      onClick={() => setExpandedVersionId(expandedVersionId === v.id ? null : v.id)}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-[#FAF9F5] hover:bg-[#F5F0E8] border border-[#E8E2D9] text-xs font-medium text-[#1A1917] flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 text-[#B47820] font-semibold text-[11px]">
                        <Eye className="w-3.5 h-3.5" />
                        {expandedVersionId === v.id ? 'Thu gọn chi tiết' : 'Xem nội dung (Nguyên liệu & Quy trình)'}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#706E68] transition-transform ${
                          expandedVersionId === v.id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Detailed inspection content */}
                    {expandedVersionId === v.id && (
                      <div className="mt-2.5 pt-2.5 border-t border-[#F0ECE4] space-y-3 animate-fade-in text-xs">
                        {/* Ingredients */}
                        <div>
                          <div className="font-semibold text-[#1A1917] mb-1 flex items-center gap-1.5 text-[11px]">
                            <Utensils className="w-3.5 h-3.5 text-[#B47820]" />
                            Định lượng nguyên liệu ({v.ingredients?.length || 0}):
                          </div>
                          {v.ingredients && v.ingredients.length > 0 ? (
                            <div className="space-y-1 bg-[#FAF9F5] p-2 rounded-lg border border-[#E8E2D9] max-h-40 overflow-y-auto">
                              {v.ingredients.map((ing, idx) => {
                                const name = ingredientsMap?.[ing.ingredientId]?.name || ing.notes || ing.ingredientId;
                                return (
                                  <div key={`${ing.ingredientId}-${idx}`} className="flex items-center justify-between text-[11px] py-0.5 border-b border-[#F5F0E8] last:border-b-0">
                                    <span className="text-[#1A1917] font-medium">{name}</span>
                                    <span className="font-mono text-[#706E68] font-semibold">
                                      {ing.quantity} {ing.unit || ''}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-[11px] text-[#8C887F] italic pl-1">Chưa thiết lập định lượng</div>
                          )}
                        </div>

                        {/* SOP Steps */}
                        <div>
                          <div className="font-semibold text-[#1A1917] mb-1 flex items-center gap-1.5 text-[11px]">
                            <FileText className="w-3.5 h-3.5 text-[#B47820]" />
                            Quy trình SOP ({v.steps?.length || 0} bước):
                          </div>
                          {v.steps && v.steps.length > 0 ? (
                            <div className="space-y-1.5 bg-[#FAF9F5] p-2 rounded-lg border border-[#E8E2D9] max-h-48 overflow-y-auto">
                              {v.steps.map((st, idx) => (
                                <div key={st.id || idx} className="text-[11px] py-1 border-b border-[#F0ECE4] last:border-b-0">
                                  <div className="font-medium text-[#1A1917] flex items-center justify-between">
                                    <span>Bước {st.stepNumber || idx + 1}: {st.title || 'Thao tác'}</span>
                                    {st.durationSeconds ? (
                                      <span className="font-mono text-[10px] text-[#B47820]">
                                        {st.durationSeconds}s
                                      </span>
                                    ) : null}
                                  </div>
                                  {st.instruction && (
                                    <div className="text-[#706E68] text-[10px] line-clamp-2 mt-0.5">
                                      {st.instruction}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] text-[#8C887F] italic pl-1">Chưa có các bước quy trình</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action button */}
                    {!isCurrent && (
                      <div className="pt-2.5 mt-2.5 border-t border-[#F0ECE4] flex justify-end">
                        {onSelectVersion ? (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectVersion(v);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B47820] hover:text-[#9A6416] transition cursor-pointer"
                          >
                            Xem phiên bản này <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <Link
                            href={`/rnd/recipes/${v.recipeId || v.id}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B47820] hover:text-[#9A6416] transition"
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
        <div className="p-4 border-t border-[#E8E2D9] bg-[#FAF9F5] text-[11px] text-[#706E68] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#B47820] shrink-0 mt-0.5" />
          <p>
            Các bản <strong>Đã phát hành</strong> được bảo lưu bất biến làm tài liệu chuẩn SOP và truy xuất nguồn gốc R&amp;D.
          </p>
        </div>
      </aside>
    </div>,
    document.body
  );
}
