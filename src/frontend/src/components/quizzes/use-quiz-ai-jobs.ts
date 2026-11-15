'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { quizManagement, type QuizAiJob, type QuizAiJobStatus } from '@/lib/api/quiz-management';
import { errorText } from './management-shared';

const POLL_INTERVAL_MS = 3000;

function isActive(status: QuizAiJobStatus) {
  return status === 'queued' || status === 'running';
}

export function useQuizAiJobs(
  actor: string | undefined,
  onFinished?: (job: QuizAiJob) => void,
) {
  const [jobs, setJobs] = useState<QuizAiJob[]>([]);
  const [loadingState, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const runningRef = useRef(false);
  const knownRef = useRef(new Map<string, QuizAiJobStatus>());
  const finishedRef = useRef(onFinished);
  const active = jobs.some(job => isActive(job.status));
  const loading = Boolean(actor) && loadingState;

  useEffect(() => { finishedRef.current = onFinished; }, [onFinished]);

  const apply = useCallback((list: QuizAiJob[]) => {
    const known = knownRef.current;
    list.forEach(job => {
      const previous = known.get(job.jobId);
      if (previous && isActive(previous) && (job.status === 'succeeded' || job.status === 'failed')) {
        finishedRef.current?.(job);
      }
      known.set(job.jobId, job.status);
    });
    setJobs(list);
  }, []);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!actor) return;
    try {
      const list = await quizManagement.aiJobs(actor, signal);
      if (signal?.aborted) return;
      apply(list);
      setError('');
    } catch (err: unknown) {
      if (!signal?.aborted) setError(errorText(err));
    }
  }, [actor, apply]);

  useEffect(() => {
    if (!actor) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      void refresh(controller.signal).finally(() => { if (!cancelled) setLoading(false); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); controller.abort(); };
  }, [actor, refresh, retry]);

  useEffect(() => {
    if (!actor || !active) return;
    const poll = async () => {
      if (document.hidden || runningRef.current) return;
      runningRef.current = true;
      try { await refresh(); } finally { runningRef.current = false; }
    };
    const timer = window.setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
    const onVisible = () => { if (!document.hidden) void poll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [actor, active, refresh]);

  const cancel = useCallback(async (job: QuizAiJob) => {
    if (!actor) return;
    const updated = await quizManagement.aiCancel(actor, job.jobId);
    knownRef.current.set(updated.jobId, updated.status);
    setJobs(current => current.map(item => item.jobId === updated.jobId ? updated : item));
  }, [actor]);

  return { jobs, active, loading, error, cancel, reload: () => setRetry(value => value + 1) };
}
