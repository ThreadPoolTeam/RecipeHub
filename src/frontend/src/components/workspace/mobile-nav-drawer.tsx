'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { LogOut, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDemo } from '@/lib/demo/provider';
import type { NavProps } from './nav-config';

export function MobileNavDrawer({ open, onClose, items, isLinkActive, onNavClick }: NavProps & { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { session, logout } = useDemo();
  const router = useRouter();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !ref.current) return;
      const controls = Array.from(ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex md:hidden">
    <div className="absolute inset-0 bg-foreground/45" onClick={onClose} />
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Menu điều hướng" className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-lift">
      <div className="flex h-20 items-center justify-between border-b border-border px-4"><span className="font-semibold">RecipeHub Menu</span><button type="button" aria-label="Đóng menu" onClick={onClose} className="rounded-md p-2 hover:bg-secondary"><X className="h-5 w-5" strokeWidth={1.5} /></button></div>
      <nav aria-label="Điều hướng chính" className="flex-1 overflow-y-auto p-4">
        {items.map(({ href, label, icon: Icon, options }) => { const active = isLinkActive(href, options); return <Link key={href} href={href} prefetch={true} onClick={(event) => onNavClick(href, event)} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm ${active ? 'bg-secondary font-semibold text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}><Icon className="h-5 w-5" strokeWidth={1.5} />{label}</Link>; })}
      </nav>
      <div className="border-t border-border p-4"><div className="truncate text-xs text-muted-foreground">{session?.email}</div><button type="button" onClick={async () => { await logout(); router.push('/login'); }} className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive-soft"><LogOut className="h-4 w-4" strokeWidth={1.5} />Đăng xuất</button></div>
    </div>
  </div>;
}
