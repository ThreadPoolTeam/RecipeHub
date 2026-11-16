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
      <label htmlFor={inputId} className="block text-xs font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className={`flex h-10 min-w-0 items-center gap-1 rounded-md border bg-card px-1 shadow-inset focus-within:ring-2 ${
        error ? 'border-destructive focus-within:ring-destructive' : 'border-input focus-within:border-ring focus-within:ring-ring'
      }`}>
        <input
          {...props}
          id={inputId}
          required={required}
          disabled={disabled || generating}
          aria-invalid={error ? true : invalid}
          aria-describedby={descriptionIds}
          className="min-w-0 flex-1 rounded-md bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
        />
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled || generating || generateDisabled}
          aria-label={generateLabel}
          aria-describedby={descriptionIds}
          aria-busy={generating}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-transparent px-2 py-1.5 text-xs font-medium text-[var(--role-accent)] hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 sm:px-2.5"
        >
          {generating ? <Loader2 aria-hidden="true" strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin" /> : <Sparkles aria-hidden="true" strokeWidth={1.5} className="h-3.5 w-3.5" />}
          <span aria-live="polite">{generating ? 'Đang tạo…' : 'Tạo mã'}</span>
        </button>
      </div>
      {helper && <p id={helperId} className="text-xs text-muted-foreground">{helper}</p>}
      {error && <p id={errorId} role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
