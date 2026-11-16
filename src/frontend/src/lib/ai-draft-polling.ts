'use client';

import { useEffect, useState } from 'react';
import type { SessionInfo } from '@/lib/demo/types';
import { ApiError } from '@/lib/api/client';
import {
  describeAiDraftError,
  getAiDraft,
  type AiDraftJob,
  type AiDraftOutcome,
  type AiDraftStatus,
  type AiDraftCannotGenerate,
  type AiRecipeDraft,
} from '@/lib/api/recipe-ai-draft';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120000;

export interface AiDraftPollingState {
  jobId: string | null;
  status: AiDraftStatus;
  outcome: AiDraftOutcome | null;
  draft: AiRecipeDraft | null;
  cannotGenerate: AiDraftCannotGenerate | null;
  errorMessage: string | null;
  elapsedSeconds: number;
  notice: string | null;
  expired: boolean;
}

const INITIAL_STATE: AiDraftPollingState = {
  jobId: null,
  status: 'pending',
  outcome: null,
  draft: null,
  cannotGenerate: null,
  errorMessage: null,
  elapsedSeconds: 0,
  notice: null,
  expired: false,
};

export function useAiDraftPolling(
  session: SessionInfo | null,
  jobId: string | null
): AiDraftPollingState {
  const [state, setState] = useState<AiDraftPollingState>(INITIAL_STATE);

  useEffect(() => {
    if (!session || !jobId) {
      setState(INITIAL_STATE);
      return;
    }

    setState({ ...INITIAL_STATE, jobId });
    let cancelled = false;
    let inFlight = false;
    let stopped = false;
    const startedAt = Date.now();
    const elapsed = () => Math.floor((Date.now() - startedAt) / 1000);

    const apply = (job: AiDraftJob) => {
      if (job.status === 'succeeded' && job.outcome === 'generated' && !job.draft) {
        stopped = true;
        setState((current) => ({
          ...current,
          status: 'failed',
          outcome: null,
          errorMessage: 'Bản nháp trả về thiếu nội dung. Vui lòng thử lại.',
          elapsedSeconds: elapsed(),
          notice: null,
        }));
        return;
      }
      if (job.status === 'succeeded' && job.outcome === 'cannot_generate' && !job.cannotGenerate) {
        stopped = true;
        setState((current) => ({
          ...current,
          status: 'failed',
          outcome: null,
          errorMessage: 'Bản nháp trả về thiếu lý do từ chối. Vui lòng thử lại.',
          elapsedSeconds: elapsed(),
          notice: null,
        }));
        return;
      }
      setState({
        jobId,
        status: job.status,
        outcome: job.outcome,
        draft: job.draft,
        cannotGenerate: job.cannotGenerate,
        errorMessage:
          job.status === 'failed'
            ? job.errorMessage ?? 'AI chưa tạo được bản nháp. Vui lòng thử lại.'
            : null,
        elapsedSeconds: elapsed(),
        notice: null,
        expired: false,
      });
      if (job.status === 'succeeded' || job.status === 'failed') stopped = true;
    };

    const tick = async () => {
      if (cancelled || inFlight || stopped) return;
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        stopped = true;
        setState((current) => ({
          ...current,
          status: 'failed',
          outcome: null,
          errorMessage: 'AI chưa hoàn tất sau 2 phút. Vui lòng thử lại.',
          elapsedSeconds: elapsed(),
          notice: null,
        }));
        return;
      }
      inFlight = true;
      try {
        const job = await getAiDraft(session, jobId);
        if (cancelled) return;
        apply(job);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          stopped = true;
          setState({
            jobId,
            status: 'failed',
            outcome: null,
            draft: null,
            cannotGenerate: null,
            errorMessage: 'Bản nháp đã hết hạn hoặc không còn khả dụng. Vui lòng tạo lại.',
            elapsedSeconds: elapsed(),
            notice: null,
            expired: true,
          });
        } else {
          setState((current) => ({
            ...current,
            elapsedSeconds: elapsed(),
            notice: describeAiDraftError(error),
          }));
        }
      } finally {
        inFlight = false;
      }
    };

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void tick();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [session, jobId]);

  return state;
}
