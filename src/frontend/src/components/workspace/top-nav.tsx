'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Coffee, Menu } from 'lucide-react';
import type { NavGroup, NavProps } from './nav-config';
import { UserMenu } from './user-menu';

const navUnderlineClass = 'relative after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:origin-left after:bg-[var(--role-accent)] after:transition-transform after:duration-[350ms] after:ease-out after:content-[""] hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none';

function NavDropdown({ group, isLinkActive, onNavClick, open, setOpen, scheduleClose }: { group: NavGroup; open: boolean; setOpen: (open: boolean) => void; scheduleClose: () => void } & Pick<NavProps, 'isLinkActive' | 'onNavClick'>) {
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const active = group.children.some((item) => isLinkActive(item.href, item.options));

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const moveFocus = (direction: number) => {
    const links = Array.from(container.current?.querySelectorAll<HTMLAnchorElement>('a') ?? []);
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    links[index < 0 ? (direction > 0 ? 0 : links.length - 1) : (index + direction + links.length) % links.length]?.focus();
  };

  return <div ref={container} className="relative flex shrink-0 items-stretch first:ml-auto last:mr-auto" onPointerEnter={(event) => {
    if (event.pointerType !== 'mouse') return;
    setOpen(true);
  }} onPointerLeave={(event) => {
    if (event.pointerType !== 'mouse') return;
    scheduleClose();
  }} onKeyDown={(event) => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (!open) { setOpen(true); requestAnimationFrame(() => moveFocus(direction)); }
      else moveFocus(direction);
    }
  }}>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)} className={`${navUnderlineClass} flex items-center gap-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${active || open ? 'after:scale-x-100' : 'after:scale-x-0'} ${active ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
      {group.label}<ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform duration-150 ease-out motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} strokeWidth={1.5} />
    </button>
    {open && <div id={panelId} className="workspace-nav-panel absolute left-0 top-full z-40 min-w-56 rounded-lg border border-border bg-popover p-1 shadow-lift motion-reduce:animate-none">
      {group.children.map(({ href, label, options }) => {
        const childActive = isLinkActive(href, options);
        return <Link key={href} href={href} prefetch={true} onClick={(event) => { onNavClick(href, event); setOpen(false); }} aria-current={childActive ? 'page' : undefined} className={`block rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${childActive ? 'bg-secondary font-semibold text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>{label}</Link>;
      })}
    </div>}
  </div>;
}

export function TopNav({ role, items, isLinkActive, onNavClick, onOpenMenu }: NavProps & { role?: string; onOpenMenu: () => void }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const pathname = usePathname();
  useEffect(() => () => { window.clearTimeout(closeTimer.current); }, []);
  useEffect(() => { window.clearTimeout(closeTimer.current); setOpenGroup(null); }, [pathname]);
  const setGroup = (label: string, open: boolean) => {
    window.clearTimeout(closeTimer.current);
    setOpenGroup((current) => open ? label : current === label ? null : current);
  };
  const scheduleClose = (label: string) => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOpenGroup((current) => current === label ? null : current);
      closeTimer.current = undefined;
    }, 120);
  };
  const home = role === 'rnd' ? '/rnd' : role === 'viewer' ? '/viewer' : role === 'admin' ? '/admin' : '/platform';
  const hasGroups = items.some((item) => 'children' in item);
  return <header className="sticky top-0 z-30 border-b border-border bg-card shadow-header">
    <div className="mx-auto flex h-[79px] max-w-[1440px] items-center gap-4 px-4 lg:px-10">
      <button type="button" aria-label="Mở menu" aria-haspopup="dialog" onClick={onOpenMenu} className="rounded-md p-2 hover:bg-secondary md:hidden"><Menu className="h-5 w-5" strokeWidth={1.5} /></button>
      <Link href={home} className="flex shrink-0 items-center gap-2 text-foreground">
        <Coffee className="h-7 w-7 text-primary" strokeWidth={1.5} />
        <span><span className="block font-display text-lg font-medium leading-5">RecipeHub</span><span className="block text-[10px] tracking-wide text-muted-foreground">BEVERAGE R&amp;D</span></span>
      </Link>
      <nav aria-label="Điều hướng chính" className={`hidden h-full min-w-0 flex-1 items-stretch gap-3 md:flex lg:gap-7 ${hasGroups ? '' : 'overflow-x-auto'}`}>
        {items.map((item) => {
          if ('children' in item) return <NavDropdown key={item.label} group={item} isLinkActive={isLinkActive} onNavClick={onNavClick} open={openGroup === item.label} setOpen={(open) => setGroup(item.label, open)} scheduleClose={() => scheduleClose(item.label)} />;
          const { href, label, options } = item;
          const active = isLinkActive(href, options);
          return <Link key={href} href={href} prefetch={true} onClick={(event) => onNavClick(href, event)} aria-current={active ? 'page' : undefined} className={`${navUnderlineClass} flex shrink-0 items-center text-sm first:ml-auto last:mr-auto ${active ? 'after:scale-x-100 font-semibold text-foreground' : 'after:scale-x-0 text-muted-foreground hover:text-foreground'}`}>{label}</Link>;
        })}
      </nav>
      <div className="ml-auto md:ml-0"><UserMenu /></div>
    </div>
  </header>;
}
