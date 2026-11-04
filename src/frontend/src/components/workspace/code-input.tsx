'use client';

import React, { useId } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface CodeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helper?: string;
  error?: string | null;
  onGenerate: () => void;
  generateLabel: string;
  generateDisabled?: boolean;
  generating?: boolean;
}

export function CodeInput({
  label,
  helper,
  error,
  onGenerate,
  generateLabel,
  generateDisabled = false,
  generating = false,
  disabled = false,
  required,
  className = '',
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...props
}: CodeInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const descriptionIds = [describedBy, helper ? helperId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`min-w-0 space-y-1.5 ${className}`}>
      <label htmlFor={inputId} className="block text-xs font-semibold text-[#1A1917]">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className={`flex min-w-0 items-center gap-1 rounded-xl border bg-white p-1 shadow-xs transition-all duration-150 focus-within:ring-2 ${
        error ? 'border-rose-400 focus-within:ring-rose-200' : 'border-[#E8E2D9] focus-within:border-[#B47820] focus-within:ring-[#B47820]/15'
      }`}>
        <input
          {...props}
          id={inputId}
          required={required}
          disabled={disabled || generating}
          aria-invalid={error ? true : invalid}
          aria-describedby={descriptionIds}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-2.5 py-1.5 text-sm text-[#1A1917] outline-none placeholder:text-[#8C887F] disabled:cursor-not-allowed disabled:text-[#706E68]"
        />
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled || generating || generateDisabled}
          aria-label={generateLabel}
          aria-describedby={descriptionIds}
          aria-busy={generating}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-transparent px-2 py-1.5 text-xs font-medium text-[#B47820] transition hover:text-[#9A6416] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B47820] disabled:cursor-not-allowed disabled:opacity-50 sm:px-2.5"
        >
          {generating ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />}
          <span aria-live="polite">{generating ? 'Đang tạo…' : 'Tạo mã'}</span>
        </button>
      </div>
      {helper && <p id={helperId} className="text-xs text-[#706E68]">{helper}</p>}
      {error && <p id={errorId} role="alert" className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
