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
  let baseStyle = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm tracking-tight';

  let sizeStyle = 'px-3.5 py-1.5 text-xs';
  if (size === 'md') sizeStyle = 'px-4 py-2 text-xs sm:text-sm';
  if (size === 'lg') sizeStyle = 'px-6 py-2.5 text-sm sm:text-base';

  let variantStyle = 'bg-white text-[#1A1917] hover:bg-[#FAF9F5] border border-[#E8E2D9] hover:border-[#D8D0C5] shadow-xs';
  if (variant === 'gold') {
    variantStyle = 'bg-[#B47820] text-white font-medium hover:bg-[#9A6416] border border-[#B47820] shadow-xs hover:shadow';
  } else if (variant === 'primary') {
    variantStyle = 'bg-[#1A1917] text-white font-medium hover:bg-[#2A2927] border border-[#1A1917] shadow-xs';
  } else if (variant === 'danger') {
    variantStyle = 'bg-rose-600 text-white hover:bg-rose-700 border border-rose-600 shadow-xs';
  } else if (variant === 'ghost') {
    variantStyle = 'bg-transparent text-[#706E68] hover:text-[#1A1917] hover:bg-[#FAF9F5] border border-transparent';
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
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[#1A1917]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full bg-white border ${
          error ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' : 'border-[#E8E2D9] focus:border-[#B47820] focus:ring-2 focus:ring-[#B47820]/15'
        } rounded-xl px-3.5 py-2 text-sm text-[#1A1917] placeholder:text-[#8C887F] shadow-xs transition-all duration-150 outline-none`}
      />
      {error ? (
        <p className="text-xs text-rose-500">{error}</p>
      ) : helper ? (
        <p className="text-xs text-[#706E68]">{helper}</p>
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
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[#1A1917]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        className={`w-full bg-white border ${
          error ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' : 'border-[#E8E2D9] focus:border-[#B47820] focus:ring-2 focus:ring-[#B47820]/15'
        } rounded-xl px-3.5 py-2.5 text-sm text-[#1A1917] placeholder:text-[#8C887F] shadow-xs transition-all duration-150 outline-none`}
      />
      {error ? (
        <p className="text-xs text-rose-500">{error}</p>
      ) : helper ? (
        <p className="text-xs text-[#706E68]">{helper}</p>
      ) : null}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  onClear,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  onClear?: () => void;
}) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="absolute left-3.5 pointer-events-none text-[#706E68] flex items-center">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-white border border-[#E8E2D9] hover:border-[#D8D0C5] focus:border-[#B47820] focus:ring-2 focus:ring-[#B47820]/15 rounded-full pl-10 pr-9 py-2 text-xs sm:text-sm text-[#1A1917] placeholder:text-[#8C887F] shadow-xs transition-all duration-150 outline-none"
        {...props}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 text-[#706E68] hover:text-[#1A1917] p-0.5 rounded-full hover:bg-[#FAF9F5] transition"
          aria-label="Xóa tìm kiếm"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
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
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[#1A1917]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <select
        id={inputId}
        className={`w-full bg-white border ${
          error ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' : 'border-[#E8E2D9] focus:border-[#B47820] focus:ring-2 focus:ring-[#B47820]/15'
        } rounded-xl px-3.5 py-2 text-sm text-[#1A1917] shadow-xs transition-all duration-150 outline-none`}
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
        <p className="text-xs text-rose-500">{error}</p>
      ) : helper ? (
        <p className="text-xs text-[#706E68]">{helper}</p>
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
          className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-800 text-xs p-1"
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
