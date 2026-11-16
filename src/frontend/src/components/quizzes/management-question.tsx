'use client';

import { useState, type FormEvent } from 'react';
import type { QuizQuestion } from '@/lib/api/quiz-management';
import { ManagementDialog, Message } from './management-shared';
import { Button } from '@/components/workspace/fields';

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
  return <ManagementDialog title={question ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi'} onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <Message error={error} />
      <label className="block space-y-1.5 text-xs font-medium">Nội dung câu hỏi
        <textarea className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-inset focus:ring-2 focus:ring-ring" autoFocus required rows={3} value={content} onChange={event => setContent(event.target.value)} />
      </label>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Đáp án · chọn một đáp án đúng</legend>
        <p className="text-sm text-muted-foreground">Từ 2 đến 6 đáp án. Chấm tròn bên trái đáp án đúng.</p>
        {options.map((option, index) => <div className="flex items-end gap-3" key={index}>
          <input className="mb-3 accent-primary" type="radio" name="correct-option" aria-label={`Đáp án ${String.fromCharCode(65 + index)} là đúng`} checked={option.isCorrect} onChange={() => setOptions(options.map((item, itemIndex) => ({ ...item, isCorrect: itemIndex === index })))} />
          <label className="flex-1 space-y-1.5 text-xs font-medium">Đáp án {String.fromCharCode(65 + index)}
            <input className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-inset focus:ring-2 focus:ring-ring" required value={option.content} onChange={event => setOptions(options.map((item, itemIndex) => itemIndex === index ? { ...item, content: event.target.value } : item))} />
          </label>
          <Button type="button" aria-label={`Xóa đáp án ${String.fromCharCode(65 + index)}`} disabled={options.length <= 2} onClick={() => setOptions(options.filter((_, itemIndex) => itemIndex !== index))}>×</Button>
        </div>)}
        <Button type="button" disabled={options.length >= 6} onClick={() => setOptions([...options, { content: '', sortOrder: options.length + 1, isCorrect: false }])}>+ Thêm đáp án</Button>
      </fieldset>
      <label className="block space-y-1.5 text-xs font-medium">Giải thích đáp án
        <textarea className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-inset focus:ring-2 focus:ring-ring" rows={2} value={explanation} onChange={event => setExplanation(event.target.value)} />
      </label>
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" onClick={onClose}>Hủy</Button><Button type="submit" variant="primary">Áp dụng câu hỏi</Button></div>
      <p className="text-sm text-muted-foreground">Câu hỏi chỉ được lưu lên hệ thống khi bấm “Lưu bản nháp”.</p>
    </form>
  </ManagementDialog>;
}
