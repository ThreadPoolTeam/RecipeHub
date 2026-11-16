'use client';

import { Check, Info, LoaderCircle, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';

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

const AUTO_DISMISS_MS = 5000;

function ToastItem({ entry, dismiss }: { entry: ToastEntry; dismiss: (id: number) => void }) {
  const [shown, setShown] = useState(false);
  const [paused, setPaused] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const automatic = entry.type !== 'loading';
  const autoDismiss = automatic && entry.progress === undefined;
  const { icon: Icon, iconClass, bar: barClass, text } = styles[entry.type];
  const remaining = useRef(AUTO_DISMISS_MS);
  const startedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const running = useRef(false);
  const hovered = useRef(false);
  const focused = useRef(false);
  const ready = useRef(false);

  const start = useCallback(() => {
    window.clearTimeout(timer.current);
    if (remaining.current <= 0) { running.current = false; dismiss(entry.id); return; }
    const bar = barRef.current;
    if (!bar) return;
    void bar.offsetWidth;
    bar.style.transitionDuration = `${remaining.current}ms`;
    bar.style.width = '0%';
    running.current = true;
    startedAt.current = performance.now();
    timer.current = window.setTimeout(() => dismiss(entry.id), remaining.current);
  }, [dismiss, entry.id]);

  const sync = useCallback(() => {
    const hold = hovered.current || focused.current;
    setPaused(hold);
    if (hold) {
      if (!running.current) return;
      window.clearTimeout(timer.current);
      running.current = false;
      remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt.current));
      if (barRef.current) {
        barRef.current.style.transitionDuration = '0ms';
        barRef.current.style.width = `${remaining.current / AUTO_DISMISS_MS * 100}%`;
      }
    } else if (ready.current && !running.current) {
      start();
    }
  }, [start]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setShown(true);
      ready.current = true;
      if (autoDismiss && !hovered.current && !focused.current) start();
    });
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer.current); running.current = false; ready.current = false; };
  }, [autoDismiss, start]);

  const progress = entry.progress === undefined ? 100 : Math.max(0, Math.min(100, entry.progress));
  const pauseHandlers = autoDismiss ? {
    onMouseEnter: () => { hovered.current = true; sync(); },
    onMouseLeave: () => { hovered.current = false; sync(); },
    onFocus: () => { focused.current = true; sync(); },
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      focused.current = false; sync();
    },
  } : {};
  const motion = 'transition-[opacity,transform,box-shadow] duration-200 ease-out motion-reduce:transition-none';
  const enter = shown ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6 motion-reduce:opacity-100 motion-reduce:translate-x-0';
  const lift = paused ? '-translate-y-0.5 shadow-[0_2px_6px_rgba(26,26,31,.06),0_14px_32px_-10px_rgba(26,26,31,.20)] motion-reduce:translate-y-0' : 'shadow-lift';
  return (
    <div {...pauseHandlers} role={entry.type === 'error' ? 'alert' : 'status'} className={`relative flex min-h-[89px] w-full max-w-[400px] gap-3 overflow-hidden rounded-[18px] border border-border bg-card p-4 ${entry.description ? 'items-start' : 'items-center'} ${autoDismiss ? `${motion} ${enter} ${lift}` : 'shadow-lift'}`}>
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
      <div aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-[3px] origin-bottom bg-secondary transition-transform duration-150 ease-out motion-reduce:transition-none ${paused ? 'scale-y-[1.67]' : ''}`}>
        <div ref={barRef} className={`h-full ${barClass} ${autoDismiss ? 'transition-[width] ease-linear motion-reduce:transition-none' : ''}`} style={{ width: `${progress}%` }} />
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
    // Cùng nội dung thì thay thế thông báo cũ, tránh chồng nhiều thẻ giống hệt.
    setEntries(current => [{ ...options, id }, ...current.filter(entry => !(entry.type === options.type && entry.title === options.title && entry.description === options.description))]);
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
