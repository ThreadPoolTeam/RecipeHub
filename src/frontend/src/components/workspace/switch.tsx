'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role'>;

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch({ className = '', ...props }, ref) {
  return (
    <label className={`relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer items-center ${className}`}>
      <input {...props} ref={ref} type="checkbox" role="switch" className="peer sr-only" />
      <span aria-hidden="true" className="h-7 w-[52px] rounded-full bg-border peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50" />
      <span aria-hidden="true" className="pointer-events-none absolute left-1 h-5 w-5 rounded-full bg-card shadow-control transition-transform motion-reduce:transition-none peer-checked:translate-x-6 peer-disabled:opacity-50" />
    </label>
  );
});
