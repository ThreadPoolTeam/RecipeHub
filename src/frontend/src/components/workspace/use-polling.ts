'use client';

import { useEffect, useRef } from 'react';

export function usePolling(callback: () => Promise<void>, intervalMs = 30_000) {
  const callbackRef = useRef(callback);
  const runningRef = useRef(false);

  useEffect(() => { callbackRef.current = callback; }, [callback]);

  useEffect(() => {
    const poll = async () => {
      if (document.hidden || runningRef.current) return;
      runningRef.current = true;
      try { await callbackRef.current(); } catch { /* Keep the previous data on polling errors. */ }
      finally { runningRef.current = false; }
    };
    const timer = window.setInterval(poll, intervalMs);
    const onVisibilityChange = () => { if (!document.hidden) void poll(); };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs]);
}
