'use client';

import type { QuizDraft, QuizSummary } from '@/lib/api/quiz-management';
import { ManagementRecipePicker } from './management-recipe-picker';
import { Button, TextArea, TextInput } from '@/components/workspace/fields';

export function ManagementEditorAside({
  actor,
  draft,
  editable,
  busy,
  version,
  summary,
  isDraft,
  onUpdate,
  onAction,
}: {
  actor?: string;
  draft: QuizDraft;
  editable: boolean;
  busy: boolean;
  version: number | null;
  summary: QuizSummary | null;
  isDraft: boolean;
  onUpdate: (fields: Partial<QuizDraft>) => void;
  onAction: (action: 'deleteQuiz' | 'deleteVersion') => void;
}) {
  return (
    <aside className="space-y-4">
      <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-soft">
        <h2 className="font-display text-panel font-medium">Cấu hình bộ đề</h2>
        <TextInput label="Tên bộ đề" disabled={!editable} maxLength={200} value={draft.title} onChange={event => onUpdate({ title: event.target.value })} />
        <TextArea label="Mô tả" disabled={!editable} rows={3} value={draft.description ?? ''} onChange={event => onUpdate({ description: event.target.value })} />
        <TextInput label="Điểm đạt (%)" disabled={!editable} type="number" min="0.01" max="100" step="0.01" value={Number.isNaN(draft.passingScore) ? '' : draft.passingScore} onChange={event => onUpdate({ passingScore: event.target.valueAsNumber })} />
        <p className="text-sm text-muted-foreground">Đáp án đúng và giải thích chỉ hiển thị trong trang quản lý hoặc sau khi nhân viên nộp bài.</p>
      </div>
      {actor && <ManagementRecipePicker actor={actor} value={draft.recipeVersionId} onChange={recipeVersionId => onUpdate({ recipeVersionId })} disabled={!editable} />}
      {isDraft && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-6">
          <h3 className="font-display text-panel font-medium">Xóa bản nháp</h3>
          <p className="text-sm text-muted-foreground">Chỉ xóa phiên bản nháp chưa có lượt làm bài.</p>
          <div className="flex flex-wrap gap-2">
            {summary && summary.versions.length > 1 && <Button variant="ghost" className="text-destructive" disabled={busy} onClick={() => onAction('deleteVersion')}>Xóa phiên bản v{version}</Button>}
            {summary?.versions.every(item => item.state === 'draft') && <Button variant="ghost" className="text-destructive" disabled={busy} onClick={() => onAction('deleteQuiz')}>Xóa toàn bộ bộ đề</Button>}
          </div>
        </div>
      )}
    </aside>
  );
}
