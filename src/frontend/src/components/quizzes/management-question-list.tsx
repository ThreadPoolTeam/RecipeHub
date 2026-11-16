'use client';

import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import type { QuizDraft, QuizQuestion } from '@/lib/api/quiz-management';
import { Button } from '@/components/workspace/fields';

export function ManagementQuestionList({
  draft,
  editable,
  onAdd,
  onMove,
  onEdit,
  onDuplicate,
  onRemove,
}: {
  draft: QuizDraft;
  editable: boolean;
  onAdd: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onEdit: (index: number) => void;
  onDuplicate: (question: QuizQuestion, index: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <>
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
          <Button className="w-full" disabled={draft.questions.length >= 100} onClick={onAdd}>
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
        {draft.questions.map((question, index) => (
          <article id={`management-question-${index}`} className="scroll-mt-24 space-y-4 rounded-lg border border-border bg-card p-6 shadow-soft" key={index}>
            <header className="flex flex-wrap items-start gap-3">
              <span className="rounded-md bg-primary-soft px-2 py-1 text-primary">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="min-w-0 flex-1 whitespace-pre-wrap font-display text-panel font-medium">{question.content}</h3>
              {editable && (
                <div className="flex flex-wrap gap-1">
                  <Button aria-label={`Chuyển câu ${index + 1} lên`} disabled={index === 0} onClick={() => onMove(index, -1)}>↑</Button>
                  <Button aria-label={`Chuyển câu ${index + 1} xuống`} disabled={index === draft.questions.length - 1} onClick={() => onMove(index, 1)}>↓</Button>
                  <Button aria-label={`Sửa câu ${index + 1}`} onClick={() => onEdit(index)}><Pencil size={15} strokeWidth={1.5} /></Button>
                  <Button aria-label={`Nhân bản câu ${index + 1}`} disabled={draft.questions.length >= 100} onClick={() => onDuplicate(question, index)}>
                    <Copy size={15} strokeWidth={1.5} />
                  </Button>
                  <Button aria-label={`Xóa câu ${index + 1}`} onClick={() => onRemove(index)}><Trash2 size={15} strokeWidth={1.5} /></Button>
                </div>
              )}
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
          </article>
        ))}
      </div>
    </>
  );
}
