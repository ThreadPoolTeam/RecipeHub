'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  AuditLogDto,
  listAuditLogs,
  AUDIT_ACTIONS,
  AUDIT_TARGET_TYPES,
  getActionLabel,
  getTargetTypeLabel,
} from '@/lib/api/audit';
import { Button, TextInput, SearchInput, Select } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';
import { Role } from '@/lib/demo/types';
import { RoleBadge } from '@/components/workspace/status-badge';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
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

  // Debounce actorQuery by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedActor(actorQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [actorQuery]);

  const fetchLogs = useCallback(async () => {
    const currentGen = ++generationRef.current;
    setLoading(true);
    setError(null);

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
        setLogs(response.items);
        setTotalCount(response.totalCount);
        // If page is out of range, clamp to page 1
        const maxPage = Math.max(1, Math.ceil(response.totalCount / pageSize));
        if (page > maxPage && response.totalCount > 0) {
          setPage(1);
        }
      }
    } catch {
      if (currentGen === generationRef.current) {
        setError('Không thể kết nối đến máy chủ hoặc phiên làm việc đã hết hạn. Vui lòng thử lại sau.');
        setLogs([]);
        setTotalCount(0);
      }
    } finally {
      if (currentGen === generationRef.current) {
        setLoading(false);
      }
    }
  }, [page, pageSize, debouncedActor, selectedAction, selectedTargetType, fromDate, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleActionChange = (val: string) => {
    setSelectedAction(val);
    setPage(1);
  };

  const handleTargetTypeChange = (val: string) => {
    setSelectedTargetType(val);
    setPage(1);
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromDate(e.target.value);
    setPage(1);
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToDate(e.target.value);
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
          <h1 className="font-display text-3xl font-medium text-foreground sm:text-4xl">Nhật ký truy vết hoạt động</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ai đã làm gì, lúc nào — chỉ đọc.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            className="flex h-10 items-center gap-1.5"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'motion-safe:animate-spin' : ''}`} strokeWidth={1.5} />
            Làm mới
          </Button>
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
              <p className="font-semibold">Lỗi kết nối nhật ký kiểm toán</p>
              <p className="mt-0.5 text-xs text-destructive">{error}</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={handleRefresh}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="flex w-full min-w-0 flex-col flex-wrap items-stretch gap-3 md:flex-row md:items-center">
        <div className="flex-1 min-w-[220px]">
          <SearchInput
            placeholder="Tìm theo tên người thực hiện..."
            value={actorQuery}
            onChange={(e) => setActorQuery(e.target.value)}
            onClear={() => setActorQuery('')}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={selectedAction}
            onChange={(e) => handleActionChange(e.target.value)}
            options={AUDIT_ACTIONS.map((a) => ({ label: a.label, value: a.value }))}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={selectedTargetType}
            onChange={(e) => handleTargetTypeChange(e.target.value)}
            options={AUDIT_TARGET_TYPES.map((t) => ({ label: t.label, value: t.value }))}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <TextInput
            type="date"
            value={fromDate}
            onChange={handleFromDateChange}
            aria-label="Từ ngày"
            className="text-xs flex-1 min-w-0 sm:w-36 sm:flex-initial"
          />
          <span className="text-xs text-[#706E68] shrink-0">—</span>
          <TextInput
            type="date"
            value={toDate}
            onChange={handleToDateChange}
            aria-label="Đến ngày"
            className="text-xs flex-1 min-w-0 sm:w-36 sm:flex-initial"
          />
        </div>
      </div>

      {/* Logs Table */}
      <DataTable<AuditLogDto>
        data={logs}
        keyExtractor={(l) => l.id}
        isLoading={loading}
        emptyTitle="Không có nhật ký nào phù hợp"
        emptyMessage="Hãy điều chỉnh bộ lọc thao tác, đối tượng, khoảng ngày hoặc người thực hiện."
        pagination={{
          page,
          totalPages,
          total: totalCount,
          onPageChange: (newPage) => setPage(newPage),
        }}
        columns={[
          {
            header: 'Thời gian',
            className: 'w-36 whitespace-nowrap',
            render: (l) => (
              <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                {formatTimestamp(l.occurredAt)}
              </span>
            ),
          },
          {
            header: 'Người thực hiện',
            className: 'w-48',
            render: (l) => {
              const roleStr = l.actorRole?.toLowerCase();
              const validRole: Role | null =
                roleStr === 'admin' ? 'admin' : roleStr === 'rnd' ? 'rnd' : roleStr === 'viewer' ? 'viewer' : null;
              return (
                <div>
                  <div className="text-xs font-semibold text-foreground">{l.actorName || 'Không xác định'}</div>
                  <div className="mt-1">
                    {validRole ? (
                      <RoleBadge role={validRole} />
                    ) : (
                      <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground">
                        {l.actorRole || 'Chưa phân vai trò'}
                      </span>
                    )}
                  </div>
                </div>
              );
            },
          },
          {
            header: 'Thao tác',
            className: 'w-44',
            render: (l) => (
              <span
                className={`inline-block px-2.5 py-1 rounded text-xs font-semibold border ${getActionColor(
                  l.action
                )}`}
                title={`Mã hệ thống: ${l.action}`}
              >
                {getActionLabel(l.action)}
              </span>
            ),
          },
          {
            header: 'Đối tượng',
            className: 'w-36',
            render: (l) => (
              <span
                className="inline-block rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground"
              >
                {getTargetTypeLabel(l.targetType)}
              </span>
            ),
          },
          {
            header: 'Tóm tắt nghiệp vụ',
            className: 'min-w-[280px]',
            render: (l) => (
              <p className="break-words text-xs leading-relaxed text-foreground">
                {l.summary}
              </p>
            ),
          },
        ]}
      />
    </div>
  );
}
