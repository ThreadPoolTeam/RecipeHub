'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { quizViewerApi } from '@/lib/api/quiz-viewer';
import { attemptUrl, useViewerResource, ViewerEmpty, ViewerError, ViewerFrame, ViewerLoading, ViewerPagination, viewerDate, viewerQuizRoot } from './viewer-shared';

export default function ViewerHistory({ quizId, version }: { quizId?: string; version?: number }) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState('');
  const load = useCallback((actorId: string, signal: AbortSignal) => quizViewerApi.history(actorId, { page, state, quizId, version }, signal), [page, state, quizId, version]);
  const { data, loading, error, retry } = useViewerResource(load);
  return <ViewerFrame title="Lịch sử làm bài Quiz" description="Xem lại kết quả các lượt làm bài kiểm tra và đối chiếu câu trả lời.">
    <div className="qv-history-toolbar"><div className="qv-filter-tabs" aria-label="Lọc trạng thái">{[{ value: '', label: 'Tất cả' }, { value: 'in_progress', label: 'Đang làm' }, { value: 'submitted', label: 'Đã nộp' }].map(filter => <button key={filter.value} className={`qv-button ${state === filter.value ? 'qv-filter-active' : ''}`} aria-pressed={state === filter.value} onClick={() => { setState(filter.value); setPage(1); }}>{filter.label}</button>)}</div>{quizId && <Link className="qv-text-link" href={`${viewerQuizRoot}/history`}>Bỏ lọc bộ đề</Link>}</div>
    {quizId && <p className="qv-muted qv-small">Bộ đề #{quizId.slice(0, 8)}{version ? ` · Phiên bản ${version}` : ''}</p>}
    {loading ? <ViewerLoading /> : error ? <ViewerError message={error} retry={retry} /> : data?.items.length === 0 ? <ViewerEmpty title="Chưa có lượt làm phù hợp"><p className="qv-muted">Bắt đầu một bài kiểm tra để ghi lại hành trình của bạn.</p><Link className="qv-button qv-primary" href={viewerQuizRoot}>Khám phá bài kiểm tra</Link></ViewerEmpty> : <div className="qv-history-list">{data?.items.map(attempt => <Link className="qv-history-row" key={attempt.attemptId} href={attemptUrl(attempt.attemptId) + (attempt.state === 'submitted' ? '/result' : '')}>
      <div className={`qv-history-icon ${attempt.state === 'in_progress' ? '' : attempt.isPassed ? 'qv-pass' : 'qv-fail'}`}>{attempt.state === 'in_progress' ? <Clock size={21} /> : attempt.isPassed ? <CheckCircle2 size={21} /> : <XCircle size={21} />}</div><div className="qv-history-info"><strong>Bộ đề #{attempt.quizId.slice(0, 8)}</strong><p className="qv-muted">Phiên bản {attempt.versionNumber} · {attempt.answers.length} câu</p><p className="qv-muted qv-small">{attempt.state === 'submitted' ? 'Đã nộp' : 'Bắt đầu'} {viewerDate(attempt.submittedAt ?? attempt.startedAt)}</p></div>
      <div className="qv-history-outcome"><span className={`qv-tag ${attempt.state === 'submitted' ? attempt.isPassed ? 'qv-pass' : 'qv-fail' : ''}`}>{attempt.state === 'in_progress' ? 'Đang làm' : attempt.isPassed ? 'Đạt yêu cầu' : 'Chưa đạt'}</span><strong>{attempt.state === 'in_progress' ? 'Tiếp tục làm bài' : `${attempt.score}%`}</strong><span className="qv-muted qv-small">{attempt.state === 'submitted' ? `Ngưỡng đạt ${attempt.passingScore}% · Xem kết quả` : `${attempt.answers.filter(answer => answer.selectedOptionId !== null).length} câu đã lưu`}</span></div><ArrowRight size={18} />
    </Link>)}</div>}
    {data && <ViewerPagination page={data.page} total={data.total} pageSize={data.pageSize} onChange={setPage} />}
  </ViewerFrame>;
}
