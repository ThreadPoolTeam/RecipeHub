'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Pencil, Copy, Trash2, Save } from 'lucide-react';
import { quizManagement, type QuizDetail, type QuizDraft, type QuizQuestion, type QuizSummary } from '@/lib/api/quiz-management';
import { ConfirmDialog, ManagementFrame, Message, QuizStatus, errorText, useManagementContext } from './management-shared';
import { ManagementRecipePicker } from './management-recipe-picker';
import { ManagementQuestion } from './management-question';

import { ManagementPreview } from './management-preview';
import { Button, Select, TextArea, TextInput } from '@/components/workspace/fields';
import { useToast } from '@/components/workspace/toast';
type PendingAction = 'deleteQuiz' | 'deleteVersion' | 'published' | 'archived' | 'clone';
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
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link || link.getAttribute('href')?.startsWith('#')) return;
      if (!window.confirm('Có thay đổi chưa lưu. Bỏ các thay đổi này?')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', navigate, true);
    window.addEventListener('beforeunload', beforeUnload);
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', navigate, true); };
  }, [dirty]);
  const editable = detail?.version.state === 'draft' && !busy;
  function update(fields: Partial<QuizDraft>) { setDraft(current => current ? { ...current, ...fields } : current); setDirty(true); }
  function canLeave() { return !dirty || window.confirm('Có thay đổi chưa lưu. Bỏ các thay đổi này?'); }
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
  const actionTitle = action === 'deleteQuiz' ? 'Xóa toàn bộ bộ đề?'
    : action === 'deleteVersion' ? `Xóa bản nháp v${version}?`
    : action === 'published' ? 'Ban hành phiên bản?'
    : action === 'archived' ? 'Lưu trữ phiên bản?' : 'Nhân bản phiên bản?';
  const actionDescription = action === 'published'
    ? 'Sau khi ban hành, nội dung phiên bản không thể chỉnh sửa. Nhân viên có quyền sẽ có thể làm bài.'
    : action === 'archived'
    ? 'Phiên bản ngừng nhận lượt làm mới. Kết quả đã có được giữ nguyên.'
    : action === 'clone'
    ? 'Tạo phiên bản nháp mới từ nội dung đã lưu của phiên bản đang xem.'
    : 'Thao tác không thể hoàn tác. Backend chỉ cho xóa bản nháp không có lượt làm bài.';
  return <ManagementFrame
    title={detail?.title ?? 'Soạn bộ đề Quiz'}
    description={detail ? `${detail.code} · Phiên bản v${detail.version.versionNumber}` : 'Nội dung và cấu hình bộ đề'}
    actions={detail?.version.state === 'draft' && (
      <Button variant="primary" onClick={save} disabled={busy || loading}>
        <Save size={16} strokeWidth={1.5} />
        {busy ? 'Đang xử lý…' : 'Lưu bản nháp'}
      </Button>
    )}
  >
    <Message error={error} />
    {error && !detail && <Button disabled={busy} onClick={() => { if (canLeave()) setRetry(value => value + 1); }}>Tải lại</Button>}
    {loading && <p className="rounded-lg border border-border p-8 text-center text-muted-foreground" role="status">Đang tải phiên bản…</p>}
    {detail && draft && <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <QuizStatus state={detail.version.state} />
          <Select
            label="Phiên bản" value={version ?? ''} disabled={busy}
            onChange={event => { if (canLeave()) router.push(`${base}/${quizId}?version=${event.target.value}`); }}
          >
            {(summary?.versions ?? [detail.version]).map(item => (
              <option key={item.versionId} value={item.versionNumber}>
                v{item.versionNumber} · {item.state === 'draft' ? 'Bản nháp' : item.state === 'published' ? 'Đã ban hành' : 'Đã lưu trữ'}
              </option>
            ))}
          </Select>
          <span className="text-sm text-muted-foreground" role="status">{dirty ? '● Có thay đổi chưa lưu' : 'Đang hiển thị nội dung đã lưu'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || dirty} onClick={() => setAction('clone')}><Copy size={15} strokeWidth={1.5} />Nhân bản phiên bản</Button>
          <Link className="inline-flex h-9 items-center rounded-md border border-input bg-card px-4 text-sm font-semibold shadow-control focus-visible:ring-2 focus-visible:ring-ring" href={`${base}/results?quizId=${quizId}&version=${version}`}>Kết quả</Link>
          <Button disabled={busy || !draft.questions.length} onClick={() => setPreview(true)}>Xem thử</Button>
          {session?.role === 'rnd' && detail.version.state !== 'archived' && (
            <Button
              variant="primary"
              disabled={busy || dirty || (detail.version.state === 'draft' && !draft.questions.length)}
              onClick={() => setAction(detail.version.state === 'draft' ? 'published' : 'archived')}
            >
              {detail.version.state === 'draft' ? 'Ban hành' : 'Lưu trữ'}
            </Button>
          )}
        </div>
      </div>
      {dirty && <p className="mb-4 text-sm text-muted-foreground">Lưu bản nháp trước khi nhân bản hoặc ban hành.</p>}
      {detail.version.state !== 'draft' && <div className="mb-4 rounded-lg bg-info-soft p-3 text-info">Nội dung đã khóa. Nhân bản phiên bản để tiếp tục chỉnh sửa.</div>}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(200px,0.9fr)_minmax(0,2fr)_minmax(260px,1fr)]">
        <nav aria-label="Danh sách câu hỏi" className="space-y-3 rounded-lg border border-border bg-card p-5 shadow-soft">
          <h2 className="font-display text-panel font-medium">
            Câu hỏi · {draft.questions.length}/100
          </h2>
          <ol className="space-y-2">
            {draft.questions.map((question, index) => (
              <li key={index}>
                <a href={`#management-question-${index}`} className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="text-muted-foreground">{index + 1}</span>
                  <span className="min-w-0 break-words">{question.content}</span>
                </a>
              </li>
            ))}
          </ol>
          {editable && (
            <Button className="w-full" disabled={draft.questions.length >= 100} onClick={() => setQuestionIndex(-1)}>
              <Plus size={16} strokeWidth={1.5} /> Thêm câu hỏi
            </Button>
          )}
        </nav>
        <div className="space-y-4">
          {!draft.questions.length && (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <h3 className="font-display text-panel font-medium">Bắt đầu với câu hỏi đầu tiên</h3>
              <p className="text-sm text-muted-foreground">Mỗi câu có từ 2 đến 6 lựa chọn và đúng một đáp án đúng.</p>
            </div>
          )}
          {draft.questions.map((question, index) => <article id={`management-question-${index}`} className="scroll-mt-24 space-y-4 rounded-lg border border-border bg-card p-6 shadow-soft" key={index}>
            <header className="flex flex-wrap items-start gap-3">
              <span className="rounded-md bg-primary-soft px-2 py-1 text-primary">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="min-w-0 flex-1 whitespace-pre-wrap font-display text-panel font-medium">{question.content}</h3>
              {editable && <div className="flex flex-wrap gap-1">
                <Button aria-label={`Chuyển câu ${index + 1} lên`} disabled={index === 0} onClick={() => moveQuestion(index, -1)}>↑</Button>
                <Button aria-label={`Chuyển câu ${index + 1} xuống`} disabled={index === draft.questions.length - 1} onClick={() => moveQuestion(index, 1)}>↓</Button>
                <Button aria-label={`Sửa câu ${index + 1}`} onClick={() => setQuestionIndex(index)}><Pencil size={15} strokeWidth={1.5} /></Button>
                <Button
                  aria-label={`Nhân bản câu ${index + 1}`}
                  disabled={draft.questions.length >= 100}
                  onClick={() => {
                    const copy: QuizQuestion = {
                      ...question, id: null,
                      options: question.options.map(option => ({ ...option, id: null })),
                    };
                    update({ questions: [...draft.questions.slice(0, index + 1), copy, ...draft.questions.slice(index + 1)] });
                  }}
                >
                  <Copy size={15} strokeWidth={1.5} />
                </Button>
                <Button aria-label={`Xóa câu ${index + 1}`} onClick={() => setRemoveQuestion(index)}><Trash2 size={15} strokeWidth={1.5} /></Button>
              </div>}
            </header>
            <ol className="space-y-2">
              {question.options.map((option, optionIndex) => (
                <li key={optionIndex} className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${option.isCorrect ? 'border-success bg-success-soft text-success' : 'border-border'}`}>
                  <span>{String.fromCharCode(65 + optionIndex)}</span>
                  <div className="flex-1 whitespace-pre-wrap">{option.content}</div>
                  {option.isCorrect && <strong>✓ Đúng</strong>}
                </li>
              ))}
            </ol>
            {question.explanation && <p className="whitespace-pre-wrap text-sm text-muted-foreground"><strong>Giải thích:</strong> {question.explanation}</p>}
          </article>)}
        </div>
        <aside className="space-y-4">
          <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-panel font-medium">Cấu hình bộ đề</h2>
            <TextInput label="Tên bộ đề" disabled={!editable} maxLength={200} value={draft.title} onChange={event => update({ title: event.target.value })} />
            <TextArea label="Mô tả" disabled={!editable} rows={3} value={draft.description ?? ''} onChange={event => update({ description: event.target.value })} />
            <TextInput label="Điểm đạt (%)" disabled={!editable} type="number" min="0.01" max="100" step="0.01" value={Number.isNaN(draft.passingScore) ? '' : draft.passingScore} onChange={event => update({ passingScore: event.target.valueAsNumber })} />
            <p className="text-sm text-muted-foreground">Đáp án đúng và giải thích chỉ hiển thị trong trang quản lý hoặc sau khi nhân viên nộp bài.</p>
          </div>
          {session && <ManagementRecipePicker actor={session.userId} value={draft.recipeVersionId} onChange={recipeVersionId => update({ recipeVersionId })} disabled={!editable} />}
          {detail.version.state === 'draft' && (
            <div className="space-y-3 rounded-lg border border-border bg-card p-6">
              <h3 className="font-display text-panel font-medium">Xóa bản nháp</h3>
              <p className="text-sm text-muted-foreground">Chỉ xóa phiên bản nháp chưa có lượt làm bài.</p>
              <div className="flex flex-wrap gap-2">
                {summary && summary.versions.length > 1 && <Button variant="ghost" className="text-destructive" disabled={busy} onClick={() => setAction('deleteVersion')}>Xóa phiên bản v{version}</Button>}
                {summary?.versions.every(item => item.state === 'draft') && <Button variant="ghost" className="text-destructive" disabled={busy} onClick={() => setAction('deleteQuiz')}>Xóa toàn bộ bộ đề</Button>}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>}
    {questionIndex !== null && draft && (
      <ManagementQuestion
        question={questionIndex >= 0 ? draft.questions[questionIndex] : undefined}
        onClose={() => setQuestionIndex(null)}
        onSave={question => {
          update({ questions: questionIndex < 0
            ? [...draft.questions, question]
            : draft.questions.map((item, index) => index === questionIndex ? question : item) });
          setQuestionIndex(null);
        }}
      />
    )}
    {removeQuestion !== null && (
      <ConfirmDialog
        title={`Xóa câu ${removeQuestion + 1}?`}
        description="Câu hỏi sẽ bị bỏ khỏi bản nháp. Bấm Lưu bản nháp để lưu thay đổi lên hệ thống."
        busy={false}
        onClose={() => setRemoveQuestion(null)}
        onConfirm={() => {
          if (draft) update({ questions: draft.questions.filter((_, index) => index !== removeQuestion) });
          setRemoveQuestion(null);
        }}
      />
    )}
    {action && <ConfirmDialog title={actionTitle} description={actionDescription} busy={busy} onClose={() => setAction(null)} onConfirm={executeAction} />}
    {preview && draft && <ManagementPreview draft={draft} onClose={() => setPreview(false)} />}
  </ManagementFrame>;
}
