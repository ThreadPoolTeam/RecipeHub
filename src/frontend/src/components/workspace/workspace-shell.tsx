'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Coffee,
  LayoutDashboard,
  BookOpen,
  FlaskConical,
  Image as ImageIcon,
  Settings,
  Users,
  Package,
  Bot,
  FileText,
  FolderGit2,
  CheckSquare,
  RotateCcw,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { isPathAllowedForUser } from '@/lib/demo/permissions';
import { RoleBadge } from './status-badge';
import { Button } from './fields';
import { Dialog } from './dialog';
import './workspace.css';

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { session, currentUser, loading, logout, repo, touch } = useDemo();
  const pathname = usePathname();
  const router = useRouter();

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Session & Access Guard
  useEffect(() => {
    if (loading) return;

    const access = isPathAllowedForUser(pathname, session);
    if (!access.allowed && access.redirectUrl) {
      router.replace(access.redirectUrl);
    }
  }, [session, loading, pathname, router]);

  const handleResetSystem = async () => {
    if (!session) return;
    setIsResetting(true);
    try {
      await repo.resetSystem(session);
      window.location.reload();
    } catch {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="workspace-root min-h-screen flex items-center justify-center bg-[#FAF9F5] text-[#1C1917]">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B47820]"></div>
          <p className="text-xs text-[#78716C]">Đang khởi tạo phiên làm việc RecipeHub...</p>
        </div>
      </div>
    );
  }

  const access = isPathAllowedForUser(pathname, session);
  if (!access.allowed) {
    return (
      <div className="workspace-root min-h-screen flex items-center justify-center bg-[#FAF9F5] text-[#1C1917]">
        <p className="text-xs text-[#78716C]">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  // Helper for active link styles
  const isLinkActive = (path: string, exact = false) => {
    if (exact) return pathname === path;
    return pathname.startsWith(path);
  };

  const navLinkStyle = (active: boolean) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition ${
      active
        ? 'bg-[#EAE5D9] text-[#1C1917] font-semibold border-l-2 border-[#B47820]'
        : 'text-[#6B665E] hover:text-[#1C1917] hover:bg-[#EFEAE0]'
    }`;
  const renderNavItems = () => (
    <div className="space-y-6">
      {/* R&D Role Nav */}
      {session?.role === 'rnd' && (
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">
            Không Gian R&amp;D
          </div>
          <Link
            href="/rnd"
            onClick={() => setMobileSidebarOpen(false)}
            className={navLinkStyle(isLinkActive('/rnd', true))}
          >
            <LayoutDashboard className="w-4 h-4 text-[#B47820]" />
            <span>Tổng quan R&amp;D</span>
          </Link>
          <Link
            href="/rnd/recipes"
            onClick={() => setMobileSidebarOpen(false)}
            className={navLinkStyle(isLinkActive('/rnd/recipes'))}
          >
            <BookOpen className="w-4 h-4 text-[#78716C]" />
            <span>Công thức đồ uống</span>
          </Link>
          <Link
            href="/rnd/ingredients"
            onClick={() => setMobileSidebarOpen(false)}
            className={navLinkStyle(isLinkActive('/rnd/ingredients'))}
          >
            <FlaskConical className="w-4 h-4 text-[#78716C]" />
            <span>Kho nguyên liệu</span>
          </Link>
          <Link
            href="/rnd/media"
            onClick={() => setMobileSidebarOpen(false)}
            className={navLinkStyle(isLinkActive('/rnd/media'))}
          >
            <ImageIcon className="w-4 h-4 text-[#78716C]" />
            <span>Tư liệu hình ảnh</span>
          </Link>
        </div>
      )}

      {/* Viewer Role Nav */}
      {session?.role === 'viewer' && (
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">
            Vận Hành Cửa Hàng
          </div>
          <Link
            href="/viewer"
            onClick={() => setMobileSidebarOpen(false)}
            className={navLinkStyle(isLinkActive('/viewer'))}
          >
            <BookOpen className="w-4 h-4 text-[#B47820]" />
            <span>Tra cứu SOP đồ uống</span>
          </Link>
        </div>
      )}

      {/* Admin Role Nav */}
      {session?.role === 'admin' && (
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">
            Quản Trị Hệ Thống
          </div>
          <Link
            href="/admin"
            onClick={() => setMobileSidebarOpen(false)}
            className={navLinkStyle(isLinkActive('/admin', true))}
          >
            <Settings className="w-4 h-4 text-[#B47820]" />
            <span>Tổng quan Admin</span>
          </Link>
          <Link
            href="/admin/users"
            onClick={() => setMobileSidebarOpen(false)}
            className={navLinkStyle(isLinkActive('/admin/users'))}
          >
            <Users className="w-4 h-4 text-[#78716C]" />
            <span>Tài khoản &amp; Quyền</span>
          </Link>
          <Link
            href="/admin/catalogue"
            onClick={() => setMobileSidebarOpen(false)}
            className={navLinkStyle(isLinkActive('/admin/catalogue'))}
          >
            <Package className="w-4 h-4 text-[#78716C]" />
            <span>Danh mục đơn vị</span>
          </Link>
          <Link
            href="/admin/ai-settings"
            onClick={() => setMobileSidebarOpen(false)}
            className={navLinkStyle(isLinkActive('/admin/ai-settings'))}
          >
            <Bot className="w-4 h-4 text-[#78716C]" />
            <span>Cấu hình AI Demo</span>
          </Link>
          <Link
            href="/admin/logs"
            onClick={() => setMobileSidebarOpen(false)}
            className={navLinkStyle(isLinkActive('/admin/logs'))}
          >
            <FileText className="w-4 h-4 text-[#78716C]" />
            <span>Nhật ký Audit Logs</span>
          </Link>
          <Link
            href="/admin/media"
            onClick={() => setMobileSidebarOpen(false)}
            className={navLinkStyle(isLinkActive('/admin/media'))}
          >
            <FolderGit2 className="w-4 h-4 text-[#78716C]" />
            <span>Quản lý Media</span>
          </Link>
        </div>
      )}

      {/* Reviewer Capability Nav */}
      {session?.canApprove && (
        <div className="space-y-1 pt-2 border-t border-[#E2DDD2]">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#B47820] flex items-center gap-1">
            <CheckSquare className="w-3 h-3" />
            <span>Phê Duyệt R&amp;D</span>
          </div>
          <Link
            href="/approvals"
            onClick={() => setMobileSidebarOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition ${
              isLinkActive('/approvals')
                ? 'bg-[#EAE5D9] text-[#1C1917] border-l-2 border-[#B47820]'
                : 'text-[#6B665E] hover:text-[#1C1917] hover:bg-[#EFEAE0]'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-[#B47820]" />
            <span>Hàng chờ phê duyệt</span>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <div className="workspace-root min-h-screen bg-[#FAF9F5] text-[#1C1917] flex" onClick={touch}>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 left-0 z-30 bg-[#F5F2EB] border-r border-[#E2DDD2]">
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-[#E2DDD2] flex items-center justify-between">
          <Link
            href={
              session?.role === 'rnd'
                ? '/rnd'
                : session?.role === 'viewer'
                ? '/viewer'
                : session?.role === 'admin'
                ? '/admin'
                : '/platform'
            }
            className="flex items-center gap-2.5 font-bold text-base tracking-tight text-[#1C1917] hover:opacity-90 transition"
          >
            <Coffee className="w-5 h-5 text-[#B47820]" />
            <div className="flex flex-col">
              <span className="leading-tight font-extrabold">RecipeHub</span>
              <span className="text-[10px] text-[#78716C] font-normal">Beverage R&amp;D System</span>
            </div>
          </Link>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#B47820]/15 text-[#B47820] font-semibold uppercase">
            {session?.role || 'Guest'}
          </span>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto">{renderNavItems()}</nav>

        {/* User Card & Controls at Bottom */}
        <div className="p-3 border-t border-[#E2DDD2] bg-[#EFECE4] space-y-2">
          <div className="p-2.5 rounded-md bg-white border border-[#E2DDD2] flex items-center justify-between shadow-sm">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-semibold text-[#1C1917] truncate">
                {currentUser?.fullName || session?.fullName}
              </span>
              <span className="text-[10px] text-[#78716C] truncate">{session?.email}</span>
            </div>
            {session && <RoleBadge role={session.role} canApprove={session.canApprove} />}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              onClick={() => setIsResetDialogOpen(true)}
              title="Làm mới cơ sở dữ liệu về bộ mẫu ban đầu"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset DB
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 text-[11px]"
              onClick={async () => {
                await logout();
                router.push('/login');
              }}
            >
              <LogOut className="w-3 h-3 mr-1" /> Đăng xuất
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-[#F5F2EB] border-r border-[#E2DDD2] flex flex-col z-10">
            <div className="h-16 px-4 border-b border-[#E2DDD2] flex items-center justify-between">
              <span className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
                <Coffee className="w-4 h-4 text-[#B47820]" />
                <span>RecipeHub Menu</span>
              </span>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="text-[#78716C] hover:text-[#1C1917] p-1 text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 overflow-y-auto">{renderNavItems()}</nav>
            <div className="p-3 border-t border-[#E2DDD2] bg-[#EFECE4] space-y-2">
              <div className="text-xs text-[#1C1917] font-medium truncate">{session?.email}</div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                onClick={async () => {
                  await logout();
                  router.push('/login');
                }}
              >
                <LogOut className="w-3 h-3 mr-1" /> Đăng xuất
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen min-w-0">
        {/* Topbar */}
        <header className="h-16 sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#E2DDD2] px-4 sm:px-6 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EB] transition"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Section Label */}
            <div className="flex items-center gap-2 text-xs text-[#78716C]">
              <span className="font-semibold text-[#1C1917]">
                {pathname.startsWith('/rnd')
                  ? 'Nghiên Cứu & Phát Triển (R&D)'
                  : pathname.startsWith('/viewer')
                  ? 'Tra Cứu SOP Cửa Hàng (Viewer)'
                  : pathname.startsWith('/admin')
                  ? 'Hệ Thống Quản Trị (Admin)'
                  : pathname.startsWith('/approvals')
                  ? 'Thẩm Định Phê Duyệt'
                  : 'Không Gian Chung'}
              </span>
              <span>/</span>
              <span className="text-[#A8A29E] font-mono text-[11px]">{pathname}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-[#78716C] hover:text-[#B47820] transition flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về Landing</span>
            </Link>
          </div>
        </header>

        {/* Main Child View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>

        {/* Footer */}
        <footer className="border-t border-[#E2DDD2] bg-[#F5F2EB] py-4 px-6 text-center text-xs text-[#78716C]">
          RecipeHub Coffee &amp; Beverage R&amp;D Platform © 2026 • IndexedDB Local Storage Mode
        </footer>
      </div>

      {/* Reset DB Confirmation Dialog */}
      <Dialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        title="Xác nhận làm mới dữ liệu hệ thống (Reset DB)"
        description="Thao tác này sẽ xóa toàn bộ các thay đổi cục bộ trong trình duyệt và nạp lại bộ dữ liệu seed ban đầu."
        confirmLabel="Tiến hành Reset"
        confirmVariant="danger"
        isConfirming={isResetting}
        onConfirm={handleResetSystem}
      >
        <p className="text-sm text-zinc-300">
          Tất cả công thức nháp, tài khoản vừa tạo và ảnh tải lên sẽ bị xóa. Dữ liệu sẽ trở về 4 tài khoản mặc định và bộ công thức mẫu tiêu chuẩn.
        </p>
      </Dialog>
    </div>
  );
}
