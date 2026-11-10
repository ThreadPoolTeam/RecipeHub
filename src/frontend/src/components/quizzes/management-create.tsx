'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { quizManagement } from '@/lib/api/quiz-management';
import { ManagementFrame, Message, errorText, useManagementContext } from './management-shared';
import { ManagementRecipePicker } from './management-recipe-picker';
import { Button, TextArea } from '@/components/workspace/fields';

export function ManagementCreate() {
  const { session, base } = useManagementContext();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState('80');
  const [recipeVersionId, setRecipeVersionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session || busy) return;
    if (!recipeVersionId) { setError('Chọn phiên bản công thức đã ban hành.'); return; }
    setBusy(true); setError('');
    try {
      const created = await quizManagement.create(session.userId, { code: code.trim(), title: title.trim(), description: description.trim() || null, recipeVersionId, passingScore: Number(passingScore), questions: [] });
      router.push(`${base}/${created.quizId}?version=${created.version.versionNumber}`);
    } catch (error) { setError(errorText(error)); setBusy(false); }
  }
  return <ManagementFrame title="Tạo bộ đề mới" description="Tạo bản nháp trước, thêm câu hỏi ở bước soạn đề. R&D tạo bản nháp, soạn đề và ban hành.">
    <Message error={error} />
    <form className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]" onSubmit={submit}>
      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-soft" disabled={busy}>
        <legend className="font-display text-panel font-medium">Thông tin bộ đề</legend>
        <label className="block space-y-1.5 text-xs font-medium">Mã bộ đề
          <input className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-inset focus:ring-2 focus:ring-ring" required maxLength={50} value={code} onChange={event => setCode(event.target.value)} placeholder="VD: QUIZ-CAPHE-01" />
          <small className="block text-muted-foreground">Mã duy nhất, không đổi sau khi tạo.</small>
        </label>
        <label className="block space-y-1.5 text-xs font-medium">Tên bộ đề
          <input className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-inset focus:ring-2 focus:ring-ring" required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} placeholder="Đánh giá quy trình pha chế…" />
        </label>
        <TextArea label="Mô tả" rows={4} value={description} onChange={event => setDescription(event.target.value)} />
        <label className="block space-y-1.5 text-xs font-medium">Điểm đạt (%)
          <input className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-inset focus:ring-2 focus:ring-ring" type="number" required min="0.01" max="100" step="0.01" value={passingScore} onChange={event => setPassingScore(event.target.value)} />
        </label>
        <div className="flex justify-end"><Button type="submit" variant="primary" disabled={!recipeVersionId}>{busy ? 'Đang tạo…' : 'Tạo bản nháp & soạn câu hỏi'}</Button></div>
      </fieldset>
      {session && <ManagementRecipePicker actor={session.userId} value={recipeVersionId} onChange={setRecipeVersionId} disabled={busy} />}
    </form>
  </ManagementFrame>;
}
