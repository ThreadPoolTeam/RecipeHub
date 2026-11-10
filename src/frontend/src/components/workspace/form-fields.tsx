import React from 'react';

export function TextInput({ label, helper, error, required, className = '', id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string; helper?: string; error?: string; required?: boolean;
}) {
  const inputId = id || (label ? `input_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label htmlFor={inputId} className="block text-xs font-medium text-foreground">{label} {required && <span className="text-destructive">*</span>}</label>}
      <input id={inputId} className={`h-10 w-full rounded-md border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground shadow-inset outline-none focus:ring-2 ${error ? 'border-destructive focus:ring-destructive' : 'border-input focus:border-ring focus:ring-ring'}`} {...props} />
      {error ? <p className="text-xs text-destructive">{error}</p> : helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

export function TextArea({ label, helper, error, required, className = '', id, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string; helper?: string; error?: string; required?: boolean;
}) {
  const inputId = id || (label ? `textarea_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label htmlFor={inputId} className="block text-xs font-medium text-foreground">{label} {required && <span className="text-destructive">*</span>}</label>}
      <textarea id={inputId} className={`w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-inset outline-none focus:ring-2 ${error ? 'border-destructive focus:ring-destructive' : 'border-input focus:border-ring focus:ring-ring'}`} {...props} />
      {error ? <p className="text-xs text-destructive">{error}</p> : helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Tìm kiếm...', onClear, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { onClear?: () => void }) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="pointer-events-none absolute left-3 flex items-center text-muted-foreground">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>
      <input type="search" value={value} onChange={onChange} placeholder={placeholder} className="h-10 w-full rounded-full border border-input bg-card pl-11 pr-9 text-sm text-foreground placeholder:text-muted-foreground shadow-inset outline-none focus:border-ring focus:ring-2 focus:ring-ring" {...props} />
      {value && onClear && <button type="button" onClick={onClear} className="absolute right-3 rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground" aria-label="Xóa tìm kiếm"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg></button>}
    </div>
  );
}

export interface SelectOption {
  label: string;
  value: string | number;
}

export function Select({ label, helper, error, required, options, children, className = '', id, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string; helper?: string; error?: string; required?: boolean; options?: SelectOption[];
}) {
  const inputId = id || (label ? `select_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label htmlFor={inputId} className="block text-xs font-medium text-foreground">{label} {required && <span className="text-destructive">*</span>}</label>}
      <select id={inputId} className={`h-10 w-full rounded-md border bg-card px-3 text-sm text-foreground shadow-inset outline-none focus:ring-2 ${error ? 'border-destructive focus:ring-destructive' : 'border-input focus:border-ring focus:ring-ring'}`} {...props}>
        {options ? options.map((opt) => <option key={String(opt.value)} value={opt.value}>{opt.label}</option>) : children}
      </select>
      {error ? <p className="text-xs text-destructive">{error}</p> : helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
