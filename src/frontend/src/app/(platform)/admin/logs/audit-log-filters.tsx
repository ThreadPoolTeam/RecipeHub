'use client';

import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from '@/lib/api/audit';
import { TextInput, SearchInput, Select } from '@/components/workspace/fields';

interface Props {
  actor: string;
  action: string;
  target: string;
  from: string;
  to: string;
  onActor: (value: string) => void;
  onAction: (value: string) => void;
  onTarget: (value: string) => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}

export function AuditLogFilters({ actor, action, target, from, to, onActor, onAction, onTarget, onFrom, onTo }: Props) {
  return (
    <div className="flex w-full min-w-0 flex-col flex-wrap items-stretch gap-3 md:flex-row md:items-center">
      <div className="flex-1 min-w-[220px]">
        <SearchInput placeholder="Tìm theo tên người thực hiện..." value={actor} onChange={(e) => onActor(e.target.value)} onClear={() => onActor('')} />
      </div>
      <div className="w-full sm:w-48"><Select value={action} onChange={(e) => onAction(e.target.value)} options={AUDIT_ACTIONS.map((a) => ({ label: a.label, value: a.value }))} /></div>
      <div className="w-full sm:w-44"><Select value={target} onChange={(e) => onTarget(e.target.value)} options={AUDIT_TARGET_TYPES.map((t) => ({ label: t.label, value: t.value }))} /></div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <TextInput type="date" value={from} onChange={(e) => onFrom(e.target.value)} aria-label="Từ ngày" className="text-xs flex-1 min-w-0 sm:w-36 sm:flex-initial" />
        <span className="text-xs text-muted-foreground shrink-0">đến</span>
        <TextInput type="date" value={to} onChange={(e) => onTo(e.target.value)} aria-label="Đến ngày" className="text-xs flex-1 min-w-0 sm:w-36 sm:flex-initial" />
      </div>
    </div>
  );
}
