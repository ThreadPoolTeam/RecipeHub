'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDemo } from '@/lib/demo/provider';
import { isPathAllowedForUser } from '@/lib/demo/permissions';
import { MobileNavDrawer } from './mobile-nav-drawer';
import { navConfig } from './nav-config';
import { ShellFooter } from './shell-footer';
import { TopNav } from './top-nav';
import './workspace.css';

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { session, loading, touch } = useDemo();
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => { setPendingPath(null); }, [pathname]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileSidebarOpen(false), []);

  useEffect(() => {
    if (loading) return;
    const access = isPathAllowedForUser(pathname, session);
    if (!access.allowed && access.redirectUrl) {
      router.replace(access.redirectUrl);
    }
  }, [session, loading, pathname, router]);

  if (loading) {
    return <div className="workspace-root flex min-h-screen items-center justify-center"><div className="space-y-3 text-center"><div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary motion-reduce:animate-none" /><p className="text-xs text-muted-foreground">Đang khởi tạo phiên làm việc RecipeHub...</p></div></div>;
  }
  const access = isPathAllowedForUser(pathname, session);
  if (!access.allowed) {
    return <div className="workspace-root flex min-h-screen items-center justify-center"><p className="text-xs text-muted-foreground">Đang kiểm tra quyền truy cập...</p></div>;
  }

  const activePath = pendingPath ?? pathname;
  const isLinkActive = (path: string, options?: { exact?: boolean; exclude?: string[] }) => {
    if (options?.exact) return activePath === path;
    const matches = activePath === path || activePath.startsWith(path.endsWith('/') ? path : `${path}/`);
    if (!matches) return false;
    if (options?.exclude?.some((ex) => activePath === ex || activePath.startsWith(ex.endsWith('/') ? ex : `${ex}/`))) return false;
    return true;
  };
  const handleNavClick = (href: string, event: React.MouseEvent) => {
    setMobileSidebarOpen(false);
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && href !== pathname) setPendingPath(href);
  };
  const items = navConfig[session?.role ?? ''] ?? [];
  const navProps = { items, isLinkActive, onNavClick: handleNavClick };

  return <div className="workspace-root flex min-h-screen flex-col text-foreground" data-role={session?.role} onClick={touch}>
    <TopNav {...navProps} role={session?.role} onOpenMenu={() => setMobileSidebarOpen(true)} />
    <MobileNavDrawer {...navProps} open={mobileSidebarOpen} onClose={closeMobileNav} />
    <main key={pathname} className="workspace-page-anim mx-auto w-full max-w-[1360px] min-w-0 flex-1 px-4 py-6 md:px-10">{children}</main>
    <ShellFooter />
  </div>;
}
