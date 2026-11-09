'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, ArrowLeft, BookOpen, GraduationCap, Loader2 } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { ApiError } from '@/lib/api/client';

export const viewerQuizRoot = '/viewer/quizzes';
export function attemptUrl(id: string) { return `${viewerQuizRoot}/attempts/${encodeURIComponent(id)}`; }
export function detailUrl(id: string, version: number) { return `${viewerQuizRoot}/${encodeURIComponent(id)}?version=${version}`; }
export function viewerError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.status === 403) return 'Bạn không có quyền truy cập bài kiểm tra này.';
    if (error.status === 404) return 'Không tìm thấy bài kiểm tra hoặc phiên bản không còn khả dụng.';
    if (error.status === 409) return `Dữ liệu đã thay đổi. ${error.message}`;
  }
  return error instanceof Error ? error.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.';
}
export function viewerDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function useViewerResource<T>(loader: (actorId: string, signal: AbortSignal) => Promise<T>) {
  const { session } = useDemo();
  const actorId = session?.role === 'viewer' ? session.userId : null;
  const [resource, setResource] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [revision, setRevision] = useState(0);
  const latest = useRef(loader);
  latest.current = loader;
  useEffect(() => {
    if (!actorId) return;
    const controller = new AbortController();
    setResource({ data: null, error: null, loading: true });
    latest.current(actorId, controller.signal).then(data => {
      if (!controller.signal.aborted) setResource({ data, error: null, loading: false });
    }).catch(error => {
      if (!controller.signal.aborted) setResource({ data: null, error: viewerError(error), loading: false });
    });
    return () => controller.abort();
  }, [actorId, loader, revision]);
  return { ...resource, actorId, retry: () => setRevision(value => value + 1) };
}

export function ViewerFrame({ title, eyebrow, description, back, actions, children }: {
  title: string; eyebrow?: string; description?: string; back?: { href: string; label: string }; actions?: ReactNode; children: ReactNode;
}) {
  const { session, loading } = useDemo();
  return <div className="mx-auto max-w-[1360px] pb-16 text-foreground">
    {back && <Link className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary" href={back.href}><ArrowLeft size={15} />{back.label}</Link>}
    <header className="mb-8 flex flex-wrap items-end justify-between gap-6"><div>{eyebrow && <p className="mb-2 text-pill font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</p>}<h1 className="font-display text-h2 font-medium md:text-h1"><GraduationCap className="w-6 h-6 text-primary inline-block mr-2.5 shrink-0 align-middle" />{title}</h1>{description && <p className="text-muted-foreground">{description}</p>}</div><div className="flex shrink-0 gap-3">{actions}</div></header>
    {loading ? <ViewerLoading /> : session?.role !== 'viewer' ? <ViewerError message="Không gian làm bài dành cho tài khoản Viewer. Vui lòng đăng nhập bằng tài khoản phù hợp." /> : children}
  </div>;
}
export function ViewerLoading() { return <div className="flex min-h-60 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground" role="status"><Loader2 className="motion-safe:animate-spin" size={24} /><p>Đang tải bài kiểm tra…</p></div>; }
export function ViewerError({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="my-4 flex items-start gap-3 rounded-lg border border-destructive-border bg-destructive-tint p-4 text-destructive" role="alert"><AlertCircle size={20} className="shrink-0" /><div className="min-w-0 [overflow-wrap:anywhere]"><p>{message}</p>{retry && <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" onClick={retry}>Thử lại</button>}</div></div>;
}
export function ViewerEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="flex min-h-60 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground"><BookOpen size={30} /><h2>{title}</h2>{children}</div>;
}
export function ViewerPagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages < 2) return null;
  return <nav className="mt-7 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground" aria-label="Phân trang"><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Trước</button><span>Trang {page} / {pages} · {total} mục</span><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={page >= pages} onClick={() => onChange(page + 1)}>Sau →</button></nav>;
}
