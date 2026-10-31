'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, Target } from 'lucide-react';
import { quizViewerApi } from '@/lib/api/quiz-viewer';
import { attemptUrl, useViewerResource, ViewerError, ViewerFrame, ViewerLoading, viewerDate, viewerError, viewerQuizRoot } from './viewer-shared';

export default function ViewerDetail({ quizId, version }: { quizId: string; version: number }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const validVersion = Number.isInteger(version) && version > 0;
  const load = useCallback(async (actorId: string, signal: AbortSignal) => {
    if (!validVersion) throw new Error('Liên kết thiếu phiên bản hợp lệ. Hãy chọn lại bài kiểm tra từ danh sách.');
    const [quiz, attempts] = await Promise.all([
      quizViewerApi.preview(actorId, quizId, version, signal),
      quizViewerApi.history(actorId, { quizId, version }, signal),
    ]);
    return { quiz, attempts };
  }, [quizId, version, validVersion]);
  const { data, actorId, loading, error, retry } = useViewerResource(load);
  const active = data?.attempts.items.find(attempt => attempt.state === 'in_progress');
  const start = async () => {
    if (!actorId || startingRef.current) return;
    startingRef.current = true; setStarting(true); setActionError(null);
    try {
      const attempt = await quizViewerApi.start(actorId, quizId, version);
      router.push(attemptUrl(attempt.attemptId) + (attempt.state === 'submitted' ? '/result' : ''));
    } catch (error) { setActionError(viewerError(error)); }
    finally { startingRef.current = false; setStarting(false); }
  };
  return <ViewerFrame title={data?.quiz.title ?? 'Chi tiết bài kiểm tra'} description={data?.quiz.recipeTitle}>
    {loading ? <ViewerLoading /> : error ? <ViewerError message={error} retry={retry} /> : data && <>
      <div className="qv-detail-layout"><section className="qv-panel qv-detail-main"><p className="qv-eyebrow">{data.quiz.code} / PHIÊN BẢN {data.quiz.versionNumber}</p><h2>Sẵn sàng thử sức?</h2>{data.quiz.description && <p className="qv-description">{data.quiz.description}</p>}
        <div className="qv-facts"><div><BookOpen size={20} /><strong>{data.quiz.questionsCount} câu hỏi</strong><span>Trắc nghiệm một lựa chọn</span></div><div><Target size={20} /><strong>Đạt từ {data.quiz.passingScore}%</strong><span>Chấm điểm sau khi nộp bài</span></div><div><Clock size={20} /><strong>Không giới hạn giờ</strong><span>Làm theo nhịp của bạn</span></div></div>
        <div className="qv-note"><strong>Trước khi bắt đầu</strong><p>Đáp án được lưu trong lúc làm bài. Bạn có thể quay lại từ lịch sử để tiếp tục. Sau khi nộp, bài làm không thể chỉnh sửa; kết quả và giải thích sẽ được mở.</p></div>
        <Link className="qv-button" href={`/viewer/recipes/${encodeURIComponent(data.quiz.recipeVersionId)}`}>Ôn lại công thức liên quan <ArrowRight size={16} /></Link>
      </section><aside className="qv-panel qv-start-panel"><span className="qv-tag">Học từ công thức thật</span><h2>{active ? 'Tiếp tục hành trình' : 'Bắt đầu bài kiểm tra'}</h2><p className="qv-muted">{active ? `Bạn có bài đang làm từ ${viewerDate(active.startedAt)}.` : 'Chọn đáp án phù hợp nhất cho từng câu hỏi. Không hiển thị đúng sai trước khi nộp.'}</p>
        {actionError && <ViewerError message={actionError} />}
        {active ? <Link className="qv-button qv-primary" href={attemptUrl(active.attemptId)}>Tiếp tục làm bài <ArrowRight size={16} /></Link> : <button className="qv-button qv-primary" onClick={start} disabled={starting || data.quiz.questionsCount === 0}>{starting ? 'Đang mở bài…' : 'Bắt đầu làm bài'}<ArrowRight size={16} /></button>}
      </aside></div>
      <div className="qv-section-heading"><h2>Các lần làm gần đây</h2><Link className="qv-text-link" href={`${viewerQuizRoot}/history?quizId=${encodeURIComponent(quizId)}&version=${version}`}>Xem toàn bộ lịch sử →</Link></div>
      {data.attempts.items.length === 0 ? <p className="qv-muted">Bạn chưa làm phiên bản này.</p> : <div className="qv-history-list">{data.attempts.items.map(attempt => <Link key={attempt.attemptId} className="qv-history-row" href={attemptUrl(attempt.attemptId) + (attempt.state === 'submitted' ? '/result' : '')}><div><strong>{viewerDate(attempt.submittedAt ?? attempt.startedAt)}</strong><p className="qv-muted">Phiên bản {attempt.versionNumber}</p></div><span className={`qv-tag ${attempt.state === 'submitted' ? attempt.isPassed ? 'qv-pass' : 'qv-fail' : ''}`}>{attempt.state === 'in_progress' ? 'Đang làm · Tiếp tục' : `${attempt.score}% · ${attempt.isPassed ? 'Đạt' : 'Chưa đạt'}`}</span><ArrowRight size={17} /></Link>)}</div>}
    </>}
  </ViewerFrame>;
}
