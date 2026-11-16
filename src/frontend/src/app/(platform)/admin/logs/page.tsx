'use client';

import { pageTitleClass } from '@/components/workspace/page-header';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AuditLogDto, listAuditLogs } from '@/lib/api/audit';
import { Button } from '@/components/workspace/fields';
import { AuditLogFilters } from './audit-log-filters';
import { AuditLogTable } from './audit-log-table';
import { AlertCircle } from 'lucide-react';
import { usePolling } from '@/components/workspace/use-polling';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filters
  const [actorQuery, setActorQuery] = useState('');
  const [debouncedActor, setDebouncedActor] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedTargetType, setSelectedTargetType] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Generation guard against out-of-order responses
  const generationRef = useRef(0);
  const pendingRef = useRef(0);

  // Debounce actorQuery by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedActor(actorQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [actorQuery]);

  const fetchLogs = useCallback(async (silent = false) => {
    const currentGen = ++generationRef.current;
    pendingRef.current++;

    // Parse date boundaries
    let fromIso: string | undefined;
    let toIso: string | undefined;

    if (fromDate) {
      fromIso = new Date(`${fromDate}T00:00:00Z`).toISOString();
    }
    if (toDate) {
      // To date is exclusive or end-of-day: add 1 day
      const nextDay = new Date(`${toDate}T00:00:00Z`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      toIso = nextDay.toISOString();
    }

    try {
      const response = await listAuditLogs({
        page,
        pageSize,
        actorQuery: debouncedActor.trim() || undefined,
        action: selectedAction !== 'all' ? selectedAction : undefined,
        targetType: selectedTargetType !== 'all' ? selectedTargetType : undefined,
        from: fromIso,
        to: toIso,
      });

      if (currentGen === generationRef.current) {
        setError(null);
        setLogs(response.items);
        setTotalCount(response.totalCount);
        // If page is out of range, clamp to page 1
        const maxPage = Math.max(1, Math.ceil(response.totalCount / pageSize));
        if (page > maxPage && response.totalCount > 0) {
          setPage(1);
        }
      }
    } catch {
      if (!silent && currentGen === generationRef.current) {
        setError('Không thể kết nối đến máy chủ hoặc phiên làm việc đã hết hạn. Vui lòng thử lại sau.');
        setLogs([]);
        setTotalCount(0);
      }
    } finally {
      pendingRef.current--;
      if (!silent && currentGen === generationRef.current) {
        setLoading(false);
      }
    }
  }, [page, pageSize, debouncedActor, selectedAction, selectedTargetType, fromDate, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const pollLogs = useCallback(async () => {
    if (pendingRef.current === 0) await fetchLogs(true);
  }, [fetchLogs]);
  usePolling(pollLogs);

  const handleActionChange = (val: string) => {
    setSelectedAction(val);
    setPage(1);
  };

  const handleTargetTypeChange = (val: string) => {
    setSelectedTargetType(val);
    setPage(1);
  };

  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    setPage(1);
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    setPage(1);
  };

  const handleRefresh = () => {
    setPage(1);
    fetchLogs();
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getActionColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('created') || act.includes('published') || act.includes('activated') || act.includes('unlocked')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('locked') || act.includes('deleted') || act.includes('archived')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (act.includes('updated') || act.includes('role_changed') || act.includes('password_reset')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('cloned') || act.includes('submitted')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-secondary text-muted-foreground border-border';
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Quản trị</p>
          <h1 className={pageTitleClass}>Nhật ký hoạt động</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ai đã làm gì, lúc nào. Chỉ đọc.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground tabular-nums">
            Tổng cộng: <span className="font-semibold text-foreground">{totalCount}</span> sự kiện
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive-border bg-destructive-soft p-4 text-sm text-destructive">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" strokeWidth={1.5} />
            <div>
              <p className="font-semibold">Lỗi kết nối nhật ký hoạt động</p>
              <p className="mt-0.5 text-xs text-destructive">{error}</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={handleRefresh}>
            Thử lại
          </Button>
        </div>
      )}

      <AuditLogFilters actor={actorQuery} action={selectedAction} target={selectedTargetType} from={fromDate} to={toDate} onActor={setActorQuery} onAction={handleActionChange} onTarget={handleTargetTypeChange} onFrom={handleFromDateChange} onTo={handleToDateChange} />

      <AuditLogTable logs={logs} loading={loading} page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} formatTimestamp={formatTimestamp} getActionColor={getActionColor} />
    </div>
  );
}
