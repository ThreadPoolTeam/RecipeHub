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
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 font-display text-h3 font-medium text-foreground sm:text-h1">
          <Icon className="w-5 h-5 text-primary shrink-0 [&_*]:[stroke-width:1.5]" /> {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
    <div role="tablist" aria-label={label} className="inline-flex max-w-full overflow-x-auto border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors motion-reduce:transition-none ${
            active === tab.key
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function CodeChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-md bg-secondary px-2.5 py-1 text-pill font-medium text-muted-foreground">
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
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-pill font-medium transition-colors motion-reduce:transition-none disabled:cursor-wait disabled:opacity-60 ${
        active
          ? 'bg-success-soft text-success hover:opacity-80'
          : 'bg-secondary text-muted-foreground hover:opacity-80'
      }`}
      title={`Bấm để ${active ? 'tạm khóa' : 'kích hoạt'} ${subject}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {active ? 'Đang dùng' : 'Tạm khóa'}
    </button>
  );
}

const iconButtonClass =
  'w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent transition-colors motion-reduce:transition-none';

export function EditIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={iconButtonClass} title={label} aria-label={label}>
      <Pencil className="w-4 h-4" strokeWidth={1.5} />
    </button>
  );
}

export { iconButtonClass as editIconButtonClass };
