'use client';

import { Check, Info, LoaderCircle, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface ToastOptions {
  type: 'success' | 'info' | 'error' | 'loading';
  title: string;
  description?: ReactNode;
  action?: { label: string; onClick: () => void };
  progress?: number;
}

interface ToastEntry extends ToastOptions { id: number }
interface ToastContextValue {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const styles = {
  success: { icon: Check, iconClass: 'bg-success-soft text-success', bar: 'bg-success', text: 'text-success' },
  info: { icon: Info, iconClass: 'bg-info-soft text-info', bar: 'bg-info', text: 'text-info' },
  error: { icon: X, iconClass: 'bg-destructive-soft text-destructive', bar: 'bg-destructive', text: 'text-destructive' },
  loading: { icon: LoaderCircle, iconClass: 'bg-primary-soft text-primary', bar: 'bg-primary', text: 'text-primary' },
};

function ToastItem({ entry, dismiss }: { entry: ToastEntry; dismiss: (id: number) => void }) {
  const [elapsed, setElapsed] = useState(false);
  const automatic = entry.type === 'success' || entry.type === 'info';
  const { icon: Icon, iconClass, bar, text } = styles[entry.type];

  useEffect(() => {
    if (!automatic) return;
    const frame = requestAnimationFrame(() => setElapsed(true));
    const timer = window.setTimeout(() => dismiss(entry.id), 5000);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [automatic, dismiss, entry.id]);

  const progress = entry.progress === undefined ? (automatic && elapsed ? 0 : 100) : Math.max(0, Math.min(100, entry.progress));
  return (
    <div role={entry.type === 'error' ? 'alert' : 'status'} className="relative flex min-h-[89px] w-full max-w-[400px] gap-3 overflow-hidden rounded-[18px] border border-border bg-card p-4 shadow-lift">
      <span className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        <Icon aria-hidden="true" size={18} strokeWidth={1.5} className={entry.type === 'loading' ? 'animate-spin motion-reduce:animate-none' : ''} />
      </span>
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-body font-semibold text-foreground">{entry.title}</p>
        {entry.description && <div className="mt-1 text-body-sm text-muted-foreground">{entry.description}</div>}
        {entry.action && <button type="button" onClick={entry.action.onClick} className={`mt-2 text-body-sm font-semibold ${text}`}>{entry.action.label}</button>}
      </div>
      <button type="button" aria-label="Đóng thông báo" onClick={() => dismiss(entry.id)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
        <X aria-hidden="true" size={16} strokeWidth={1.5} />
      </button>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-secondary">
        <div className={`h-full ${bar} ${automatic && entry.progress === undefined ? 'transition-[width] duration-[5000ms] ease-linear motion-reduce:transition-none' : ''}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);
  const dismiss = useCallback((id: number) => setEntries(current => current.filter(entry => entry.id !== id)), []);
  const toast = useCallback((options: ToastOptions) => {
    const id = ++nextId.current;
    setEntries(current => [{ ...options, id }, ...current]);
    return id;
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div aria-label="Thông báo" className="pointer-events-none fixed right-4 top-4 z-[10000] flex w-[min(400px,calc(100vw-2rem))] flex-col gap-2 [&>*]:pointer-events-auto">
        {entries.map(entry => <ToastItem key={entry.id} entry={entry} dismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
