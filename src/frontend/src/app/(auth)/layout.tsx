import React from 'react';
import Link from 'next/link';
import { Coffee, ArrowLeft } from 'lucide-react';
import { DemoProvider } from '@/lib/demo/provider';
import '@/components/workspace/workspace.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <div className="auth-root min-h-screen bg-[#FAF9F5] text-[#1C1917] flex flex-col justify-between">
        <header className="p-4 sm:p-6 flex items-center justify-between border-b border-[#E2DDD2] bg-white/80 backdrop-blur">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-[#1C1917]">
            <Coffee className="w-5 h-5 text-[#B47820]" />
            <span className="tracking-tight font-extrabold">RecipeHub</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#B47820]/15 text-[#B47820] font-semibold">
              R&amp;D Platform
            </span>
          </Link>
          <Link href="/" className="text-xs text-[#78716C] hover:text-[#B47820] transition flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Về Trang Giới Thiệu
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">{children}</main>

        <footer className="p-4 text-center text-xs text-[#78716C] border-t border-[#E2DDD2] bg-[#F5F2EB]">
          RecipeHub Beverage R&amp;D System © 2026 • IndexedDB Local Storage Mode
        </footer>
      </div>
    </DemoProvider>
  );
}
