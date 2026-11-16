'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { quizViewerApi } from '@/lib/api/quiz-viewer';
import { attemptUrl, useViewerResource, ViewerEmpty, ViewerError, ViewerFrame, ViewerLoading, ViewerPagination, viewerDate, viewerQuizRoot } from './viewer-shared';

export default function ViewerHistory({ quizId, version }: { quizId?: string; version?: number }) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState('');
  const load = useCallback(async (actorId: string, signal: AbortSignal) => {
    const history = await quizViewerApi.history(actorId, { page, state, quizId, version }, signal);
    const titles: Record<string, string> = {};
    await Promise.all([...new Map(history.items.map(attempt => [`${attempt.quizId}:${attempt.versionNumber}`, attempt])).values()].map(attempt => quizViewerApi.preview(actorId, attempt.quizId, attempt.versionNumber, signal).then(quiz => { titles[`${attempt.quizId}:${attempt.versionNumber}`] = `${quiz.code} · ${quiz.title}`; }).catch(() => undefined)));
    return { history, titles };
  }, [page, state, quizId, version]);
  const { data: resource, loading, error, retry } = useViewerResource(load);
  const data = resource?.history;
  const titleOf = (id: string, versionNumber: number) => resource?.titles[`${id}:${versionNumber}`] ?? 'Bộ đề chưa xác định';
  return <ViewerFrame title="Lịch sử làm bài Quiz" description="Xem lại kết quả các lượt làm bài kiểm tra và đối chiếu câu trả lời.">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap gap-2" aria-label="Lọc trạng thái">{[{ value: '', label: 'Tất cả' }, { value: 'in_progress', label: 'Đang làm' }, { value: 'submitted', label: 'Đã nộp' }].map(filter => <button key={filter.value} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${state === filter.value ? '!border-primary !bg-primary !text-primary-foreground hover:brightness-90' : ''}`} aria-pressed={state === filter.value} onClick={() => { setState(filter.value); setPage(1); }}>{filter.label}</button>)}</div>{quizId && <Link className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" href={`${viewerQuizRoot}/history`}>Bỏ lọc bộ đề</Link>}</div>
    {quizId && <p className="text-muted-foreground text-xs">{data?.items.length ? titleOf(data.items[0].quizId, data.items[0].versionNumber) : 'Bộ đề đã chọn'}{version ? ` · Phiên bản ${version}` : ''}</p>}
    {loading ? <ViewerLoading /> : error ? <ViewerError message={error} retry={retry} /> : data?.items.length === 0 ? <ViewerEmpty title="Chưa có lượt làm phù hợp"><p className="text-muted-foreground">Bắt đầu một bài kiểm tra để ghi lại hành trình của bạn.</p><Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 !border-transparent !bg-primary !text-primary-foreground hover:opacity-90" href={viewerQuizRoot}>Khám phá bài kiểm tra</Link></ViewerEmpty> : <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-soft">{data?.items.map(attempt => <Link className="flex min-w-0 flex-wrap items-center gap-4 p-5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>div:first-child]:flex-1" key={attempt.attemptId} href={attemptUrl(attempt.attemptId) + (attempt.state === 'submitted' ? '/result' : '')}>
      <div className={`!flex-none grid h-12 w-12 place-items-center rounded-full bg-secondary text-muted-foreground ${attempt.state === 'in_progress' ? '' : attempt.isPassed ? '!bg-success-soft !text-success' : '!bg-destructive-soft !text-destructive'}`}>{attempt.state === 'in_progress' ? <Clock size={21} /> : attempt.isPassed ? <CheckCircle2 size={21} /> : <XCircle size={21} />}</div><div className="min-w-0 flex-1 [&_strong]:break-words"><strong>{titleOf(attempt.quizId, attempt.versionNumber)}</strong><p className="text-muted-foreground">Phiên bản {attempt.versionNumber} · {attempt.answers.length} câu</p><p className="text-muted-foreground text-xs">{attempt.state === 'submitted' ? 'Đã nộp' : 'Bắt đầu'} {viewerDate(attempt.submittedAt ?? attempt.startedAt)}</p></div>
      <div className="flex flex-col items-end gap-1 text-right"><span className={`inline-flex items-center justify-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-pill font-medium text-muted-foreground ${attempt.state === 'submitted' ? attempt.isPassed ? '!bg-success-soft !text-success' : '!bg-destructive-soft !text-destructive' : ''}`}>{attempt.state === 'in_progress' ? 'Đang làm' : attempt.isPassed ? 'Đạt yêu cầu' : 'Chưa đạt'}</span><strong>{attempt.state === 'in_progress' ? 'Tiếp tục làm bài' : `${attempt.score}%`}</strong><span className="text-muted-foreground text-xs">{attempt.state === 'submitted' ? `Ngưỡng đạt ${attempt.passingScore}% · Xem kết quả` : `${attempt.answers.filter(answer => answer.selectedOptionId !== null).length} câu đã lưu`}</span></div><ArrowRight size={18} />
    </Link>)}</div>}
    {data && <ViewerPagination page={data.page} total={data.total} pageSize={data.pageSize} onChange={setPage} />}
  </ViewerFrame>;
}
