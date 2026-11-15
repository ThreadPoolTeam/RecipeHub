'use client';

import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save } from 'lucide-react';
import { quizManagement, type QuizDetail, type QuizDraft, type QuizQuestion, type QuizSummary } from '@/lib/api/quiz-management';
import { ConfirmDialog, ManagementFrame, Message, errorText, useManagementContext } from './management-shared';
import { ManagementEditorToolbar } from './management-editor-toolbar';
import { ManagementEditorAside } from './management-editor-aside';
import { actionDescription, actionTitle, type PendingAction } from './management-editor-actions';
import { ManagementQuestion } from './management-question';
import { ManagementQuestionList } from './management-question-list';
import { ManagementAiEditorPanel, useActiveQuizAiJob } from './management-ai-editor-panel';
import { useQuizAiJobFeedback } from './management-ai-feedback';
import { useQuizAiJobs } from './use-quiz-ai-jobs';
import { confirmLeave, useUnsavedChangesGuard } from './use-unsaved-changes-guard';
import { ManagementPreview } from './management-preview';
import { Button } from '@/components/workspace/fields';
import { useToast } from '@/components/workspace/toast';
function toDraft(detail: QuizDetail): QuizDraft {
  return { title: detail.title, description: detail.description, recipeVersionId: detail.version.recipeVersionId, passingScore: detail.version.passingScore, questions: [...detail.version.questions].sort((a, b) => a.sortOrder - b.sortOrder).map(question => ({ ...question, options: [...question.options].sort((a, b) => a.sortOrder - b.sortOrder) })) };
}
export function ManagementEditor({ quizId }: { quizId: string }) {
  const { session, base } = useManagementContext();
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const requestedVersion = params.get('version');
  const version = requestedVersion && /^[1-9]\d*$/.test(requestedVersion) && Number.isSafeInteger(Number(requestedVersion)) ? Number(requestedVersion) : null;
  const [detail, setDetail] = useState<QuizDetail | null>(null);
  const [summary, setSummary] = useState<QuizSummary | null>(null);
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [questionIndex, setQuestionIndex] = useState<number | null>(null);
  const [removeQuestion, setRemoveQuestion] = useState<number | null>(null);
  const [action, setAction] = useState<PendingAction | null>(null);
  const [preview, setPreview] = useState(false);
  const reloadQuiz = useCallback(() => setRetry(value => value + 1), []);
  const onAiJobFinished = useQuizAiJobFeedback(base, reloadQuiz);
  const ai = useQuizAiJobs(session?.userId, onAiJobFinished);
  const quizJobs = ai.jobs.filter(job => job.quizId === quizId);
  const activeQuizJob = useActiveQuizAiJob(ai.jobs, quizId);
  useEffect(() => {
    if (!session || session.role === 'viewer') return;
    if (!version) { setError('Đường dẫn cần phiên bản hợp lệ. Mở bộ đề từ danh sách.'); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(''); setDetail(null); setDraft(null);
    quizManagement.detail(session.userId, quizId, version, controller.signal).then(async data => {
      const list = await quizManagement.list(session.userId, { code: data.code, pageSize: 100 }, controller.signal);
      if (controller.signal.aborted) return;
      setDetail(data); setDraft(toDraft(data)); setSummary(list.items.find(item => item.quizId === quizId) ?? null); setDirty(false);
    }).catch(e => { if (!controller.signal.aborted) setError(errorText(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session, quizId, version, retry]);
  useUnsavedChangesGuard(dirty);
  const editable = detail?.version.state === 'draft' && !busy && !activeQuizJob;
  function update(fields: Partial<QuizDraft>) { setDraft(current => current ? { ...current, ...fields } : current); setDirty(true); }
  function moveQuestion(index: number, direction: -1 | 1) {
    if (!draft) return;
    const questions = [...draft.questions];
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    [questions[index], questions[target]] = [questions[target], questions[index]];
    update({ questions });
  }
  async function save() {
    if (!session || !draft || !version || busy) return;
    if (!draft.title.trim() || !draft.recipeVersionId || !Number.isFinite(draft.passingScore) || draft.passingScore <= 0 || draft.passingScore > 100) { setError('Nhập tên, chọn công thức và điểm đạt lớn hơn 0, tối đa 100.'); return; }
    setBusy(true); setError('');
    try {
      const saved = await quizManagement.save(session.userId, quizId, version, { ...draft, title: draft.title.trim(), description: draft.description?.trim() || null, questions: draft.questions.map((question, index) => ({ ...question, sortOrder: index + 1, options: question.options.map((option, optionIndex) => ({ ...option, sortOrder: optionIndex + 1 })) })) });
      setDetail(saved); setDraft(toDraft(saved)); setDirty(false); toast({ type: 'success', title: 'Đã lưu bản nháp' });
    } catch { toast({ type: 'error', title: 'Không thể lưu bản nháp', description: 'Vui lòng kiểm tra thông tin và thử lại.' }); } finally { setBusy(false); }
  }
  async function executeAction() {
    if (!session || !version || !action || busy) return;
    setBusy(true); setError('');
    try {
      if (action === 'deleteQuiz') { await quizManagement.deleteQuiz(session.userId, quizId); setDirty(false); toast({ type: 'success', title: 'Đã xóa bộ đề' }); router.push(base); }
      else if (action === 'deleteVersion') {
        await quizManagement.deleteVersion(session.userId, quizId, version);
        const remaining = summary?.versions.filter(item => item.versionNumber !== version).sort((a, b) => b.versionNumber - a.versionNumber)[0];
        setDirty(false); toast({ type: 'success', title: 'Đã xóa bản nháp' }); router.push(remaining ? `${base}/${quizId}?version=${remaining.versionNumber}` : base);
      } else {
        const result = action === 'clone' ? await quizManagement.clone(session.userId, quizId, version) : await quizManagement.transition(session.userId, quizId, version, action);
        setDirty(false);
        if (action === 'clone') { toast({ type: 'success', title: 'Đã nhân bản phiên bản' }); router.push(`${base}/${quizId}?version=${result.version.versionNumber}`); }
        else { setDetail(result); setDraft(toDraft(result)); toast({ type: 'success', title: action === 'published' ? 'Đã ban hành phiên bản' : 'Đã lưu trữ phiên bản' }); setSummary(current => current ? { ...current, versions: current.versions.map(item => item.versionNumber === version ? { ...item, state: result.version.state } : item) } : current); }
      }
      setAction(null);
    } catch { toast({ type: 'error', title: 'Không thể thực hiện thao tác', description: 'Vui lòng thử lại.' }); setAction(null); } finally { setBusy(false); }
  }
  function upsertQuestion(question: QuizQuestion) {
    if (!draft || questionIndex === null) return;
    update({
      questions: questionIndex < 0
        ? [...draft.questions, question]
        : draft.questions.map((item, index) => index === questionIndex ? question : item),
    });
    setQuestionIndex(null);
  }
  function removeQuestionAt(index: number) {
    if (draft) update({ questions: draft.questions.filter((_, item) => item !== index) });
    setRemoveQuestion(null);
  }
  const title = action ? actionTitle(action, version) : '';
  const description = action ? actionDescription(action) : '';
  return <ManagementFrame
    title={detail?.title ?? 'Soạn bộ đề Quiz'}
    description={detail ? `${detail.code} · Phiên bản v${detail.version.versionNumber}` : 'Nội dung và cấu hình bộ đề'}
    actions={detail?.version.state === 'draft' && (
      <Button variant="primary" onClick={save} disabled={busy || loading || activeQuizJob}>
        <Save size={16} strokeWidth={1.5} />
        {busy ? 'Đang xử lý…' : 'Lưu bản nháp'}
      </Button>
    )}
  >
    <ManagementAiEditorPanel
      actor={session!.userId}
      quizId={quizId}
      version={version ?? detail?.version.versionNumber ?? 1}
      existingCount={draft?.questions.length ?? 0}
      dirty={dirty}
      jobs={quizJobs}
      onCancel={ai.cancel}
      onAccepted={ai.reload}
    />
    <Message error={error} />
    {error && !detail && <Button disabled={busy} onClick={() => { if (confirmLeave(dirty)) setRetry(value => value + 1); }}>Tải lại</Button>}
    {loading && <p className="rounded-lg border border-border p-8 text-center text-muted-foreground" role="status">Đang tải phiên bản…</p>}
    {detail && draft && <>
      <ManagementEditorToolbar
        state={detail.version.state}
        version={version}
        versions={summary?.versions ?? null}
        dirty={dirty}
        busy={busy}
        lockedByAi={activeQuizJob}
        base={base}
        quizId={quizId}
        role={session?.role}
        questionCount={draft.questions.length}
        onVersionChange={value => { if (confirmLeave(dirty)) router.push(`${base}/${quizId}?version=${value}`); }}
        onClone={() => setAction('clone')}
        onPreview={() => setPreview(true)}
        onTransition={() => setAction(detail.version.state === 'draft' ? 'published' : 'archived')}
      />
      {dirty && <p className="mb-4 text-sm text-muted-foreground">Lưu bản nháp trước khi nhân bản hoặc ban hành.</p>}
      {detail.version.state !== 'draft' && <div className="mb-4 rounded-lg bg-info-soft p-3 text-info">Nội dung đã khóa. Nhân bản phiên bản để tiếp tục chỉnh sửa.</div>}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(200px,0.9fr)_minmax(0,2fr)_minmax(260px,1fr)]">
        <ManagementQuestionList
          draft={draft}
          editable={editable}
          onAdd={() => setQuestionIndex(-1)}
          onMove={moveQuestion}
          onEdit={setQuestionIndex}
          onDuplicate={(question, index) => {
            const copy: QuizQuestion = { ...question, id: null, options: question.options.map(option => ({ ...option, id: null })) };
            update({ questions: [...draft.questions.slice(0, index + 1), copy, ...draft.questions.slice(index + 1)] });
          }}
          onRemove={setRemoveQuestion}
        />
        <ManagementEditorAside
          actor={session?.userId}
          draft={draft}
          editable={editable}
          busy={busy}
          version={version}
          summary={summary}
          isDraft={detail.version.state === 'draft'}
          onUpdate={update}
          onAction={setAction}
        />
      </div>
    </>}
    {questionIndex !== null && draft && (
      <ManagementQuestion
        question={questionIndex >= 0 ? draft.questions[questionIndex] : undefined}
        onClose={() => setQuestionIndex(null)}
        onSave={upsertQuestion}
      />
    )}
    {removeQuestion !== null && (
      <ConfirmDialog title={`Xóa câu ${removeQuestion + 1}?`} description="Câu hỏi sẽ bị bỏ khỏi bản nháp. Bấm Lưu bản nháp để lưu thay đổi lên hệ thống." busy={false} onClose={() => setRemoveQuestion(null)} onConfirm={() => removeQuestionAt(removeQuestion)} />
    )}
    {action && <ConfirmDialog title={title} description={description} busy={busy} onClose={() => setAction(null)} onConfirm={executeAction} />}
    {preview && draft && <ManagementPreview draft={draft} onClose={() => setPreview(false)} />}
  </ManagementFrame>;
}
