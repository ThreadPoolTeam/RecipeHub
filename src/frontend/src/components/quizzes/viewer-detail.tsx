'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, Target } from 'lucide-react';
import { quizViewerApi } from '@/lib/api/quiz-viewer';
import { attemptUrl, useViewerResource, ViewerError, ViewerFrame, ViewerLoading, viewerDate, viewerQuizRoot } from './viewer-shared';
import { useToast } from '@/components/workspace/toast';
import { useDemo } from '@/lib/demo/provider';
import { findRecipeIdByVersionId } from '@/lib/recipe-version-lookup';

export default function ViewerDetail({ quizId, version }: { quizId: string; version: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const { session, repo } = useDemo();
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
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
  const recipeVersionId = data?.quiz.recipeVersionId;
  // Bài kiểm tra chỉ lưu mã phiên bản; trang xem công thức đi theo mã công thức nên phải tra lại.
  useEffect(() => {
    setRecipeId(null);
    if (!session || !recipeVersionId) return;
    let alive = true;
    findRecipeIdByVersionId(repo, session, recipeVersionId).then(id => { if (alive) setRecipeId(id); }).catch(() => undefined);
    return () => { alive = false; };
  }, [session, repo, recipeVersionId]);
  const start = async () => {
    if (!actorId || startingRef.current) return;
    startingRef.current = true; setStarting(true);
    try {
      const attempt = await quizViewerApi.start(actorId, quizId, version);
      router.push(attemptUrl(attempt.attemptId) + (attempt.state === 'submitted' ? '/result' : ''));
    } catch { toast({ type: 'error', title: 'Không thể bắt đầu bài kiểm tra', description: 'Vui lòng thử lại.' }); }
    finally { startingRef.current = false; setStarting(false); }
  };
  return <ViewerFrame title={data?.quiz.title ?? 'Chi tiết bài kiểm tra'} description={data?.quiz.recipeTitle}>
    {loading ? <ViewerLoading /> : error ? <ViewerError message={error} retry={retry} /> : data && <>
      <div className="mb-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"><section className="min-w-0 rounded-lg border border-border bg-card shadow-soft p-6 md:p-8"><p className="mb-2 text-pill font-medium uppercase tracking-wide text-muted-foreground">{data.quiz.code} / PHIÊN BẢN {data.quiz.versionNumber}</p><h2 className="font-display text-h2 font-medium">Sẵn sàng thử sức?</h2>{data.quiz.description && <p className="mt-4 whitespace-pre-wrap text-muted-foreground">{data.quiz.description}</p>}
        <div className="my-8 grid gap-5 border-y border-border py-7 sm:grid-cols-3 [&>div]:flex [&>div]:flex-col [&>div]:gap-2 [&_svg]:text-primary [&_span]:text-sm [&_span]:text-muted-foreground"><div><BookOpen size={20} /><strong>{data.quiz.questionsCount} câu hỏi</strong><span>Trắc nghiệm một lựa chọn</span></div><div><Target size={20} /><strong>Đạt từ {data.quiz.passingScore}%</strong><span>Chấm điểm sau khi nộp bài</span></div><div><Clock size={20} /><strong>Không giới hạn giờ</strong><span>Làm theo nhịp của bạn</span></div></div>
        <div className="rounded-lg bg-secondary p-5 text-sm [&_p]:mt-2 [&_p]:text-muted-foreground"><strong>Trước khi bắt đầu</strong><p>Đáp án được lưu trong lúc làm bài. Bạn có thể quay lại từ lịch sử để tiếp tục. Sau khi nộp, bài làm không thể chỉnh sửa; kết quả và giải thích sẽ được mở.</p></div>
        {recipeId && <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-6" href={`/viewer/recipes/${encodeURIComponent(recipeId)}?versionId=${encodeURIComponent(data.quiz.recipeVersionId)}`}>Ôn lại công thức liên quan <ArrowRight size={16} /></Link>}
      </section><aside className="min-w-0 rounded-lg border border-border bg-card shadow-soft space-y-4 p-6 [&>a]:w-full [&>button]:w-full"><span className="inline-flex items-center justify-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-pill font-medium text-muted-foreground">Học từ công thức thật</span><h2 className="font-display text-h3 font-medium">{active ? 'Tiếp tục hành trình' : 'Bắt đầu bài kiểm tra'}</h2><p className="text-muted-foreground">{active ? `Bạn có bài đang làm từ ${viewerDate(active.startedAt)}.` : 'Chọn đáp án phù hợp nhất cho từng câu hỏi. Không hiển thị đúng sai trước khi nộp.'}</p>
        {active ? <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 !border-transparent !bg-primary !text-primary-foreground hover:opacity-90" href={attemptUrl(active.attemptId)}>Tiếp tục làm bài <ArrowRight size={16} /></Link> : <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 !border-transparent !bg-primary !text-primary-foreground hover:opacity-90" onClick={start} disabled={starting || data.quiz.questionsCount === 0}>{starting ? 'Đang mở bài…' : 'Bắt đầu làm bài'}<ArrowRight size={16} /></button>}
      </aside></div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 font-display text-panel font-medium"><h2 className="font-display font-medium">Các lần làm gần đây</h2><Link className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" href={`${viewerQuizRoot}/history?quizId=${encodeURIComponent(quizId)}&version=${version}`}>Xem toàn bộ lịch sử →</Link></div>
      {data.attempts.items.length === 0 ? <p className="text-muted-foreground">Bạn chưa làm phiên bản này.</p> : <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-soft">{data.attempts.items.map(attempt => <Link key={attempt.attemptId} className="flex min-w-0 items-center gap-4 p-5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>div:first-child]:flex-1" href={attemptUrl(attempt.attemptId) + (attempt.state === 'submitted' ? '/result' : '')}><div><strong>{viewerDate(attempt.submittedAt ?? attempt.startedAt)}</strong><p className="text-muted-foreground">Phiên bản {attempt.versionNumber}</p></div><span className={`inline-flex items-center justify-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-pill font-medium text-muted-foreground ${attempt.state === 'submitted' ? attempt.isPassed ? '!bg-success-soft !text-success' : '!bg-destructive-soft !text-destructive' : ''}`}>{attempt.state === 'in_progress' ? 'Đang làm · Tiếp tục' : `${attempt.score}% · ${attempt.isPassed ? 'Đạt' : 'Chưa đạt'}`}</span><ArrowRight size={17} /></Link>)}</div>}
    </>}
  </ViewerFrame>;
}
