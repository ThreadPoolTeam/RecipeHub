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
  FileText,
  FolderGit2,
  LogOut,
  Menu,
  X,
  PanelLeft,
  User,
  ExternalLink,
  ChevronRight,
  ChevronUp,
  HelpCircle,
  Award,
  GraduationCap,
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
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  // Session & Access Guard
  useEffect(() => {
    if (loading) return;

    const access = isPathAllowedForUser(pathname, session);
    if (!access.allowed && access.redirectUrl) {
      router.replace(access.redirectUrl);
    }
  }, [session, loading, pathname, router]);


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

  // Helper for active link styles (optimistic response)
  const activePath = pendingPath ?? pathname;
  const isLinkActive = (path: string, options?: { exact?: boolean; exclude?: string[] }) => {
    if (options?.exact) return activePath === path;
    const matches = activePath === path || activePath.startsWith(path.endsWith('/') ? path : `${path}/`);
    if (!matches) return false;
    if (options?.exclude?.some((ex) => activePath === ex || activePath.startsWith(ex.endsWith('/') ? ex : `${ex}/`))) {
      return false;
    }
    return true;
  };

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    setMobileSidebarOpen(false);
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && href !== pathname) {
      setPendingPath(href);
    }
  };

  const navLinkStyle = (active: boolean, isCollapsed = false) =>
    isCollapsed
      ? `w-10 h-10 flex items-center justify-center rounded-xl transition active:scale-[0.98] active:bg-[#ECE6DA] active:transition-none cursor-pointer ${
          active
            ? 'bg-[#ECE6DA] text-[#1A1917] font-semibold shadow-xs'
            : 'text-[#706E68] hover:text-[#1A1917] hover:bg-[#FAF9F5]'
        }`
      : `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition active:scale-[0.98] active:bg-[#ECE6DA] active:transition-none cursor-pointer ${
          active
            ? 'bg-[#ECE6DA] text-[#1A1917] font-semibold border-l-2 border-[#B47820]'
            : 'text-[#706E68] hover:text-[#1A1917] hover:bg-[#F5F0E8]'
        }`;
  const renderNavItems = (isCollapsed = false) => (
    <div className={isCollapsed ? 'space-y-2 flex flex-col items-center' : 'space-y-6'}>
      {/* R&D Role Nav */}
      {session?.role === 'rnd' && (
        <div className={isCollapsed ? 'space-y-2' : 'space-y-1'}>
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8C887F]">
              Không Gian R&amp;D
            </div>
          )}
          <Link
            href="/rnd"
            prefetch={true}
            onClick={(e) => handleNavClick('/rnd', e)}
            className={navLinkStyle(isLinkActive('/rnd', { exact: true }), isCollapsed)}
            title="Tổng quan R&D"
          >
            <LayoutDashboard className="w-5 h-5 text-[#B47820]" />
            {!isCollapsed && <span>Tổng quan R&amp;D</span>}
          </Link>
          <Link
            href="/rnd/recipes"
            prefetch={true}
            onClick={(e) => handleNavClick('/rnd/recipes', e)}
            className={navLinkStyle(isLinkActive('/rnd/recipes'), isCollapsed)}
            title="Công thức đồ uống"
          >
            <BookOpen className="w-5 h-5 text-[#706E68]" />
            {!isCollapsed && <span>Công thức đồ uống</span>}
          </Link>
          <Link
            href="/rnd/ingredients"
            prefetch={true}
            onClick={(e) => handleNavClick('/rnd/ingredients', e)}
            className={navLinkStyle(isLinkActive('/rnd/ingredients'), isCollapsed)}
            title="Kho nguyên liệu"
          >
            <FlaskConical className="w-5 h-5 text-[#706E68]" />
            {!isCollapsed && <span>Kho nguyên liệu</span>}
          </Link>
          <Link
            href="/rnd/media"
            prefetch={true}
            onClick={(e) => handleNavClick('/rnd/media', e)}
            className={navLinkStyle(isLinkActive('/rnd/media'), isCollapsed)}
            title="Tư liệu hình ảnh"
          >
            <ImageIcon className="w-5 h-5 text-[#706E68]" />
            {!isCollapsed && <span>Tư liệu hình ảnh</span>}
          </Link>
          <Link
            href="/rnd/quizzes"
            prefetch={true}
            onClick={(e) => handleNavClick('/rnd/quizzes', e)}
            className={navLinkStyle(isLinkActive('/rnd/quizzes', { exclude: ['/rnd/quizzes/results'] }), isCollapsed)}
            title="Bộ Quiz"
          >
            <GraduationCap className="w-5 h-5 text-[#706E68]" />
            {!isCollapsed && <span>Bộ Quiz</span>}
          </Link>
          <Link
            href="/rnd/quizzes/results"
            prefetch={true}
            onClick={(e) => handleNavClick('/rnd/quizzes/results', e)}
            className={navLinkStyle(isLinkActive('/rnd/quizzes/results'), isCollapsed)}
            title="Kết quả làm bài"
          >
            <Award className="w-5 h-5 text-[#706E68]" />
            {!isCollapsed && <span>Kết quả làm bài</span>}
          </Link>
        </div>
      )}

      {/* Viewer Role Nav */}
      {session?.role === 'viewer' && (
        <div className={isCollapsed ? 'space-y-2' : 'space-y-1'}>
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8C887F]">
              Vận Hành Cửa Hàng
            </div>
          )}
          <Link
            href="/viewer"
            prefetch={true}
            onClick={(e) => handleNavClick('/viewer', e)}
            className={navLinkStyle(isLinkActive('/viewer', { exclude: ['/viewer/quizzes'] }), isCollapsed)}
            title="Tra cứu SOP đồ uống"
          >
            <BookOpen className="w-5 h-5 text-[#B47820]" />
            {!isCollapsed && <span>Tra cứu SOP đồ uống</span>}
          </Link>
          <Link
            href="/viewer/quizzes"
            prefetch={true}
            onClick={(e) => handleNavClick('/viewer/quizzes', e)}
            className={navLinkStyle(isLinkActive('/viewer/quizzes', { exclude: ['/viewer/quizzes/history'] }), isCollapsed)}
            title="Bài kiểm tra"
          >
            <GraduationCap className="w-5 h-5 text-[#706E68]" />
            {!isCollapsed && <span>Bài kiểm tra</span>}
          </Link>
          <Link
            href="/viewer/quizzes/history"
            prefetch={true}
            onClick={(e) => handleNavClick('/viewer/quizzes/history', e)}
            className={navLinkStyle(isLinkActive('/viewer/quizzes/history'), isCollapsed)}
            title="Lịch sử làm bài"
          >
            <Award className="w-5 h-5 text-[#706E68]" />
            {!isCollapsed && <span>Lịch sử làm bài</span>}
          </Link>
        </div>
      )}

      {/* Admin Role Nav */}
      {session?.role === 'admin' && (
        <div className={isCollapsed ? 'space-y-2' : 'space-y-1'}>
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8C887F]">
              Quản Trị Hệ Thống
            </div>
          )}
          <Link
            href="/admin"
            prefetch={true}
            onClick={(e) => handleNavClick('/admin', e)}
            className={navLinkStyle(isLinkActive('/admin', { exact: true }), isCollapsed)}
            title="Tổng quan Admin"
          >
            <Settings className="w-5 h-5 text-[#B47820]" />
            {!isCollapsed && <span>Tổng quan Admin</span>}
          </Link>
          <Link
            href="/admin/users"
            prefetch={true}
            onClick={(e) => handleNavClick('/admin/users', e)}
            className={navLinkStyle(isLinkActive('/admin/users'), isCollapsed)}
            title="Tài khoản & Quyền"
          >
            <Users className="w-5 h-5 text-[#706E68]" />
            {!isCollapsed && <span>Tài khoản &amp; Quyền</span>}
          </Link>
          <Link
            href="/admin/catalogue"
            prefetch={true}
            onClick={(e) => handleNavClick('/admin/catalogue', e)}
            className={navLinkStyle(isLinkActive('/admin/catalogue'), isCollapsed)}
            title="Danh mục đơn vị"
          >
            <Package className="w-5 h-5 text-[#706E68]" />
            {!isCollapsed && <span>Danh mục đơn vị</span>}
          </Link>
          <Link
            href="/admin/logs"
            prefetch={true}
            onClick={(e) => handleNavClick('/admin/logs', e)}
            className={navLinkStyle(isLinkActive('/admin/logs'), isCollapsed)}
            title="Nhật ký Audit Logs"
          >
            <FileText className="w-5 h-5 text-[#706E68]" />
            {!isCollapsed && <span>Nhật ký Audit Logs</span>}
          </Link>
          <Link
            href="/admin/media"
            prefetch={true}
            onClick={(e) => handleNavClick('/admin/media', e)}
            className={navLinkStyle(isLinkActive('/admin/media'), isCollapsed)}
            title="Quản lý Media"
          >
            <FolderGit2 className="w-5 h-5 text-[#706E68]" />
            {!isCollapsed && <span>Quản lý Media</span>}
          </Link>
          <Link
            href="/admin/quizzes"
            prefetch={true}
            onClick={(e) => handleNavClick('/admin/quizzes', e)}
            className={navLinkStyle(isLinkActive('/admin/quizzes', { exclude: ['/admin/quizzes/results'] }), isCollapsed)}
            title="Bộ Quiz"
          >
            <GraduationCap className="w-5 h-5 text-[#706E68]" />
            {!isCollapsed && <span>Bộ Quiz</span>}
          </Link>
          <Link
            href="/admin/quizzes/results"
            prefetch={true}
            onClick={(e) => handleNavClick('/admin/quizzes/results', e)}
            className={navLinkStyle(isLinkActive('/admin/quizzes/results'), isCollapsed)}
            title="Kết quả làm bài"
          >
            <Award className="w-5 h-5 text-[#706E68]" />
            {!isCollapsed && <span>Kết quả làm bài</span>}
          </Link>
        </div>
      )}

    </div>
  );

  return (
    <div className="workspace-root min-h-screen bg-[#FAF9F5] text-[#1A1917] flex" onClick={touch}>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-30 bg-[#F5F0E8] border-r border-[#E8E2D9] transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 border-b border-[#E8E2D9] flex items-center justify-between shrink-0 gap-2">
          {!sidebarCollapsed && (
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
              className="flex items-center gap-2.5 font-bold text-base tracking-tight text-[#1A1917] hover:opacity-90 transition min-w-0"
            >
              <Coffee className="w-5 h-5 text-[#B47820] shrink-0" />
              <span className="leading-none font-extrabold tracking-tight truncate">
                <span className="text-[#1A1917]">Recipe</span><span className="text-[#B47820]">Hub</span>
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-2 rounded-xl text-[#706E68] hover:text-[#1A1917] hover:bg-[#FAF9F5] active:scale-95 transition ${
              sidebarCollapsed ? 'mx-auto' : ''
            }`}
            title={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            aria-label="Đóng mở thanh bên"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto overflow-x-hidden">
          {renderNavItems(sidebarCollapsed)}
        </nav>

        {/* User Card & Controls at Bottom (ChatGPT-style user item with popover menu) */}
        <div ref={menuRef} className="p-2 border-t border-[#E8E2D9] bg-[#F0ECE4] relative shrink-0">
          {/* Popover Menu (Image #4) */}
          {userMenuOpen && (
            <div
              className={`absolute bottom-full mb-2 bg-white border border-[#E8E2D9] rounded-2xl shadow-xl p-1.5 space-y-1 z-50 w-64 animate-in fade-in slide-in-from-bottom-2 duration-150 ${
                sidebarCollapsed ? 'left-2' : 'left-3 right-3'
              }`}
            >
              {/* Header profile row with chevron > */}
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF9F5] transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#B47820] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    {currentUser?.fullName?.charAt(0) || session?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[#1A1917] truncate group-hover:text-[#B47820] transition">
                      {currentUser?.fullName || session?.fullName}
                    </span>
                    <span className="text-[10px] text-[#706E68] truncate font-medium">
                      {session?.role === 'rnd'
                        ? 'Chuyên viên R&D'
                        : session?.role === 'viewer'
                        ? 'Nhân viên Pha chế (Barista)'
                        : 'Quản trị viên Hệ thống'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#706E68] group-hover:translate-x-0.5 group-hover:text-[#1A1917] transition shrink-0" />
              </Link>

              <div className="border-t border-[#E8E2D9] my-1" />

              {/* 3 working buttons in 100% Vietnamese */}
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#1A1917] hover:bg-[#FAF9F5] transition"
              >
                <User className="w-4 h-4 text-[#706E68]" />
                <span>Hồ sơ cá nhân</span>
              </Link>

              <Link
                href="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#1A1917] hover:bg-[#FAF9F5] transition"
              >
                <Settings className="w-4 h-4 text-[#706E68]" />
                <span>Cài đặt hệ thống</span>
              </Link>

              <Link
                href="/help"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#1A1917] hover:bg-[#FAF9F5] transition"
              >
                <HelpCircle className="w-4 h-4 text-[#706E68]" />
                <span>Trợ giúp &amp; Hướng dẫn</span>
              </Link>

              <div className="border-t border-[#E8E2D9] my-1" />

              <button
                type="button"
                onClick={async () => {
                  setUserMenuOpen(false);
                  await logout();
                  router.push('/login');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}

          {/* Trigger Button: In Collapsed mode, render ONLY avatar circle (Image #1) */}
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-10 h-10 rounded-full bg-[#B47820] text-white flex items-center justify-center font-bold text-xs mx-auto shadow-xs hover:scale-105 active:scale-95 transition cursor-pointer"
              title={currentUser?.fullName || session?.fullName}
            >
              {currentUser?.fullName?.charAt(0) || session?.fullName?.charAt(0) || 'U'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full p-2 rounded-xl hover:bg-white active:bg-white transition flex items-center justify-between text-left group border border-transparent hover:border-[#E8E2D9] shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#B47820] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {currentUser?.fullName?.charAt(0) || session?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="text-xs font-bold text-[#1A1917] truncate leading-tight">
                    {currentUser?.fullName || session?.fullName}
                  </span>
                  <span className="text-[10px] text-[#706E68] truncate leading-tight mt-0.5">
                    {session?.role === 'rnd'
                      ? 'Chuyên viên R&D'
                      : session?.role === 'viewer'
                      ? 'Nhân viên Pha chế (Barista)'
                      : 'Quản trị viên Hệ thống'}
                  </span>
                </div>
              </div>
              <ChevronUp
                className={`w-4 h-4 text-[#706E68] transition-transform duration-200 shrink-0 ${
                  userMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-[#F5F0E8] border-r border-[#E8E2D9] flex flex-col z-10">
            <div className="h-14 px-4 border-b border-[#E8E2D9] flex items-center justify-between">
              <span className="font-bold text-sm text-[#1A1917] flex items-center gap-2">
                <Coffee className="w-4 h-4 text-[#B47820]" />
                <span>RecipeHub Menu</span>
              </span>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="text-[#706E68] hover:text-[#1A1917] p-1 text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 overflow-y-auto">{renderNavItems()}</nav>
            <div className="p-3 border-t border-[#E8E2D9] bg-[#F0ECE4] space-y-2">
              <div className="text-xs text-[#1A1917] font-medium truncate">{session?.email}</div>
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
      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
        }`}
      >
        {/* Topbar */}
        <header className="h-14 sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#E8E2D9] px-4 sm:px-6 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger (only on mobile) */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-[#706E68] hover:text-[#1A1917] hover:bg-[#F5F0E8] transition"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Clean Section Title */}
            <h1 className="font-semibold text-sm sm:text-base text-[#1A1917]">
              {pathname.includes('/quizzes/results') || pathname.includes('/quizzes/history')
                ? 'Kết Quả & Lịch Sử Quiz'
                : pathname.includes('/quizzes')
                ? (session?.role === 'viewer' ? 'Bài Kiểm Tra Quiz' : 'Quản Lý Bộ Quiz')
                : pathname.startsWith('/rnd')
                ? 'Nghiên Cứu & Phát Triển (R&D)'
                : pathname.startsWith('/viewer')
                ? 'Tra Cứu SOP Cửa Hàng (Viewer)'
                : pathname.startsWith('/admin')
                ? 'Hệ Thống Quản Trị (Admin)'
                : pathname.startsWith('/profile')
                ? 'Hồ Sơ Chuyên Viên'
                : pathname.startsWith('/settings')
                ? 'Cài Đặt Hệ Thống'
                : pathname.startsWith('/help')
                ? 'Trợ Giúp & Hướng Dẫn'
                : 'RecipeHub Platform'}
            </h1>
          </div>

          {/* Right Header: Empty & Clean */}
          <div className="flex items-center gap-2"></div>
        </header>

        {/* Main Child View */}
        <main key={pathname} className="workspace-page-anim flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>

        {/* Footer */}
        <footer className="border-t border-[#E8E2D9] bg-[#F5F0E8] py-4 px-6 text-center text-xs text-[#706E68]">
          RecipeHub Coffee &amp; Beverage R&amp;D Platform © 2026 • Recipe API Mode
        </footer>
      </div>

    </div>
  );
}
