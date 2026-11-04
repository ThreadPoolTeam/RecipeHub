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
  return <ViewerFrame title="Bài kiểm tra kiến thức SOP" description="Ôn lại công thức, thử sức với bài kiểm tra và học từ từng câu trả lời."
    actions={<Link href={`${viewerQuizRoot}/history`} className="qv-button"><History size={16} />Lịch sử của tôi</Link>}>
    <div className="qv-section-heading"><h2>Bài kiểm tra dành cho bạn</h2>{data && <span className="qv-muted">{data.total} bộ đề đã ban hành</span>}</div>
    {loading ? <ViewerLoading /> : error ? <ViewerError message={error} retry={retry} /> : data && data.items.length === 0 ? <ViewerEmpty title="Chưa có bài kiểm tra khả dụng"><p className="qv-muted">Bộ đề đã ban hành theo quyền xem công thức sẽ xuất hiện tại đây.</p></ViewerEmpty> : <div className="qv-catalog">{data?.items.map(quiz => <Link href={detailUrl(quiz.quizId, quiz.versionNumber)} className="qv-quiz-card" key={`${quiz.quizId}-${quiz.versionNumber}`}>
      <div className="qv-card-top"><span className="qv-book"><BookOpen size={25} /></span><span className="qv-tag">Phiên bản {quiz.versionNumber}</span></div>
      <p className="qv-eyebrow">{quiz.code}</p><h3>{quiz.title}</h3><p className="qv-muted qv-clamp">{quiz.description || 'Kiểm tra kiến thức từ công thức đã ban hành.'}</p>
      <p className="qv-recipe">{quiz.recipeTitle}</p><div className="qv-card-bottom"><span>{quiz.questionsCount} câu · Đạt từ {quiz.passingScore}%</span><ArrowUpRight size={20} aria-hidden="true" /></div>
    </Link>)}</div>}
    {data && <ViewerPagination page={data.page} total={data.total} pageSize={data.pageSize} onChange={setPage} />}
  </ViewerFrame>;
}
