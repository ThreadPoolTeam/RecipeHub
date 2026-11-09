'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Flag, Save } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { quizViewerApi, type ViewerAnswer, type ViewerAttempt } from '@/lib/api/quiz-viewer';
import { attemptUrl, detailUrl, useViewerResource, ViewerEmpty, ViewerError, ViewerFrame, ViewerLoading, viewerError, viewerQuizRoot } from './viewer-shared';

export default function ViewerTake({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const load = useCallback(async (actorId: string, signal: AbortSignal) => {
    const attempt = await quizViewerApi.resume(actorId, attemptId, signal);
    if (attempt.state === 'submitted') router.replace(`${attemptUrl(attemptId)}/result`);
    return attempt;
  }, [attemptId, router]);
  const { data, actorId, loading, error, retry } = useViewerResource(load);
  return <ViewerFrame title="Làm bài kiểm tra Quiz" description={data ? `Phiên bản ${data.versionNumber} · ${data.questions.length} câu hỏi · Không giới hạn thời gian` : 'Bài kiểm tra kiến thức công thức'}>
    {loading || data?.state === 'submitted' ? <ViewerLoading /> : error ? <ViewerError message={error} retry={retry} /> : data && actorId && <TakeSession key={data.attemptId} initial={data} actorId={actorId} />}
  </ViewerFrame>;
}

function TakeSession({ initial, actorId }: { initial: ViewerAttempt; actorId: string }) {
  const router = useRouter();
  const questions = initial.questions;
  const [answers, setAnswers] = useState<Record<number, number | null>>(() => Object.fromEntries(questions.map(question => [question.id, initial.savedAnswers.find(answer => answer.questionId === question.id)?.selectedOptionId ?? null])));
  const answersRef = useRef(answers);
  const [index, setIndex] = useState(() => Math.max(0, questions.findIndex(question => !initial.savedAnswers.some(answer => answer.questionId === question.id && answer.selectedOptionId !== null))));
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [revision, setRevision] = useState(0);
  const revisionRef = useRef(0);
  const savedRevision = useRef(0);
  const [saved, setSaved] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const pending = useRef<Promise<boolean>>(Promise.resolve(true));
  const stopping = useRef(false);
  const mounted = useRef(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const snapshot = (): ViewerAnswer[] => questions.map(question => ({ questionId: question.id, selectedOptionId: answersRef.current[question.id] ?? null }));

  useEffect(() => {
    mounted.current = true;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (revisionRef.current !== savedRevision.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { mounted.current = false; window.removeEventListener('beforeunload', beforeUnload); };
  }, []);

  const persist = useCallback((items: ViewerAnswer[], currentRevision: number) => {
    const task = pending.current.then(async () => {
      if (stopping.current) return false;
      if (mounted.current) { setSaving(true); setError(null); }
      try {
        await quizViewerApi.save(actorId, initial.attemptId, items);
        savedRevision.current = currentRevision;
        if (mounted.current) setSaved(currentRevision);
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          try {
            const current = await quizViewerApi.resume(actorId, initial.attemptId);
            if (current.state === 'submitted') {
              stopping.current = true;
              router.replace(`${attemptUrl(initial.attemptId)}/result`);
              return false;
            }
          } catch { /* Keep the original save error and local selections. */ }
        }
        if (mounted.current) setError(`Chưa lưu được đáp án. Lựa chọn vẫn được giữ trên màn hình. ${viewerError(error)}`);
        return false;
      } finally { if (mounted.current) setSaving(false); }
    });
    pending.current = task;
    return task;
  }, [actorId, initial.attemptId, router]);

  useEffect(() => {
    if (confirm && !dialog.current?.open) dialog.current?.showModal();
    else if (!confirm && dialog.current?.open) dialog.current.close();
  }, [confirm]);

  const choose = (questionId: number, optionId: number | null) => {
    if (stopping.current || leaving || answersRef.current[questionId] === optionId) return;
    const next = { ...answersRef.current, [questionId]: optionId };
    answersRef.current = next; setAnswers(next);
    revisionRef.current += 1; setRevision(revisionRef.current);
    void persist(questions.map(question => ({ questionId: question.id, selectedOptionId: next[question.id] ?? null })), revisionRef.current);
  };
  const exit = async () => {
    if (stopping.current || leaving) return;
    setLeaving(true);
    const ok = await persist(snapshot(), revisionRef.current);
    if (ok) router.push(`${viewerQuizRoot}/history`);
    else if (mounted.current) setLeaving(false);
  };
  const submit = async () => {
    if (stopping.current) return;
    stopping.current = true; setSubmitting(true); setError(null);
    try {
      // Finish any earlier save before submitting the full final answer snapshot.
      await pending.current;
      const result = await quizViewerApi.submit(actorId, initial.attemptId, snapshot());
      savedRevision.current = revisionRef.current;
      router.replace(`${attemptUrl(result.attemptId)}/result`);
    } catch (error) {
      stopping.current = false; setSubmitting(false); setConfirm(false);
      setError(`Chưa nộp được bài; đáp án vẫn được giữ. ${viewerError(error)}`);
    }
  };
  const answered = questions.filter(question => answers[question.id] !== null).length;
  const unanswered = questions.map((question, position) => answers[question.id] === null ? position : -1).filter(position => position !== -1);
  const question = questions[index];
  const busy = submitting || leaving;
  return <>
    <div className="mb-6 flex flex-wrap items-center gap-4 [&>span]:ml-auto">
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" onClick={exit} disabled={busy}>
        <Save size={16} />{leaving ? 'Đang lưu…' : 'Lưu & thoát'}</button>
        <span className="text-muted-foreground" role="status" aria-live="polite">{saving ? 'Đang lưu đáp án…' : revision !== saved ? 'Có thay đổi chưa lưu' : 'Đáp án đã được lưu'}</span>
        <button className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" disabled={busy || saving} onClick={() => void persist(snapshot(), revisionRef.current)}>Lưu ngay</button>
        </div>
    {error && <ViewerError message={error} retry={() => void persist(snapshot(), revisionRef.current)} />}
    {!question ? <ViewerEmpty title="Bài kiểm tra không có câu hỏi">
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => router.push(detailUrl(initial.quizId, initial.versionNumber))}>Quay về chi tiết</button>
        </ViewerEmpty> : <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <section className="min-w-0 lg:order-2">
        <article className="min-w-0 rounded-lg border border-border bg-card shadow-soft overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4 text-sm font-semibold">
        <span>CÂU {index + 1} <span className="text-muted-foreground">/ {questions.length}</span>
        </span>
        <button className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground aria-pressed:bg-primary-soft aria-pressed:text-primary focus-visible:ring-2 focus-visible:ring-ring" disabled={busy} aria-pressed={flags.has(question.id)} onClick={() => setFlags(previous => { const next = new Set(previous); if (next.has(question.id)) next.delete(question.id); else next.add(question.id); return next; })}>
        <Flag size={15} />{flags.has(question.id) ? 'Đã đánh dấu' : 'Xem lại'}</button>
        </div>
        <div className="p-6 md:p-8 [&_h2]:break-words [&_h2]:whitespace-pre-wrap [&_h2]:font-display [&_h2]:text-h3 [&_h2]:font-medium" key={question.id}>
        <p className="mb-2 text-pill font-medium uppercase tracking-wide text-muted-foreground">KIẾN THỨC CÔNG THỨC</p>
        <h2 id={`quiz-question-${question.id}`}>{question.content}</h2>
        <p className="text-muted-foreground my-5 text-sm">Chọn một đáp án phù hợp nhất.</p>
        <fieldset className="grid min-w-0 grid-cols-1 gap-3 border-0 p-0" disabled={busy} aria-labelledby={`quiz-question-${question.id}`}>
        <legend className="sr-only">Đáp án câu {index + 1}</legend>{question.options.map((option, position) => <label className={`relative flex min-h-16 min-w-0 cursor-pointer items-center gap-4 whitespace-pre-wrap [overflow-wrap:anywhere] [&>span:last-child]:min-w-0 [&>div]:min-w-0 rounded-lg border border-border bg-card p-4 text-left focus-within:ring-2 focus-within:ring-ring [&>input]:sr-only ${answers[question.id] === option.id ? '!border-primary !bg-primary-soft ring-1 ring-primary' : ''}`} key={option.id}>
        <input type="radio" name={`question-${question.id}`} value={option.id} checked={answers[question.id] === option.id} onChange={() => choose(question.id, option.id)} />
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary font-semibold text-muted-foreground">{String.fromCharCode(65 + position)}</span>
        <span>{option.content}</span>
        </label>)}</fieldset>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{answers[question.id] == null ? 'Bạn chưa chọn đáp án.' : 'Đã chọn đáp án. Bạn có thể thay đổi trước khi nộp bài.'}</span>{answers[question.id] != null && <button disabled={busy} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" onClick={() => choose(question.id, null)}>Bỏ lựa chọn</button>}</div>
        </div>
        </article>
        <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Chuyển câu hỏi">
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={index === 0 || busy} onClick={() => setIndex(value => value - 1)}>
        <ArrowLeft size={16} />Câu trước</button>
        <span className="hidden text-sm text-muted-foreground sm:inline">Theo nhịp của bạn.</span>{index < questions.length - 1 ? <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 !border-transparent !bg-primary !text-primary-foreground hover:opacity-90" disabled={busy} onClick={() => setIndex(value => value + 1)}>Câu tiếp<ArrowRight size={16} />
        </button> : <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 !border-transparent !bg-primary !text-primary-foreground hover:opacity-90" disabled={busy} onClick={() => setConfirm(true)}>Nộp bài<ArrowRight size={16} />
        </button>}</nav>
      </section>
      <aside className="grid gap-5 lg:order-1">
        <section className="min-w-0 rounded-lg border border-border bg-card shadow-soft p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 font-display text-panel font-medium">
        <h3>Hành trình của bạn</h3>
        <span className="inline-flex items-center justify-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-pill font-medium text-muted-foreground">Đang làm</span>
        </div>
        <progress className="block h-2 w-full overflow-hidden rounded-full accent-primary" value={answered} max={questions.length} aria-label="Số câu đã trả lời" />
        <p className="my-4 flex justify-between text-sm text-muted-foreground">{answered}/{questions.length} câu đã trả lời <span>{Math.round(answered / questions.length * 100)}%</span>
        </p>
        <nav className="my-5 grid grid-cols-5 gap-2" aria-label="Danh sách câu hỏi">{questions.map((item, position) => <button key={item.id} disabled={busy} className={`relative grid min-h-11 w-full place-items-center rounded-full border border-border bg-card text-sm tabular-nums text-muted-foreground hover:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${answers[item.id] !== null ? '!border-success !bg-success-soft !text-success' : ''} ${position === index ? '!border-primary !bg-primary !text-primary-foreground' : ''}`} aria-current={position === index ? 'step' : undefined} aria-label={`Câu ${position + 1}, ${answers[item.id] !== null ? 'đã trả lời' : 'chưa trả lời'}${flags.has(item.id) ? ', đánh dấu xem lại' : ''}`} onClick={() => setIndex(position)}>{position + 1}{flags.has(item.id) && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-current" />}</button>)}</nav>
        <div className="my-5 flex flex-wrap gap-3 text-xs text-muted-foreground [&>span]:flex [&>span]:items-center [&>span]:gap-1">
        <span>
        <i className="inline-block h-2.5 w-2.5 rounded-sm border border-border !border-success !bg-success-soft" />Đã trả lời</span>
        <span>
        <i className="inline-block h-2.5 w-2.5 rounded-sm border border-border" />Chưa trả lời</span>
        <span>⚑ Xem lại</span>
        </div>
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 !border-transparent !bg-primary !text-primary-foreground hover:opacity-90 w-full" disabled={busy} onClick={() => setConfirm(true)}>Hoàn thành & nộp bài</button>
        </section>
        <div className="rounded-lg bg-secondary p-5 text-sm [&_p]:mt-2 [&_p]:text-muted-foreground hidden lg:block">
        <strong>Không cần vội.</strong>
        <p>Bạn có thể quay lại bất kỳ câu nào. Đúng sai và giải thích chỉ xuất hiện sau khi nộp bài.</p>
        <p>Đánh dấu xem lại chỉ áp dụng trong phiên làm việc này.</p>
        </div>
        </aside>
    </div>}
    <dialog className="fixed inset-0 m-auto max-h-[calc(100dvh-40px)] w-[min(540px,calc(100%-32px))] overflow-y-auto rounded-lg border border-border bg-card p-6 text-foreground shadow-lift backdrop:bg-foreground/45 [&>p]:mt-4 [&>p]:text-muted-foreground" ref={dialog} aria-labelledby="quiz-confirm-title" onCancel={event => { if (submitting) event.preventDefault(); else setConfirm(false); }} onClose={() => { if (!submitting) setConfirm(false); }}>
        <h2 id="quiz-confirm-title">{unanswered.length ? 'Bạn còn câu chưa trả lời.' : 'Sẵn sàng nộp bài?'}</h2>
        <p>Đã trả lời {answered}/{questions.length} câu. {unanswered.length ? `${unanswered.length} câu chưa trả lời vẫn được gửi là bỏ trống.` : 'Tất cả câu hỏi đã có lựa chọn.'}</p>{unanswered.length > 0 && <div className="mt-4 flex flex-wrap gap-2" aria-label="Các câu chưa trả lời">{unanswered.map(position => <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={submitting} key={position} onClick={() => { setIndex(position); setConfirm(false); }}>Câu {position + 1}</button>)}</div>}<p>Sau khi xác nhận, bài làm được chấm trên máy chủ và không thể chỉnh sửa.</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={submitting} onClick={() => setConfirm(false)}>Làm tiếp</button>
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 !border-transparent !bg-primary !text-primary-foreground hover:opacity-90" disabled={submitting} onClick={submit}>{submitting ? 'Đang nộp…' : 'Xác nhận nộp bài'}</button>
        </div>
        </dialog>
  </>;
}
