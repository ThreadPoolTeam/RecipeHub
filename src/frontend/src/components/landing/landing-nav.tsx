import Link from 'next/link';
import { Coffee } from 'lucide-react';

export function LandingNav() {
  return (
    <header className="border-b border-border bg-card shadow-header">
      <div className="flex h-20 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-medium text-foreground">
          <Coffee className="h-6 w-6" strokeWidth={1.5} />RecipeHub
        </Link>
        <Link href="/login" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Đăng nhập</Link>
      </div>
    </header>
  );
}
