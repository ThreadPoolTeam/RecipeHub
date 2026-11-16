import React from 'react';

export function Alert({ variant = 'info', type, title, message, children, onClose }: {
  variant?: 'info' | 'warning' | 'error' | 'success' | 'danger';
  type?: 'info' | 'warning' | 'error' | 'success' | 'danger' | string;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  onClose?: () => void;
}) {
  const effectiveVariant = type || variant;
  let style = 'border-info bg-info-soft text-info';
  if (effectiveVariant === 'warning') style = 'border-border bg-secondary text-foreground';
  if (effectiveVariant === 'error' || effectiveVariant === 'danger') style = 'border-destructive-border bg-destructive-tint text-destructive';
  if (effectiveVariant === 'success') style = 'border-success/20 bg-success-soft text-success';

  return (
    <div className={`relative space-y-1 rounded-lg border px-4 py-3 text-sm ${style}`}>
      {onClose && <button type="button" onClick={onClose} className="absolute right-2 top-2 p-1 text-xs text-muted-foreground hover:text-foreground" aria-label="Đóng thông báo">✕</button>}
      {title && <div className="font-semibold">{title}</div>}
      <div>{message || children}</div>
    </div>
  );
}
