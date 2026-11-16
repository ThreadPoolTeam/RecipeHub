'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { QuizAiJob } from '@/lib/api/quiz-management';
import { useToast } from '@/components/workspace/toast';

export function useQuizAiJobFeedback(base: string, onChanged?: () => void) {
  const { toast } = useToast();
  const router = useRouter();
  return useCallback((job: QuizAiJob) => {
    if (job.status === 'succeeded') {
      const href = job.quizId ? `${base}/${job.quizId}?version=${job.versionNumber ?? 1}` : null;
      toast({
        type: 'success',
        title: job.kind === 'more' ? 'AI đã thêm câu hỏi' : 'AI đã soạn xong đề nháp',
        description: job.kind === 'more'
          ? `Đã thêm ${job.questionsAdded ?? 0} câu cho đề ${job.recipeTitle}.`
          : `Đề ${job.recipeTitle} đã sẵn sàng để bạn kiểm tra.`,
        action: href ? { label: 'Mở đề', onClick: () => router.push(href) } : undefined,
      });
    } else {
      toast({
        type: 'error',
        title: 'AI không tạo được đề',
        description: job.errorMessage?.trim() || 'Tác vụ bị gián đoạn, bạn có thể tạo lại.',
      });
    }
    onChanged?.();
  }, [base, router, toast, onChanged]);
}
