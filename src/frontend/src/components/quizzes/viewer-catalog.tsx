'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, History } from 'lucide-react';
import { quizViewerApi } from '@/lib/api/quiz-viewer';
import { detailUrl, useViewerResource, ViewerEmpty, ViewerError, ViewerFrame, ViewerLoading, ViewerPagination, viewerQuizRoot } from './viewer-shared';

export default function ViewerCatalog() {
  const [page, setPage] = useState(1);
  const load = useCallback((actorId: string, signal: AbortSignal) => quizViewerApi.catalog(actorId, page, signal), [page]);
  const { data, loading, error, retry } = useViewerResource(load);
  return <ViewerFrame title="Bài kiểm tra dành cho bạn" description="Làm bài ngắn để xác nhận bạn nắm đúng công thức chuẩn."
    actions={<Link href={`${viewerQuizRoot}/history`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 !border-transparent !bg-primary !text-primary-foreground"><History size={16} />Lịch sử của tôi</Link>}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 font-display text-panel font-medium"><h2>Bài kiểm tra dành cho bạn</h2>{data && <span className="text-muted-foreground">{data.total} bộ đề đã ban hành</span>}</div>
    {loading ? <ViewerLoading /> : error ? <ViewerError message={error} retry={retry} /> : data && data.items.length === 0 ? <ViewerEmpty title="Chưa có bài kiểm tra khả dụng"><p className="text-muted-foreground">Bộ đề đã ban hành theo quyền xem công thức sẽ xuất hiện tại đây.</p></ViewerEmpty> : <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{data?.items.map(quiz => <Link href={detailUrl(quiz.quizId, quiz.versionNumber)} className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-6 shadow-soft hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" key={`${quiz.quizId}-${quiz.versionNumber}`}>
      <div className="mb-5 flex items-start justify-between gap-3"><span className="inline-flex rounded-lg bg-primary-soft p-4 text-primary"><BookOpen size={25} /></span><span className="inline-flex items-center justify-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-pill font-medium text-muted-foreground">Phiên bản {quiz.versionNumber}</span></div>
      <p className="mb-2 text-pill font-medium uppercase tracking-wide text-muted-foreground">{quiz.code}</p><h3 className="mb-2 [overflow-wrap:anywhere] font-display text-h3 font-medium">{quiz.title}</h3><p className="text-muted-foreground line-clamp-2">{quiz.description || 'Kiểm tra kiến thức từ công thức đã ban hành.'}</p>
      <p className="mb-5 mt-6 text-sm text-muted-foreground [overflow-wrap:anywhere]">{quiz.recipeTitle}</p><div className="mt-auto flex justify-between gap-3 border-t border-border pt-4 text-sm"><span>{quiz.questionsCount} câu · Đạt từ {quiz.passingScore}%</span><ArrowUpRight size={20} aria-hidden="true" /></div>
    </Link>)}</div>}
    {data && <ViewerPagination page={data.page} total={data.total} pageSize={data.pageSize} onChange={setPage} />}
  </ViewerFrame>;
}
