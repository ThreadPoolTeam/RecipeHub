'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, HelpCircle, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDemo } from '@/lib/demo/provider';

export function UserMenu() {
  const { currentUser, session, logout } = useDemo();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const name = currentUser?.fullName || session?.fullName || '';
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(-2).map((part) => part.charAt(0)).join('').toUpperCase() || 'U';
  const role = session?.role === 'rnd' ? 'Chuyên viên R&D' : session?.role === 'viewer' ? 'Nhân viên Pha chế (Barista)' : 'Quản trị viên Hệ thống';

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); }
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button ref={buttonRef} type="button" aria-label="Menu tài khoản" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-md p-1 text-foreground hover:bg-secondary">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-xs font-medium">{initials}</span>
        <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
      </button>
      {open && <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lift">
        <Link href="/profile" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 hover:bg-secondary">
          <span className="block truncate text-sm font-semibold">{name}</span><span className="block text-xs text-muted-foreground">{role}</span>
        </Link>
        <div className="my-1 border-t border-border" />
        {[
          { href: '/profile', label: 'Hồ sơ cá nhân', icon: User },
          // TODO: tạm ẩn; sau này chỉ hiện cho Admin.
          // { href: '/settings', label: 'Cài đặt hệ thống', icon: Settings },
          { href: '/help', label: 'Trợ giúp & Hướng dẫn', icon: HelpCircle },
        ].map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary"><Icon className="h-4 w-4" strokeWidth={1.5} />{label}</Link>)}
        <div className="my-1 border-t border-border" />
        <button type="button" onClick={async () => { setOpen(false); await logout(); router.push('/login'); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive-soft"><LogOut className="h-4 w-4" strokeWidth={1.5} />Đăng xuất</button>
      </div>}
    </div>
  );
}
