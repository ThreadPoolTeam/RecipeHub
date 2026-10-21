'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { AuditEntry } from '@/lib/demo/types';
import { Button, TextInput, SearchInput, Select } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';
import { RoleBadge } from '@/components/workspace/status-badge';
import { Dialog } from '@/components/workspace/dialog';

export default function AdminAuditLogsPage() {
  const { repo, dataVersion } = useDemo();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actorQuery, setActorQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedTargetType, setSelectedTargetType] = useState('all');

  // Detail Modal
  const [activeLog, setActiveLog] = useState<AuditEntry | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    repo
      .getAuditLogs()
      .then((data) => {
        if (mounted) setLogs(data);
      })
      .catch(() => {
        // demo ignore
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [repo, dataVersion]);

  // Distinct action types for filter dropdown
  const uniqueActions = useMemo(() => {
    const actionSet = new Set<string>();
    for (const log of logs) {
      if (log.action) actionSet.add(log.action);
    }
    return Array.from(actionSet).sort();
  }, [logs]);

  // Distinct target types
  const uniqueTargetTypes = useMemo(() => {
    const targetSet = new Set<string>();
    for (const log of logs) {
      if (log.targetType) targetSet.add(log.targetType);
    }
    return Array.from(targetSet).sort();
  }, [logs]);

  // Filtered log entries
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchActor =
        !actorQuery.trim() ||
        log.actorEmail.toLowerCase().includes(actorQuery.toLowerCase().trim());
      const matchAction = selectedAction === 'all' || log.action === selectedAction;
      const matchTarget = selectedTargetType === 'all' || log.targetType === selectedTargetType;
      return matchActor && matchAction && matchTarget;
    });
  }, [logs, actorQuery, selectedAction, selectedTargetType]);

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
    if (action.includes('CREATE') || action.includes('PUBLISH')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('APPROVE')) {
      return 'bg-[#FAF9F5] text-[#B47820] border-[#B47820]/30';
    }
    if (action.includes('REJECT') || action.includes('LOCK') || action.includes('DELETE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action.includes('UPDATE')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-[#FAF9F5] text-[#706E68] border-[#E8E2D9]';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF9F5] text-[#706E68] border border-[#E8E2D9] mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#B47820]" />
            <span>Unalterable Audit Trail</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1917]">Nhật ký Truy vết Hoạt động</h1>
          <p className="text-[#706E68] text-xs mt-1">
            Ghi nhận toàn bộ thao tác đăng nhập, chỉnh sửa, phát hành công thức và thay đổi thiết lập hệ thống.
          </p>
        </div>
        <div className="text-xs text-[#706E68] font-mono">
          Tổng cộng: <span className="text-[#B47820] font-bold">{logs.length}</span> sự kiện
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs">
        <div className="sm:col-span-2">
          <SearchInput
            placeholder="Lọc theo Email người thao tác..."
            value={actorQuery}
            onChange={(e) => setActorQuery(e.target.value)}
            onClear={() => setActorQuery('')}
          />
        </div>
        <div>
          <Select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            options={[
              { label: 'Tất cả loại hành động', value: 'all' },
              ...uniqueActions.map((act) => ({ label: act, value: act })),
            ]}
          />
        </div>
        <div>
          <Select
            value={selectedTargetType}
            onChange={(e) => setSelectedTargetType(e.target.value)}
            options={[
              { label: 'Tất cả đối tượng tác động', value: 'all' },
              ...uniqueTargetTypes.map((t) => ({ label: `Đối tượng: ${t}`, value: t })),
            ]}
          />
        </div>
      </div>

      {/* Logs Table */}
      <DataTable<AuditEntry>
        data={filteredLogs}
        keyExtractor={(l) => l.id}
        isLoading={loading}
        emptyTitle="Không có nhật ký nào phù hợp"
        emptyMessage="Hãy điều chỉnh bộ lọc hành động, đối tượng hoặc email người thao tác."
        columns={[
          {
            header: 'Thời gian',
            render: (l) => (
              <span className="font-mono text-xs text-[#706E68] whitespace-nowrap">
                {formatTimestamp(l.timestamp)}
              </span>
            ),
          },
          {
            header: 'Người thao tác',
            render: (l) => (
              <div>
                <div className="text-xs font-semibold text-[#1A1917]">{l.actorEmail}</div>
                <div className="mt-0.5">
                  <RoleBadge role={l.actorRole} />
                </div>
              </div>
            ),
          },
          {
            header: 'Hành động',
            render: (l) => (
              <span
                className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getActionColor(
                  l.action
                )}`}
              >
                {l.action}
              </span>
            ),
          },
          {
            header: 'Đối tượng tác động',
            render: (l) => (
              <div>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold bg-[#FAF9F5] text-[#706E68] border border-[#E8E2D9]">
                  {l.targetType}
                </span>
                {l.targetId && (
                  <div className="font-mono text-[11px] text-[#706E68] truncate max-w-[140px] mt-0.5" title={l.targetId}>
                    {l.targetId}
                  </div>
                )}
              </div>
            ),
          },
          {
            header: 'Chi tiết thông số',
            render: (l) => {
              if (!l.details || Object.keys(l.details).length === 0) {
                return <span className="text-xs text-[#706E68]">—</span>;
              }
              const summary = JSON.stringify(l.details);
              return (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#706E68] truncate max-w-[200px]" title={summary}>
                    {summary}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveLog(l)}
                    className="text-xs text-[#B47820] hover:text-[#9A6416] px-2 py-0.5 h-auto"
                  >
                    Xem JSON
                  </Button>
                </div>
              );
            },
          },
        ]}
      />

      {/* JSON Viewer Modal */}
      <Dialog
        isOpen={!!activeLog}
        onClose={() => setActiveLog(null)}
        title={`Chi tiết Audit: ${activeLog?.action}`}
        description={`Sự kiện ghi nhận vào lúc ${activeLog ? formatTimestamp(activeLog.timestamp) : ''} bởi ${activeLog?.actorEmail}`}
        confirmLabel="Đóng"
        confirmVariant="gold"
        onConfirm={() => setActiveLog(null)}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs bg-[#FAF9F5] p-3 rounded-xl border border-[#E8E2D9]">
            <div>
              <span className="text-[#706E68]">ID sự kiện:</span>{' '}
              <span className="font-mono text-[#1A1917]">{activeLog?.id}</span>
            </div>
            <div>
              <span className="text-[#706E68]">Target Type:</span>{' '}
              <span className="font-mono text-[#B47820] font-semibold">{activeLog?.targetType}</span>
            </div>
            <div>
              <span className="text-[#706E68]">Actor Role:</span>{' '}
              <span className="text-[#1A1917]">{activeLog?.actorRole}</span>
            </div>
            <div>
              <span className="text-[#706E68]">Target ID:</span>{' '}
              <span className="font-mono text-[#1A1917]">{activeLog?.targetId || 'N/A'}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#706E68] mb-1.5 uppercase">
              Payload JSON chi tiết
            </label>
            <pre className="p-3 bg-[#FAF9F5] border border-[#E8E2D9] rounded-xl text-xs font-mono text-emerald-800 overflow-x-auto max-h-60 leading-relaxed">
              {JSON.stringify(activeLog?.details || {}, null, 2)}
            </pre>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
