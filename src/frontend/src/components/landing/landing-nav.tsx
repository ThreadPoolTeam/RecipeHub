import type { Dispatch, RefObject, SetStateAction } from 'react';
import Link from 'next/link';
import { Coffee, Menu, X } from 'lucide-react';

interface LandingNavProps {
  headerRef: RefObject<HTMLElement | null>;
  mobileToggleRef: RefObject<HTMLButtonElement | null>;
  tone: 'dark' | 'light';
  scrolled: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
}

const links = [
  { href: '#story', label: 'Hành trình' },
  { href: '#workspace', label: 'Không gian làm việc' },
  { href: '#features', label: 'Tính năng' },
];

export function LandingNav({ headerRef, mobileToggleRef, tone, scrolled, mobileMenuOpen, setMobileMenuOpen }: LandingNavProps) {
  const dark = tone === 'dark';
  const navigationColor = dark ? 'text-cinematic-muted hover:text-cinematic-ink' : 'text-muted-foreground hover:text-foreground';
  return (
    <header ref={headerRef} className={`fixed inset-x-0 top-0 z-50 border-b transition-colors motion-reduce:transition-none ${dark ? (scrolled || mobileMenuOpen ? 'border-cinematic-border bg-cinematic-bg' : 'border-transparent bg-transparent') : 'border-border bg-card shadow-header'}`}>
      <div className="mx-auto flex h-20 max-w-[1360px] items-center justify-between gap-8 px-4 md:px-10">
        <Link href="/" className={`flex items-center gap-2 font-display text-xl font-medium ${dark ? 'text-cinematic-ink' : 'text-foreground'}`}>
          <Coffee className="h-6 w-6" strokeWidth={1.5} /> RecipeHub
        </Link>
        <nav aria-label="Điều hướng chính" className="hidden flex-1 items-center gap-7 text-sm md:flex">
          {links.map((link) => <a key={link.href} href={link.href} className={navigationColor}>{link.label}</a>)}
        </nav>
        <Link href="/login" className="hidden rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:inline-flex">Đăng nhập</Link>
        <button ref={mobileToggleRef} type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`rounded-md p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring md:hidden ${navigationColor}`} aria-expanded={mobileMenuOpen} aria-controls="mobile-nav-menu" aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}>
          {mobileMenuOpen ? <X className="h-6 w-6" strokeWidth={1.5} /> : <Menu className="h-6 w-6" strokeWidth={1.5} />}
        </button>
      </div>
      {mobileMenuOpen && <div id="mobile-nav-menu" className={`space-y-4 border-t px-4 py-4 md:hidden ${dark ? 'border-cinematic-border bg-cinematic-bg' : 'border-border bg-card'}`}>
        <nav aria-label="Điều hướng di động" className="flex flex-col gap-3 text-sm">
          {links.map((link) => <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className={`py-1 ${navigationColor}`}>{link.label}</a>)}
        </nav>
        <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground">Đăng nhập</Link>
      </div>}
    </header>
  );
}
