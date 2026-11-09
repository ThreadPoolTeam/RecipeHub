import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, eyebrow, description, breadcrumb, actions, children, className = '' }: PageHeaderProps) {
  return (
    <header className={className}>
      {breadcrumb && <nav aria-label="Đường dẫn" className="mb-4 text-pill font-medium uppercase tracking-[0.06em] text-muted-foreground">{breadcrumb}</nav>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-2 text-pill font-medium uppercase tracking-[0.06em] text-muted-foreground">{eyebrow}</div>}
          <h1 className="font-display text-h2 font-medium sm:text-h1">{title}</h1>
          {description && <div className="mt-2 text-body text-muted-foreground">{description}</div>}
          {children}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
