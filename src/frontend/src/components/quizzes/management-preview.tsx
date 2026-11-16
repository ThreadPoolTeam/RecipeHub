'use client';

import { useState } from 'react';
import type { QuizDraft } from '@/lib/api/quiz-management';
import { ManagementDialog } from './management-shared';
import { Button } from '@/components/workspace/fields';

export function ManagementPreview({ draft, onClose }: { draft: QuizDraft; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const question = draft.questions[index];
  const correctCount = draft.questions.filter((question, index) => question.options[answers[index]]?.isCorrect).length;
  const score = draft.questions.length ? Math.round(correctCount / draft.questions.length * 10000) / 100 : 0;
  return <ManagementDialog title="Xem thử bộ đề" onClose={onClose}>
    <p className="text-sm text-muted-foreground">Chỉ xem thử nội dung hiện tại. Không tạo lượt thi, không ghi kết quả lên hệ thống.</p>
    <h3 className="mt-3 font-display text-panel font-medium">{draft.title}</h3>
    {submitted && <div className="my-3 rounded-lg bg-info-soft p-3 text-info" role="status">{correctCount}/{draft.questions.length} câu đúng · {score}% · {score >= draft.passingScore ? 'Đạt' : 'Chưa đạt'} (ngưỡng {draft.passingScore}%)</div>}
    {question ? <fieldset className="mt-4"><legend>Câu {index + 1}/{draft.questions.length}</legend><h3 className="font-medium font-display">{question.content}</h3>
      {question.options.map((option, optionIndex) => <label className={`mt-2 flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${submitted && option.isCorrect ? 'border-success bg-success-soft text-success' : 'border-border'}`} key={optionIndex}>
        <input type="radio" name={`preview-${index}`} checked={answers[index] === optionIndex} disabled={submitted} onChange={() => setAnswers(current => ({ ...current, [index]: optionIndex }))} />
        <span>{String.fromCharCode(65 + optionIndex)}. {option.content}</span>
        {submitted && option.isCorrect && <strong>✓ Đúng</strong>}
      </label>)}
      {submitted && question.explanation && <p><strong>Giải thích:</strong> {question.explanation}</p>}
    </fieldset> : <p>Chưa có câu hỏi để xem thử.</p>}
    <div className="mt-5 flex flex-wrap gap-2">
      <Button disabled={index === 0} onClick={() => setIndex(index - 1)}>Câu trước</Button>
      <Button disabled={index >= draft.questions.length - 1} onClick={() => setIndex(index + 1)}>Câu sau</Button>
      {!submitted && <Button variant="primary" disabled={!draft.questions.length} onClick={() => setSubmitted(true)}>Chấm thử</Button>}
      {submitted && <Button onClick={() => { setAnswers({}); setIndex(0); setSubmitted(false); }}>Làm thử lại</Button>}
    </div>
  </ManagementDialog>;
}
