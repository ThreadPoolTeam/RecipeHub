'use client';

import Link from 'next/link';
import { Copy } from 'lucide-react';
import type { QuizSummary } from '@/lib/api/quiz-management';
import { QuizStatus } from './management-shared';
import { Button, Select } from '@/components/workspace/fields';

export function ManagementEditorToolbar({
  state,
  version,
  versions,
  dirty,
  busy,
  lockedByAi,
  base,
  quizId,
  role,
  questionCount,
  onVersionChange,
  onClone,
  onPreview,
  onTransition,
}: {
  state: 'draft' | 'published' | 'archived';
  version: number | null;
  versions: QuizSummary['versions'] | null;
  dirty: boolean;
  busy: boolean;
  lockedByAi: boolean;
  base: string;
  quizId: string;
  role?: string;
  questionCount: number;
  onVersionChange: (value: string) => void;
  onClone: () => void;
  onPreview: () => void;
  onTransition: () => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <QuizStatus state={state} />
        <Select label="Phiên bản" value={version ?? ''} disabled={busy} onChange={event => onVersionChange(event.target.value)}>
          {(versions ?? [{ versionId: 'current', versionNumber: version ?? 1, state }]).map(item => (
            <option key={item.versionId} value={item.versionNumber}>
              v{item.versionNumber} · {item.state === 'draft' ? 'Bản nháp' : item.state === 'published' ? 'Đã ban hành' : 'Đã lưu trữ'}
            </option>
          ))}
        </Select>
        <span className="text-sm text-muted-foreground" role="status">{dirty ? '● Có thay đổi chưa lưu' : 'Đang hiển thị nội dung đã lưu'}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || dirty} onClick={onClone}><Copy size={15} strokeWidth={1.5} />Nhân bản phiên bản</Button>
        <Link className="inline-flex h-9 items-center rounded-md border border-input bg-card px-4 text-sm font-semibold shadow-control focus-visible:ring-2 focus-visible:ring-ring" href={`${base}/results?quizId=${quizId}&version=${version}`}>Kết quả</Link>
        <Button disabled={busy || !questionCount} onClick={onPreview}>Xem thử</Button>
        {role === 'rnd' && state !== 'archived' && (
          <Button variant="primary" disabled={busy || dirty || lockedByAi || (state === 'draft' && !questionCount)} onClick={onTransition}>
            {state === 'draft' ? 'Ban hành' : 'Lưu trữ'}
          </Button>
        )}
      </div>
    </div>
  );
}
