import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'RecipeHub Platform Shell',
  description: 'RecipeHub Coffee R&D Formula Management System Foundation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col">
        <header className="border-b bg-white border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="font-bold text-xl tracking-tight text-slate-900">
                ☕ RecipeHub <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-normal">Foundation</span>
              </Link>
              <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
                <Link href="/" className="hover:text-blue-600 transition">Tổng quan</Link>
                <Link href="/admin" className="hover:text-blue-600 transition">Administrator</Link>
                <Link href="/rnd" className="hover:text-blue-600 transition">R&D</Link>
                <Link href="/viewer" className="hover:text-blue-600 transition">Viewer</Link>
              </nav>
            </div>
            <div className="text-xs text-slate-500">
              PRN-PRM Semester 8
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {children}
        </main>

        <footer className="border-t bg-white border-slate-200 py-4 text-center text-xs text-slate-500">
          RecipeHub Microservices Foundation Shell &copy; 2026
        </footer>
      </body>
    </html>
  );
}
