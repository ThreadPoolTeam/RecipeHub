import type { ReactNode } from 'react';

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, icon, hint, children, className = '' }: StatCardProps) {
  return (
    <div className={`rounded-lg border border-border bg-card p-5 text-card-foreground shadow-soft ${className}`}>
      <div className="flex items-start justify-between gap-4 text-body-sm text-muted-foreground">
        <span>{label}</span>
        {icon && <span aria-hidden="true" className="shrink-0">{icon}</span>}
      </div>
      <div className="mt-4 font-display text-stat font-normal tabular-nums">{value}</div>
      {hint && <div className="mt-2 text-body-sm text-muted-foreground">{hint}</div>}
      {children}
    </div>
  );
}
