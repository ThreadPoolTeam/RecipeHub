'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useDemo } from '@/lib/demo/provider';
import type { QuizState } from '@/lib/api/quiz-management';
import { Button } from '@/components/workspace/fields';

export function useManagementContext() {
  const { session, repo } = useDemo();
  return { session, repo, base: '/rnd/quizzes' };
}
export function ManagementFrame({ children, title, description, actions }: { children: ReactNode; title: string; description?: string; actions?: ReactNode }) {
  const { session } = useManagementContext();
  return <section className="mx-auto max-w-[1360px] pb-16 text-foreground">
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="font-display text-h2 font-medium sm:text-h1">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {session?.role === 'rnd' ? children : <p role="status">Không có quyền quản lý Quiz.</p>}
  </section>;
}
export function QuizStatus({ state }: { state: QuizState }) {
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-pill font-medium ${state === 'draft' ? 'bg-info-soft text-info' : state === 'published' ? 'bg-success-soft text-success' : 'bg-secondary text-muted-foreground'}`}>{state === 'draft' ? '◷ Bản nháp' : state === 'published' ? '✓ Đã ban hành' : '▤ Đã lưu trữ'}</span>;
}
export function Message({ error, message }: { error?: string; message?: string }) {
  return <>{error && <div role="alert" className="mb-4 rounded-lg border border-destructive-border bg-destructive-tint p-3 text-destructive">{error}</div>}{message && <div role="status" className="mb-4 rounded-lg bg-info-soft p-3 text-info">{message}</div>}</>;
}
export function errorText(error: unknown) { return error instanceof Error ? error.message : 'Không thể hoàn tất yêu cầu.'; }
export function Pagination({ page, total, pageSize, onPage, disabled }: { page: number; total: number; pageSize: number; onPage: (page: number) => void; disabled?: boolean }) {
  return <nav className="mt-6 flex flex-wrap items-center justify-end gap-3 text-sm text-muted-foreground" aria-label="Phân trang"><span>{total} mục · Trang {page}/{Math.max(1, Math.ceil(total / pageSize))}</span><Button type="button" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>Trước</Button><Button type="button" disabled={disabled || page * pageSize >= total} onClick={() => onPage(page + 1)}>Sau</Button></nav>;
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
  return <dialog className="max-h-[90vh] w-[min(560px,calc(100%-2rem))] overflow-y-auto rounded-lg border border-border bg-card p-6 text-foreground shadow-lift backdrop:bg-foreground/45" ref={dialog} aria-labelledby="management-dialog-title">
    <header className="mb-4 flex items-center justify-between gap-4">
      <h2 id="management-dialog-title" className="font-display text-panel font-medium">{title}</h2>
      <Button type="button" onClick={onClose} aria-label="Đóng hộp thoại">Đóng ×</Button>
    </header>
    {children}
  </dialog>;
}
export function ConfirmDialog({ title, description, busy, onConfirm, onClose }: { title: string; description: string; busy: boolean; onConfirm: () => void; onClose: () => void }) {
  return <ManagementDialog title={title} onClose={() => { if (!busy) onClose(); }}><p>{description}</p><div className="mt-5 flex flex-wrap justify-end gap-2"><Button disabled={busy} onClick={onClose}>Hủy</Button><Button variant="danger" disabled={busy} onClick={onConfirm}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</Button></div></ManagementDialog>;
}
