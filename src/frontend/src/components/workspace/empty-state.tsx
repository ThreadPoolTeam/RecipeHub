import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, children, className = '' }: EmptyStateProps) {
  return (
    <div className={`rounded-lg border border-border bg-card px-5 py-8 text-center text-card-foreground ${className}`}>
      <h2 className="font-display text-panel font-medium">{title}</h2>
      {description && <div className="mt-4 text-body text-muted-foreground">{description}</div>}
      {children}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
