'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bot, Check, LoaderCircle } from 'lucide-react';
import type { QuizAiJob } from '@/lib/api/quiz-management';
import { Button } from '@/components/workspace/fields';
import { ConfirmDialog } from './management-shared';

const ACTIVE = new Set(['queued', 'running']);

function jobLabel(job: QuizAiJob) {
  return job.kind === 'more' ? 'AI đang viết thêm câu hỏi' : 'AI đang soạn đề';
}

export function ManagementAiJobsBanner({
  jobs,
  onCancel,
  onRetry,
  quizHref,
  title = 'Tiến độ tạo đề bằng AI',
}: {
  jobs: QuizAiJob[];
  onCancel: (job: QuizAiJob) => Promise<void>;
  onRetry?: (job: QuizAiJob) => void;
  quizHref?: (job: QuizAiJob) => string | null;
  title?: string;
}) {
  const [confirmJob, setConfirmJob] = useState<QuizAiJob | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const active = jobs.filter(job => ACTIVE.has(job.status));
  const failed = jobs.filter(job => job.status === 'failed');

  if (!active.length && !failed.length) return null;

  async function confirmCancel() {
    if (!confirmJob) return;
    setCancelling(true);
    setCancelError('');
    try {
      await onCancel(confirmJob);
      setConfirmJob(null);
    } catch {
      setCancelError('Không hủy được tác vụ. Vui lòng thử lại.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section aria-label={title} className="mb-6 space-y-3">
      {active.map(job => (
        <div key={job.jobId} className="flex flex-wrap items-start gap-3 rounded-lg border border-info bg-info-soft p-4 text-info" role="status" aria-live="polite">
          <LoaderCircle aria-hidden="true" className="mt-0.5 h-4 w-4 motion-safe:animate-spin" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1 text-pill font-medium">
                <Bot aria-hidden="true" className="h-3 w-3" strokeWidth={1.5} />
                Đang chạy
              </span>
              {jobLabel(job)}
            </p>
            <p className="mt-1 text-sm">
              {job.recipeTitle} · {job.questionCount} câu · Bạn có thể rời trang, tác vụ vẫn tiếp tục.
            </p>
          </div>
          <Button type="button" onClick={() => { setCancelError(''); setConfirmJob(job); }}>
            Hủy tác vụ
          </Button>
        </div>
      ))}
      {failed.map(job => {
        const href = quizHref?.(job) ?? null;
        return (
          <div key={job.jobId} className="flex flex-wrap items-start gap-3 rounded-lg border border-destructive-border bg-destructive-tint p-4 text-destructive" role="alert">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4" strokeWidth={1.5} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Tác vụ bị gián đoạn, bạn có thể tạo lại</p>
              <p className="mt-1 text-sm">{job.errorMessage?.trim() || 'Không rõ nguyên nhân, vui lòng thử lại.'}</p>
              <p className="mt-1 text-xs">{job.recipeTitle} · {job.questionCount} câu</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {href && (
                <Link href={href} className="inline-flex h-9 items-center rounded-md border border-input bg-card px-4 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  Mở đề
                </Link>
              )}
              {onRetry && <Button variant="primary" onClick={() => onRetry(job)}>Tạo lại</Button>}
            </div>
          </div>
        );
      })}
      {cancelError && <p role="alert" className="text-sm text-destructive">{cancelError}</p>}
      {confirmJob && (
        <ConfirmDialog
          title="Hủy tác vụ AI?"
          description="Đề sẽ không được tạo hoặc bổ sung thêm câu hỏi. Bạn có thể tạo lại sau."
          busy={cancelling}
          onClose={() => { if (!cancelling) setConfirmJob(null); }}
          onConfirm={confirmCancel}
        />
      )}
    </section>
  );
}

export function AiJobDoneBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-success-soft px-2.5 py-1 text-pill font-medium text-success">
      <Check aria-hidden="true" className="h-3 w-3" strokeWidth={1.5} />
      {label}
    </span>
  );
}
