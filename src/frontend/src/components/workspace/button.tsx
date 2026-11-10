import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({ children, variant = 'secondary', size = 'md', isLoading = false, className = '', disabled, ...props }: ButtonProps) {
  const baseStyle = 'inline-flex items-center justify-center rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
  const sizeStyle = size === 'sm' ? 'h-8 px-3 text-xs' : size === 'lg' ? 'h-11 px-6 text-sm' : 'h-9 px-4 text-sm';
  let variantStyle = 'border border-input bg-card text-foreground shadow-control hover:bg-accent hover:text-accent-foreground';
  if (variant === 'gold' || variant === 'primary') {
    variantStyle = 'border border-transparent bg-[var(--role-accent)] text-primary-foreground shadow-control hover:opacity-90';
  } else if (variant === 'danger') {
    variantStyle = 'border border-transparent bg-destructive text-destructive-foreground shadow-control hover:opacity-90';
  } else if (variant === 'ghost') {
    variantStyle = 'border border-transparent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground';
  }
  return (
    <button className={`${baseStyle} ${sizeStyle} ${variantStyle} ${className}`} disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Đang xử lý...
        </span>
      ) : children}
    </button>
  );
}
