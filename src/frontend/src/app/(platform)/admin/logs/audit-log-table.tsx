'use client';

import { DataTable } from '@/components/workspace/data-table';
import { RoleBadge } from '@/components/workspace/status-badge';
import { getActionLabel, getTargetTypeLabel, type AuditLogDto } from '@/lib/api/audit';
import type { Role } from '@/lib/demo/types';

interface AuditLogTableProps {
  logs: AuditLogDto[];
  loading: boolean;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  formatTimestamp: (iso: string) => string;
  getActionColor: (action: string) => string;
}

export function AuditLogTable({ logs, loading, page, totalPages, totalCount, onPageChange, formatTimestamp, getActionColor }: AuditLogTableProps) {
  return (
    <DataTable<AuditLogDto>
      data={logs}
      keyExtractor={(l) => l.id}
      isLoading={loading}
      emptyTitle="Không có nhật ký nào phù hợp"
      emptyMessage="Hãy điều chỉnh bộ lọc thao tác, đối tượng, khoảng ngày hoặc người thực hiện."
      pagination={{ page, totalPages, total: totalCount, onPageChange }}
      columns={[
        {
          header: 'Thời gian',
          className: 'w-36 whitespace-nowrap',
          render: (l) => <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatTimestamp(l.occurredAt)}</span>,
        },
        {
          header: 'Người thực hiện',
          className: 'w-48',
          render: (l) => {
            const roleStr = l.actorRole?.toLowerCase();
            const validRole: Role | null = roleStr === 'admin' ? 'admin' : roleStr === 'rnd' ? 'rnd' : roleStr === 'viewer' ? 'viewer' : null;
            return (
              <div>
                <div className="text-xs font-semibold text-foreground">{l.actorName || 'Không xác định'}</div>
                <div className="mt-1">
                  {validRole ? <RoleBadge role={validRole} /> : <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground">{l.actorRole || 'Chưa phân vai trò'}</span>}
                </div>
              </div>
            );
          },
        },
        {
          header: 'Thao tác',
          className: 'w-44',
          render: (l) => <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold border ${getActionColor(l.action)}`} title={`Mã hệ thống: ${l.action}`}>{getActionLabel(l.action)}</span>,
        },
        {
          header: 'Đối tượng',
          className: 'w-36',
          render: (l) => <span className="inline-block rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">{getTargetTypeLabel(l.targetType)}</span>,
        },
        {
          header: 'Tóm tắt nghiệp vụ',
          className: 'min-w-[280px]',
          render: (l) => <p className="break-words text-xs leading-relaxed text-foreground">{l.summary}</p>,
        },
      ]}
    />
  );
}
