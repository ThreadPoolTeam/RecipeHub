import Link from 'next/link';
import { BrandLogo } from '@/components/brand/brand-logo';

export function LandingNav() {
  return (
    <header className="border-b border-border bg-card shadow-header">
      <div className="flex h-20 items-center justify-between px-4 md:px-6">
        <BrandLogo href="/" />
        <Link href="/login" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Đăng nhập</Link>
      </div>
    </header>
  );
}
