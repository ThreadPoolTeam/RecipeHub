'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import type { QuizState } from '@/lib/api/quiz-management';
import './management-styles.css';

export function useManagementContext() {
  const { session, repo } = useDemo();
  return { session, repo, base: session?.role === 'admin' ? '/admin/quizzes' : '/rnd/quizzes' };
}
export function ManagementFrame({ children, title, description, actions }: { children: ReactNode; title: string; description?: string; actions?: ReactNode }) {
  const { session } = useManagementContext();
  return <section className="qm-page"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9] mb-6"><div><h1 className="text-2xl font-bold text-[#1A1917] flex items-center gap-2.5"><GraduationCap className="w-6 h-6 text-[#B47820]" />{title}</h1>{description && <p className="text-[#706E68] text-sm mt-1">{description}</p>}</div>{actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}</div>{session && session.role !== 'viewer' ? children : <p role="status">Không có quyền quản lý Quiz.</p>}</section>;
}
export function QuizStatus({ state }: { state: QuizState }) {
  return <span className={`qm-status qm-status-${state}`}>{state === 'draft' ? '◷ Bản nháp' : state === 'published' ? '✓ Đã ban hành' : '▤ Đã lưu trữ'}</span>;
}
export function Message({ error, message }: { error?: string; message?: string }) {
  return <>{error && <div role="alert" className="qm-notice qm-error">{error}</div>}{message && <div role="status" className="qm-notice">{message}</div>}</>;
}
export function errorText(error: unknown) { return error instanceof Error ? error.message : 'Không thể hoàn tất yêu cầu.'; }
export function Pagination({ page, total, pageSize, onPage, disabled }: { page: number; total: number; pageSize: number; onPage: (page: number) => void; disabled?: boolean }) {
  return <nav className="qm-pagination" aria-label="Phân trang"><span>{total} mục · Trang {page}/{Math.max(1, Math.ceil(total / pageSize))}</span><button type="button" className="qm-btn" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>Trước</button><button type="button" className="qm-btn" disabled={disabled || page * pageSize >= total} onClick={() => onPage(page + 1)}>Sau</button></nav>;
}
export function ManagementDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    node?.showModal();
    const cancel = (event: Event) => { event.preventDefault(); close.current(); };
    node?.addEventListener('cancel', cancel);
    return () => { node?.removeEventListener('cancel', cancel); node?.close(); previous?.focus(); };
  }, []);
  return <dialog className="qm-dialog" ref={dialog} aria-labelledby="qm-dialog-title"><header className="qm-row"><h2 id="qm-dialog-title">{title}</h2><button type="button" className="qm-btn" onClick={onClose} aria-label="Đóng hộp thoại">Đóng ×</button></header>{children}</dialog>;
}
export function ConfirmDialog({ title, description, busy, onConfirm, onClose }: { title: string; description: string; busy: boolean; onConfirm: () => void; onClose: () => void }) {
  return <ManagementDialog title={title} onClose={() => { if (!busy) onClose(); }}><p>{description}</p><div className="qm-actions"><button className="qm-btn" disabled={busy} onClick={onClose}>Hủy</button><button className="qm-btn qm-danger" disabled={busy} onClick={onConfirm}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</button></div></ManagementDialog>;
}
