'use client';

import { useState } from 'react';
import type { QuizDraft } from '@/lib/api/quiz-management';
import { ManagementDialog } from './management-shared';

export function ManagementPreview({ draft, onClose }: { draft: QuizDraft; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const question = draft.questions[index];
  const correctCount = draft.questions.filter((question, index) => question.options[answers[index]]?.isCorrect).length;
  const score = draft.questions.length ? Math.round(correctCount / draft.questions.length * 10000) / 100 : 0;
  return <ManagementDialog title="Xem thử bộ đề" onClose={onClose}>
    <p className="qm-muted">Chỉ xem thử nội dung hiện tại. Không tạo lượt thi, không ghi kết quả lên hệ thống.</p>
    <h3>{draft.title}</h3>
    {submitted && <div className="qm-notice" role="status">{correctCount}/{draft.questions.length} câu đúng · {score}% · {score >= draft.passingScore ? 'Đạt' : 'Chưa đạt'} (ngưỡng {draft.passingScore}%)</div>}
    {question ? <fieldset className="qm-answer-fieldset"><legend>Câu {index + 1}/{draft.questions.length}</legend><h3>{question.content}</h3>
      {question.options.map((option, optionIndex) => <label className={`qm-preview-option ${submitted && option.isCorrect ? 'qm-correct' : ''}`} key={optionIndex}>
        <input type="radio" name={`preview-${index}`} checked={answers[index] === optionIndex} disabled={submitted} onChange={() => setAnswers(current => ({ ...current, [index]: optionIndex }))} />
        <span>{String.fromCharCode(65 + optionIndex)}. {option.content}</span>
        {submitted && option.isCorrect && <strong>✓ Đúng</strong>}
      </label>)}
      {submitted && question.explanation && <p><strong>Giải thích:</strong> {question.explanation}</p>}
    </fieldset> : <p>Chưa có câu hỏi để xem thử.</p>}
    <div className="qm-actions qm-preview-actions">
      <button className="qm-btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>Câu trước</button>
      <button className="qm-btn" disabled={index >= draft.questions.length - 1} onClick={() => setIndex(index + 1)}>Câu sau</button>
      {!submitted && <button className="qm-btn qm-primary" disabled={!draft.questions.length} onClick={() => setSubmitted(true)}>Chấm thử</button>}
      {submitted && <button className="qm-btn" onClick={() => { setAnswers({}); setIndex(0); setSubmitted(false); }}>Làm thử lại</button>}
    </div>
  </ManagementDialog>;
}
