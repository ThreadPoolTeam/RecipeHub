'use client';

import { useState, type FormEvent } from 'react';
import type { QuizQuestion } from '@/lib/api/quiz-management';
import { ManagementDialog, Message } from './management-shared';

export function ManagementQuestion({ question, onSave, onClose }: { question?: QuizQuestion; onSave: (question: QuizQuestion) => void; onClose: () => void }) {
  const [content, setContent] = useState(question?.content ?? '');
  const [explanation, setExplanation] = useState(question?.explanation ?? '');
  const [options, setOptions] = useState(question?.options.map(option => ({ ...option })) ?? Array.from({ length: 4 }, (_, index) => ({ content: '', sortOrder: index + 1, isCorrect: false })));
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim() || options.some(option => !option.content.trim())) { setError('Điền nội dung câu hỏi và tất cả đáp án.'); return; }
    if (options.filter(option => option.isCorrect).length !== 1) { setError('Chọn đúng một đáp án đúng.'); return; }
    onSave({ ...question, content: content.trim(), explanation: explanation.trim() || null, sortOrder: question?.sortOrder ?? 1, options: options.map((option, index) => ({ ...option, content: option.content.trim(), sortOrder: index + 1 })) });
  }
  return <ManagementDialog title={question ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi'} onClose={onClose}><form onSubmit={submit} className="qm-fields"><Message error={error} /><label className="qm-field">Nội dung câu hỏi<textarea autoFocus required rows={3} value={content} onChange={event => setContent(event.target.value)} /></label><fieldset className="qm-answer-fieldset"><legend>Đáp án · chọn một đáp án đúng</legend><p className="qm-muted">Từ 2 đến 6 đáp án. Chấm tròn bên trái đáp án đúng.</p>{options.map((option, index) => <div className="qm-option-edit" key={index}><input type="radio" name="correct-option" aria-label={`Đáp án ${String.fromCharCode(65 + index)} là đúng`} checked={option.isCorrect} onChange={() => setOptions(options.map((item, itemIndex) => ({ ...item, isCorrect: itemIndex === index })))} /><label className="qm-field"><span>Đáp án {String.fromCharCode(65 + index)}</span><input required value={option.content} onChange={event => setOptions(options.map((item, itemIndex) => itemIndex === index ? { ...item, content: event.target.value } : item))} /></label><button type="button" className="qm-btn" aria-label={`Xóa đáp án ${String.fromCharCode(65 + index)}`} disabled={options.length <= 2} onClick={() => setOptions(options.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}<button type="button" className="qm-btn" disabled={options.length >= 6} onClick={() => setOptions([...options, { content: '', sortOrder: options.length + 1, isCorrect: false }])}>+ Thêm đáp án</button></fieldset><label className="qm-field">Giải thích đáp án<textarea rows={2} value={explanation} onChange={event => setExplanation(event.target.value)} /></label><div className="qm-actions"><button type="button" className="qm-btn" onClick={onClose}>Hủy</button><button type="submit" className="qm-btn qm-primary">Áp dụng câu hỏi</button></div><p className="qm-muted">Câu hỏi chỉ được lưu lên hệ thống khi bấm “Lưu bản nháp”.</p></form></ManagementDialog>;
}
