import React from 'react';
import Link from 'next/link';
import { Coffee } from 'lucide-react';
import { DemoProvider } from '@/lib/demo/provider';
import '@/components/workspace/workspace.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <div className="auth-root min-h-screen bg-[#FAF9F5] text-[#1A1917] flex flex-col justify-between">
        <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[#E8E2D9] bg-white/80 backdrop-blur">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-[#1A1917]">
            <Coffee className="w-5 h-5 text-[#B47820]" />
            <span className="tracking-tight font-extrabold"><span className="text-[#1A1917]">Recipe</span><span className="text-[#B47820]">Hub</span></span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">{children}</main>

        <footer className="p-4 text-center text-xs text-[#706E68] border-t border-[#E8E2D9] bg-[#F5F0E8]">
          RecipeHub Beverage R&amp;D System © 2026
        </footer>
      </div>
    </DemoProvider>
  );
}
