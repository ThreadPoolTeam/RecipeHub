'use client';

import type { QuizAiJob } from '@/lib/api/quiz-management';
import { ManagementAiJobsBanner } from './management-ai-jobs-banner';
import { ManagementAiMoreButton } from './management-ai-more-button';

export function ManagementAiEditorPanel({
  actor,
  quizId,
  version,
  existingCount,
  dirty,
  jobs,
  onCancel,
  onAccepted,
}: {
  actor: string;
  quizId: string;
  version: number;
  existingCount: number;
  dirty: boolean;
  jobs: QuizAiJob[];
  onCancel: (job: QuizAiJob) => Promise<void>;
  onAccepted: () => void;
}) {
  const activeJob = jobs.some(job => job.status === 'queued' || job.status === 'running');

  return (
    <>
      <ManagementAiMoreButton
        actor={actor}
        quizId={quizId}
        version={version}
        existingCount={existingCount}
        dirty={dirty}
        activeJob={activeJob}
        onAccepted={onAccepted}
      />
      <ManagementAiJobsBanner jobs={jobs} onCancel={onCancel} title="Tác vụ AI của đề này" />
      {activeJob && (
        <div className="mb-4 rounded-lg border border-info bg-info-soft p-3 text-info" role="status">
          AI đang viết thêm câu hỏi cho đề này. Nội dung tạm thời chỉ đọc để tránh ghi đè câu mới. Bạn vẫn có thể rời trang.
        </div>
      )}
    </>
  );
}

export function useActiveQuizAiJob(jobs: QuizAiJob[], quizId: string) {
  return jobs.some(job =>
    job.quizId === quizId && (job.status === 'queued' || job.status === 'running'));
}
