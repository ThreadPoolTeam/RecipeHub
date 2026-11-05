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
    <div className="qv-take-toolbar"><button className="qv-button" onClick={exit} disabled={busy}><Save size={16} />{leaving ? 'Đang lưu…' : 'Lưu & thoát'}</button><span className="qv-muted" role="status" aria-live="polite">{saving ? 'Đang lưu đáp án…' : revision !== saved ? 'Có thay đổi chưa lưu' : 'Đáp án đã được lưu'}</span><button className="qv-text-link" disabled={busy || saving} onClick={() => void persist(snapshot(), revisionRef.current)}>Lưu ngay</button></div>
    {error && <ViewerError message={error} retry={() => void persist(snapshot(), revisionRef.current)} />}
    {!question ? <ViewerEmpty title="Bài kiểm tra không có câu hỏi"><button className="qv-button" onClick={() => router.push(detailUrl(initial.quizId, initial.versionNumber))}>Quay về chi tiết</button></ViewerEmpty> : <div className="qv-take-layout">
      <section className="qv-question-area"><article className="qv-panel qv-question-card"><div className="qv-question-top"><span>CÂU {index + 1} <span className="qv-muted">/ {questions.length}</span></span><button className="qv-flag" disabled={busy} aria-pressed={flags.has(question.id)} onClick={() => setFlags(previous => { const next = new Set(previous); if (next.has(question.id)) next.delete(question.id); else next.add(question.id); return next; })}><Flag size={15} />{flags.has(question.id) ? 'Đã đánh dấu' : 'Xem lại'}</button></div>
        <div className="qv-question-body" key={question.id}><p className="qv-eyebrow">KIẾN THỨC CÔNG THỨC</p><h2 id={`qv-question-${question.id}`}>{question.content}</h2><p className="qv-muted qv-instruction">Chọn một đáp án phù hợp nhất.</p><fieldset className="qv-options" disabled={busy} aria-labelledby={`qv-question-${question.id}`}><legend className="qv-sr-only">Đáp án câu {index + 1}</legend>{question.options.map((option, position) => <label className={`qv-option ${answers[question.id] === option.id ? 'qv-selected' : ''}`} key={option.id}><input type="radio" name={`question-${question.id}`} value={option.id} checked={answers[question.id] === option.id} onChange={() => choose(question.id, option.id)} /><span className="qv-option-letter">{String.fromCharCode(65 + position)}</span><span>{option.content}</span></label>)}</fieldset>
          <div className="qv-selected-note"><span>{answers[question.id] == null ? 'Bạn chưa chọn đáp án.' : 'Đã chọn đáp án. Bạn có thể thay đổi trước khi nộp bài.'}</span>{answers[question.id] != null && <button disabled={busy} className="qv-text-link" onClick={() => choose(question.id, null)}>Bỏ lựa chọn</button>}</div>
        </div></article>
        <nav className="qv-question-nav" aria-label="Chuyển câu hỏi"><button className="qv-button" disabled={index === 0 || busy} onClick={() => setIndex(value => value - 1)}><ArrowLeft size={16} />Câu trước</button><span className="qv-nav-hint">Theo nhịp của bạn.</span>{index < questions.length - 1 ? <button className="qv-button qv-primary" disabled={busy} onClick={() => setIndex(value => value + 1)}>Câu tiếp<ArrowRight size={16} /></button> : <button className="qv-button qv-primary" disabled={busy} onClick={() => setConfirm(true)}>Nộp bài<ArrowRight size={16} /></button>}</nav>
      </section>
      <aside className="qv-take-aside"><section className="qv-panel qv-progress-panel"><div className="qv-section-heading"><h3>Hành trình của bạn</h3><span className="qv-tag">Đang làm</span></div><progress className="qv-progress" value={answered} max={questions.length} aria-label="Số câu đã trả lời" /><p className="qv-progress-copy">{answered}/{questions.length} câu đã trả lời <span>{Math.round(answered / questions.length * 100)}%</span></p><nav className="qv-palette" aria-label="Danh sách câu hỏi">{questions.map((item, position) => <button key={item.id} disabled={busy} className={`qv-number ${answers[item.id] !== null ? 'qv-answered' : ''} ${position === index ? 'qv-current' : ''}`} aria-current={position === index ? 'step' : undefined} aria-label={`Câu ${position + 1}, ${answers[item.id] !== null ? 'đã trả lời' : 'chưa trả lời'}${flags.has(item.id) ? ', đánh dấu xem lại' : ''}`} onClick={() => setIndex(position)}>{position + 1}{flags.has(item.id) && <span className="qv-flag-dot" />}</button>)}</nav><div className="qv-legend"><span><i className="qv-swatch qv-done" />Đã trả lời</span><span><i className="qv-swatch" />Chưa trả lời</span><span>⚑ Xem lại</span></div><button className="qv-button qv-primary qv-full" disabled={busy} onClick={() => setConfirm(true)}>Hoàn thành & nộp bài</button></section><div className="qv-note qv-desktop-tip"><strong>Không cần vội.</strong><p>Bạn có thể quay lại bất kỳ câu nào. Đúng sai và giải thích chỉ xuất hiện sau khi nộp bài.</p><p>Đánh dấu xem lại chỉ áp dụng trong phiên làm việc này.</p></div></aside>
    </div>}
    <dialog className="qv-confirm" ref={dialog} aria-labelledby="qv-confirm-title" onCancel={event => { if (submitting) event.preventDefault(); else setConfirm(false); }} onClose={() => { if (!submitting) setConfirm(false); }}><h2 id="qv-confirm-title">{unanswered.length ? 'Bạn còn câu chưa trả lời.' : 'Sẵn sàng nộp bài?'}</h2><p>Đã trả lời {answered}/{questions.length} câu. {unanswered.length ? `${unanswered.length} câu chưa trả lời vẫn được gửi là bỏ trống.` : 'Tất cả câu hỏi đã có lựa chọn.'}</p>{unanswered.length > 0 && <div className="qv-unanswered" aria-label="Các câu chưa trả lời">{unanswered.map(position => <button className="qv-button" disabled={submitting} key={position} onClick={() => { setIndex(position); setConfirm(false); }}>Câu {position + 1}</button>)}</div>}<p>Sau khi xác nhận, bài làm được chấm trên máy chủ và không thể chỉnh sửa.</p><div className="qv-dialog-actions"><button className="qv-button" disabled={submitting} onClick={() => setConfirm(false)}>Làm tiếp</button><button className="qv-button qv-primary" disabled={submitting} onClick={submit}>{submitting ? 'Đang nộp…' : 'Xác nhận nộp bài'}</button></div></dialog>
  </>;
}
