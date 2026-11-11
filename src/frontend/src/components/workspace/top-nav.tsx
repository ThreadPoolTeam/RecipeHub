'use client';

import Link from 'next/link';
import { Coffee, Menu } from 'lucide-react';
import type { NavProps } from './nav-config';
import { UserMenu } from './user-menu';

export function TopNav({ role, items, isLinkActive, onNavClick, onOpenMenu }: NavProps & { role?: string; onOpenMenu: () => void }) {
  const home = role === 'rnd' ? '/rnd' : role === 'viewer' ? '/viewer' : role === 'admin' ? '/admin' : '/platform';
  return <header className="sticky top-0 z-30 border-b border-border bg-card shadow-header">
    <div className="mx-auto flex h-[79px] max-w-[1440px] items-center gap-4 px-4 lg:px-10">
      <button type="button" aria-label="Mở menu" aria-haspopup="dialog" onClick={onOpenMenu} className="rounded-md p-2 hover:bg-secondary md:hidden"><Menu className="h-5 w-5" strokeWidth={1.5} /></button>
      <Link href={home} className="flex shrink-0 items-center gap-2 text-foreground">
        <Coffee className="h-7 w-7 text-primary" strokeWidth={1.5} />
        <span><span className="block font-display text-lg font-medium leading-5">RecipeHub</span><span className="block text-[10px] tracking-wide text-muted-foreground">BEVERAGE R&amp;D</span></span>
      </Link>
      <nav aria-label="Điều hướng chính" className="hidden h-full min-w-0 flex-1 items-stretch gap-5 overflow-x-auto md:flex lg:gap-7">
        {items.map(({ href, label, options }) => { const active = isLinkActive(href, options); return <Link key={href} href={href} prefetch={true} onClick={(event) => onNavClick(href, event)} aria-current={active ? 'page' : undefined} className={`flex shrink-0 items-center border-b-2 text-sm first:ml-auto last:mr-auto ${active ? 'border-[var(--role-accent)] font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{label}</Link>; })}
      </nav>
      <div className="ml-auto md:ml-0"><UserMenu /></div>
    </div>
  </header>;
}
