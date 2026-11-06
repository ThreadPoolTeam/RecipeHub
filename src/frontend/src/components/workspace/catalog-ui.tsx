'use client';

import React from 'react';
import { Pencil } from 'lucide-react';

export function CatalogPageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E2D9] pb-4">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-[#1A1917] flex items-center gap-2">
          <Icon className="w-5 h-5 text-[#B47820] shrink-0" /> {title}
        </h1>
        <p className="text-xs sm:text-sm text-[#706E68] mt-0.5">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CatalogTabs<K extends string>({
  label,
  tabs,
  active,
  onChange,
}: {
  label: string;
  tabs: ReadonlyArray<{ key: K; label: string; count?: number }>;
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex p-1 rounded-full bg-[#F5F0E8] border border-[#E8E2D9]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150 motion-reduce:transition-none ${
            active === tab.key
              ? 'bg-white text-[#1A1917] shadow-xs border-[#E8E2D9]'
              : 'text-[#706E68] hover:text-[#1A1917] border-transparent'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && <span className="ml-1.5 text-xs text-[#8C887F] tabular-nums">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function CodeChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#F5F0E8] text-[#B47820] border border-[#E8E2D9] shrink-0">
      {children}
    </span>
  );
}

export function StateToggle({
  active,
  onToggle,
  disabled,
  subject,
}: {
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
  subject: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors motion-reduce:transition-none disabled:opacity-60 disabled:cursor-wait ${
        active
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
          : 'bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200'
      }`}
      title={`Bấm để ${active ? 'tạm khóa' : 'kích hoạt'} ${subject}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
      {active ? 'Đang dùng' : 'Tạm khóa'}
    </button>
  );
}

const iconButtonClass =
  'w-8 h-8 rounded-lg flex items-center justify-center text-[#706E68] hover:text-[#B47820] hover:bg-[#F5F0E8] border border-transparent hover:border-[#E8E2D9] transition-colors motion-reduce:transition-none';

export function EditIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={iconButtonClass} title={label} aria-label={label}>
      <Pencil className="w-4 h-4" />
    </button>
  );
}

export { iconButtonClass as editIconButtonClass };
