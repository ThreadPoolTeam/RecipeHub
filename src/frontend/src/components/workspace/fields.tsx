import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  let baseStyle = 'inline-flex items-center justify-center font-medium rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm';

  let sizeStyle = 'px-3 py-1.5 text-xs';
  if (size === 'md') sizeStyle = 'px-3.5 py-2 text-xs sm:text-sm';
  if (size === 'lg') sizeStyle = 'px-5 py-2.5 text-sm sm:text-base';

  let variantStyle = 'bg-white text-[#1C1917] hover:bg-[#F7F5EE] border border-[#E2DDD2] shadow-sm';
  if (variant === 'gold') {
    variantStyle = 'bg-[#B47820] text-white font-semibold hover:bg-[#9E6515] border border-[#B47820] shadow-sm';
  } else if (variant === 'primary') {
    variantStyle = 'bg-[#1C1917] text-white font-medium hover:bg-[#292524] border border-[#1C1917] shadow-sm';
  } else if (variant === 'danger') {
    variantStyle = 'bg-rose-600 text-white hover:bg-rose-700 border border-rose-600 shadow-sm';
  } else if (variant === 'ghost') {
    variantStyle = 'bg-transparent text-[#6B665E] hover:text-[#1C1917] hover:bg-[#EFECE4] border border-transparent';
  }
  return (
    <button
      className={`${baseStyle} ${sizeStyle} ${variantStyle} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Đang xử lý...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function TextInput({
  label,
  helper,
  error,
  required,
  className = '',
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
}) {
  const inputId = id || (label ? `input_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[#44403C]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full bg-white border ${
          error ? 'border-rose-400' : 'border-[#E2DDD2] focus:border-[#B47820]'
        } rounded-md px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] shadow-sm transition`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-rose-400">{error}</p>
      ) : helper ? (
        <p className="text-xs text-zinc-400">{helper}</p>
      ) : null}
    </div>
  );
}

export function TextArea({
  label,
  helper,
  error,
  required,
  className = '',
  id,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
}) {
  const inputId = id || (label ? `textarea_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[#44403C]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        className={`w-full bg-white border ${
          error ? 'border-rose-400' : 'border-[#E2DDD2] focus:border-[#B47820]'
        } rounded-md px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] shadow-sm transition`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-rose-400">{error}</p>
      ) : helper ? (
        <p className="text-xs text-zinc-400">{helper}</p>
      ) : null}
    </div>
  );
}

export interface SelectOption {
  label: string;
  value: string | number;
}

export function Select({
  label,
  helper,
  error,
  required,
  options,
  children,
  className = '',
  id,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  options?: SelectOption[];
}) {
  const inputId = id || (label ? `select_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[#44403C]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <select
        id={inputId}
        className={`w-full bg-white border ${
          error ? 'border-rose-400' : 'border-[#E2DDD2] focus:border-[#B47820]'
        } rounded-md px-3 py-2 text-sm text-[#1C1917] shadow-sm transition`}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={String(opt.value)} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error ? (
        <p className="text-xs text-rose-400">{error}</p>
      ) : helper ? (
        <p className="text-xs text-zinc-400">{helper}</p>
      ) : null}
    </div>
  );
}

export function Alert({
  variant = 'info',
  type,
  title,
  message,
  children,
  onClose,
}: {
  variant?: 'info' | 'warning' | 'error' | 'success' | 'danger';
  type?: 'info' | 'warning' | 'error' | 'success' | 'danger' | string;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  onClose?: () => void;
}) {
  const effectiveVariant = type || variant;
  let style = 'bg-blue-50/80 border-blue-200 text-blue-900';
  if (effectiveVariant === 'warning') style = 'bg-amber-50/80 border-amber-200 text-amber-900';
  if (effectiveVariant === 'error' || effectiveVariant === 'danger')
    style = 'bg-rose-50/80 border-rose-200 text-rose-900';
  if (effectiveVariant === 'success') style = 'bg-emerald-50/80 border-emerald-200 text-emerald-900';

  return (
    <div className={`p-4 rounded border ${style} text-sm space-y-1 relative`}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 text-zinc-400 hover:text-white text-xs p-1"
          aria-label="Đóng thông báo"
        >
          ✕
        </button>
      )}
      {title && <div className="font-semibold">{title}</div>}
      <div>{message || children}</div>
    </div>
  );
}
