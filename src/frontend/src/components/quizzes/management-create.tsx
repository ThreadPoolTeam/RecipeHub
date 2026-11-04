'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { quizManagement } from '@/lib/api/quiz-management';
import { ManagementFrame, Message, errorText, useManagementContext } from './management-shared';
import { ManagementRecipePicker } from './management-recipe-picker';

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
  return <ManagementFrame title="Tạo bộ đề mới" description="Tạo bản nháp trước, thêm câu hỏi ở bước soạn đề. Chỉ Admin được ban hành."><Message error={error} /><form className="qm-create-layout" onSubmit={submit}><fieldset className="qm-panel qm-fields" disabled={busy}><legend>Thông tin bộ đề</legend><label className="qm-field">Mã bộ đề<input required maxLength={50} value={code} onChange={event => setCode(event.target.value)} placeholder="VD: QUIZ-CAPHE-01" /><small>Mã duy nhất, không đổi sau khi tạo.</small></label><label className="qm-field">Tên bộ đề<input required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} placeholder="Đánh giá quy trình pha chế…" /></label><label className="qm-field">Mô tả<textarea rows={4} value={description} onChange={event => setDescription(event.target.value)} /></label><label className="qm-field">Điểm đạt (%)<input type="number" required min="0.01" max="100" step="0.01" value={passingScore} onChange={event => setPassingScore(event.target.value)} /></label><div className="qm-actions"><button type="submit" className="qm-btn qm-primary" disabled={!recipeVersionId}>{busy ? 'Đang tạo…' : 'Tạo bản nháp & soạn câu hỏi'}</button></div></fieldset>{session && <ManagementRecipePicker actor={session.userId} value={recipeVersionId} onChange={setRecipeVersionId} disabled={busy} />}</form></ManagementFrame>;
}
