'use client';

import './landing.css';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Coffee, BookOpen, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { ManifestData } from './frame-sequence';
import { ScrollFrameStory } from './scroll-frame-story';

interface LandingPageProps {
  manifest: ManifestData;
}

export function LandingPage({ manifest }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [tone, setTone] = useState<'dark' | 'light'>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const lightMarkerRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateToneAndScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 40);

      if (lightMarkerRef.current && headerRef.current) {
        const headerBottom = headerRef.current.getBoundingClientRect().bottom;
        const markerTop = lightMarkerRef.current.getBoundingClientRect().top;
        const isLight = markerTop <= headerBottom;
        setTone((prev) => (prev !== (isLight ? 'light' : 'dark') ? (isLight ? 'light' : 'dark') : prev));
      }
    };

    updateToneAndScroll();

    window.addEventListener('scroll', updateToneAndScroll, { passive: true });
    window.addEventListener('resize', updateToneAndScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateToneAndScroll);
      window.removeEventListener('resize', updateToneAndScroll);
    };
  }, []);

  // Escape key closes mobile menu and restores button focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        mobileToggleRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <div className="landing min-h-screen flex flex-col">
      {/* 1. Global Navigation Header */}
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          tone === 'dark'
            ? scrolled
              ? 'bg-[#0C0C0E]/90 backdrop-blur-md border-b border-[rgba(242,240,235,0.08)] py-3 shadow-lg'
              : 'bg-transparent py-5'
            : scrolled
            ? 'bg-[#FAF9F5]/95 backdrop-blur-md border-b border-[#E8E2D9] py-3 shadow-xs'
            : 'bg-[#FAF9F5]/85 backdrop-blur-sm border-b border-[#E8E2D9] py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className={`text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 group transition-colors ${
                tone === 'dark' ? 'text-[#F2F0EB]' : 'text-[#1A1917]'
              }`}
            >
              <Coffee
                className={`w-6 h-6 transition-transform group-hover:scale-110 ${
                  tone === 'dark' ? 'text-[#C9A84C]' : 'text-[#B47820]'
                }`}
              />
              <span className="font-extrabold tracking-tight">RecipeHub</span>
            </Link>

            <nav
              className={`hidden md:flex items-center gap-6 text-sm font-medium transition-colors ${
                tone === 'dark' ? 'text-[#9E9A90]' : 'text-[#706E68]'
              }`}
            >
              <a
                href="#story"
                className={`transition-colors ${
                  tone === 'dark' ? 'hover:text-[#F2F0EB]' : 'hover:text-[#1A1917]'
                }`}
              >
                Hành trình
              </a>
              <a
                href="#workspace"
                className={`transition-colors ${
                  tone === 'dark' ? 'hover:text-[#F2F0EB]' : 'hover:text-[#1A1917]'
                }`}
              >
                Không gian làm việc
              </a>
              <a
                href="#features"
                className={`transition-colors ${
                  tone === 'dark' ? 'hover:text-[#F2F0EB]' : 'hover:text-[#1A1917]'
                }`}
              >
                Tính năng
              </a>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-colors shadow-xs ${
                tone === 'dark'
                  ? 'bg-[#C9A84C] text-[#0C0C0E] hover:bg-[#DEBF64]'
                  : 'bg-[#B47820] text-white hover:bg-[#9A6416]'
              }`}
            >
              Đăng nhập
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            ref={mobileToggleRef}
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              tone === 'dark'
                ? 'text-[#9E9A90] hover:text-[#F2F0EB] hover:bg-[rgba(242,240,235,0.05)]'
                : 'text-[#706E68] hover:text-[#1A1917] hover:bg-[#E8E2D9]/50'
            }`}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
            aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Disclosure */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-menu"
            className={`md:hidden border-b px-4 pt-3 pb-6 space-y-4 transition-colors ${
              tone === 'dark'
                ? 'bg-[#151518] border-[rgba(242,240,235,0.1)] text-[#9E9A90]'
                : 'bg-[#FAF9F5] border-[#E8E2D9] text-[#706E68]'
            }`}
          >
            <nav className="flex flex-col gap-3 text-sm font-medium">
              <a
                href="#story"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1 transition ${
                  tone === 'dark' ? 'hover:text-[#F2F0EB]' : 'hover:text-[#1A1917]'
                }`}
              >
                Hành trình
              </a>
              <a
                href="#workspace"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1 transition ${
                  tone === 'dark' ? 'hover:text-[#F2F0EB]' : 'hover:text-[#1A1917]'
                }`}
              >
                Không gian làm việc
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1 transition ${
                  tone === 'dark' ? 'hover:text-[#F2F0EB]' : 'hover:text-[#1A1917]'
                }`}
              >
                Tính năng
              </a>
            </nav>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className={`block text-center w-full px-4 py-2.5 rounded-full text-xs font-semibold shadow-xs ${
                tone === 'dark'
                  ? 'bg-[#C9A84C] text-[#0C0C0E] hover:bg-[#DEBF64]'
                  : 'bg-[#B47820] text-white hover:bg-[#9A6416]'
              }`}
            >
              Đăng nhập
            </Link>
          </div>
        )}
      </header>

      {/* 2. Scroll-Driven Storytelling Track */}
      <main className="flex-1 w-full">
        <div id="story" className="scroll-mt-20">
          <ScrollFrameStory manifest={manifest} />
        </div>

        {/* 3. Invisible marker for header tone detection (no gradient band) */}
        <div ref={lightMarkerRef} className="h-0 w-full" aria-hidden="true" />

        {/* 4. Phân hệ Không gian làm việc (Workspaces Showcase) */}
        <section
          id="workspace"
          className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#FAF9F5] text-[#1A1917] scroll-mt-20"
        >
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#B47820]/15 text-[#B47820] border border-[#B47820]/30">
                <span>✦</span>
                <span>Định hướng phân hệ vận hành</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1A1917]">
                Câu chuyện ấy có một nơi để lưu giữ.
              </h2>
              <p className="text-base sm:text-lg text-[#706E68] leading-relaxed">
                Không gian làm việc số hoá kết nối trực tiếp các vai trò vận hành chuỗi: từ thử nghiệm công thức R&amp;D, chuẩn hoá quy trình quầy bar, đến quản trị tài khoản và hạ tầng kỹ thuật.
              </p>
            </div>

            {/* 4 Workspace Showcase Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Card 1: R&D Specialist */}
              <div className="group relative rounded-2xl bg-white border border-[#E8E2D9] hover:border-[#B47820] transition-all duration-300 hover:-translate-y-1 hover:shadow-md overflow-hidden flex flex-col justify-between">
                <div className="relative h-60 w-full overflow-hidden">
                  <img
                    src="/landing/workspaces/rnd-lab.jpg"
                    alt="Phòng Lab Nghiên cứu & Phát triển R&D"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF9F5]/90 text-[#B47820] border border-[#E8E2D9] backdrop-blur-sm">
                    <span>R&amp;D LAB</span>
                    <span className="text-[#8C887F]">&bull;</span>
                    <span className="font-mono text-[11px] text-[#1A1917]">/rnd</span>
                  </div>
                  <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF9F5]/90 text-[#706E68] border border-[#E8E2D9] backdrop-blur-sm">
                    R&amp;D Shell
                  </div>
                </div>

                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-2.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#1A1917] group-hover:text-[#B47820] transition-colors">
                      Nghiên cứu &amp; Thử nghiệm Công thức
                    </h3>
                    <p className="text-sm text-[#706E68] leading-relaxed">
                      Thiết lập tỷ lệ thành phần nguyên liệu, định lượng gram/ml chuẩn xác và kiểm soát lịch sử phiên bản công thức (v1.0 &rarr; v2.4).
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E8E2D9] flex items-center justify-between">
                    <Link
                      href="/rnd"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[#B47820] hover:text-[#9A6416] transition"
                    >
                      <span>Vào không gian R&amp;D</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                    </Link>
                    <span className="text-[11px] text-[#706E68]">Thử nghiệm định lượng</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Barista SOP Viewer */}
              <div className="group relative rounded-2xl bg-white border border-[#E8E2D9] hover:border-[#B47820] transition-all duration-300 hover:-translate-y-1 hover:shadow-md overflow-hidden flex flex-col justify-between">
                <div className="relative h-60 w-full overflow-hidden">
                  <img
                    src="/landing/workspaces/barista-sop.jpg"
                    alt="Barista pha chế tại quầy bar"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF9F5]/90 text-[#B47820] border border-[#E8E2D9] backdrop-blur-sm">
                    <span>STORE VIEWER</span>
                    <span className="text-[#8C887F]">&bull;</span>
                    <span className="font-mono text-[11px] text-[#1A1917]">/viewer</span>
                  </div>
                  <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF9F5]/90 text-[#706E68] border border-[#E8E2D9] backdrop-blur-sm">
                    Viewer Shell
                  </div>
                </div>

                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-2.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#1A1917] group-hover:text-[#B47820] transition-colors">
                      Tra cứu Quy trình Pha chế (SOP)
                    </h3>
                    <p className="text-sm text-[#706E68] leading-relaxed">
                      Hướng dẫn thao tác quầy bar từng bước, định mức đá/đường và checklist thao tác phục vụ đồng nhất chất lượng toàn chuỗi.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E8E2D9] flex items-center justify-between">
                    <Link
                      href="/viewer"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[#B47820] hover:text-[#9A6416] transition"
                    >
                      <span>Mở Barista SOP</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                    </Link>
                    <span className="text-[11px] text-[#706E68]">SOP quầy bar</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Administration */}
              <div className="group relative rounded-2xl bg-white border border-[#E8E2D9] hover:border-[#B47820] transition-all duration-300 hover:-translate-y-1 hover:shadow-md overflow-hidden flex flex-col justify-between">
                <div className="relative h-60 w-full overflow-hidden">
                  <img
                    src="/landing/workspaces/admin-management.jpg"
                    alt="Bảng điều khiển quản trị hệ thống"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF9F5]/90 text-[#B47820] border border-[#E8E2D9] backdrop-blur-sm">
                    <span>ADMINISTRATION</span>
                    <span className="text-[#8C887F]">&bull;</span>
                    <span className="font-mono text-[11px] text-[#1A1917]">/admin</span>
                  </div>
                  <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF9F5]/90 text-[#706E68] border border-[#E8E2D9] backdrop-blur-sm">
                    Admin Shell
                  </div>
                </div>

                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-2.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#1A1917] group-hover:text-[#B47820] transition-colors">
                      Bảng điều khiển Quản trị &amp; Phân quyền
                    </h3>
                    <p className="text-sm text-[#706E68] leading-relaxed">
                      Quản lý danh mục hệ thống, phân quyền người dùng theo vai trò (RBAC) và truy vết nhật ký Audit Log bảo mật.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E8E2D9] flex items-center justify-between">
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[#B47820] hover:text-[#9A6416] transition"
                    >
                      <span>Vào trang Quản trị</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                    </Link>
                    <span className="text-[11px] text-[#706E68]">Phân quyền &amp; Audit</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Platform & Microservices */}
              <div className="group relative rounded-2xl bg-white border border-[#E8E2D9] hover:border-[#B47820] transition-all duration-300 hover:-translate-y-1 hover:shadow-md overflow-hidden flex flex-col justify-between">
                <div className="relative h-60 w-full overflow-hidden">
                  <img
                    src="/landing/workspaces/platform-architecture.jpg"
                    alt="Hạ tầng kỹ thuật .NET 8 Microservices"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF9F5]/90 text-[#B47820] border border-[#E8E2D9] backdrop-blur-sm">
                    <span>.NET 8 PLATFORM</span>
                    <span className="text-[#8C887F]">&bull;</span>
                    <span className="font-mono text-[11px] text-[#1A1917]">/platform</span>
                  </div>
                  <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF9F5]/90 text-[#706E68] border border-[#E8E2D9] backdrop-blur-sm">
                    Platform Shell
                  </div>
                </div>

                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-2.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#1A1917] group-hover:text-[#B47820] transition-colors">
                      Kiến trúc Nền tảng &amp; YARP Gateway
                    </h3>
                    <p className="text-sm text-[#706E68] leading-relaxed">
                      Giám sát trạng thái 4 microservices Clean Architecture, định tuyến YARP Gateway, hợp đồng gRPC và phân tán Redis Streams.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E8E2D9] flex items-center justify-between">
                    <Link
                      href="/platform"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[#B47820] hover:text-[#9A6416] transition"
                    >
                      <span>Khám phá Nền tảng Kỹ thuật</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                    </Link>
                    <span className="text-[11px] text-[#706E68]">Clean Architecture</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transparent Note */}
            <p className="text-center text-xs text-[#706E68] mt-6">
              * Hình ảnh minh họa định hướng phân hệ. Nút bấm liên kết trực tiếp tới khung nền tảng kỹ thuật hiện có trong dự án.
            </p>
          </div>
        </section>

        {/* 5. Phân hệ Tính năng (Features Section) */}
        <section
          id="features"
          className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#F5F0E8] border-t border-[#E8E2D9] scroll-mt-20"
        >
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#B47820]/15 text-[#B47820] border border-[#B47820]/30">
                <span>✦</span>
                <span>Năng lực cốt lõi</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1A1917]">
                Chuẩn mực vận hành từ ý tưởng đến quầy bar.
              </h2>
              <p className="text-base sm:text-lg text-[#706E68] leading-relaxed">
                Ba trụ cột tính năng giúp đội ngũ R&amp;D và vận hành số hóa, quản lý và ban hành công thức xuyên suốt toàn bộ chuỗi đồ uống.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white rounded-2xl p-7 border border-[#E8E2D9] shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FAF9F5] border border-[#E8E2D9] text-[#B47820] flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1917]">
                    Biên tập &amp; Quản lý Phiên bản
                  </h3>
                  <p className="text-sm text-[#706E68] leading-relaxed">
                    Định lượng thành phần chuẩn xác theo gram/ml, nhiệt độ ủ trà và các bước pha chế SOP. Truy vết lịch sử chỉnh sửa rõ ràng từ v1.0 đến v2.4.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#E8E2D9] text-xs font-semibold text-[#B47820]">
                  Phiên bản công thức chính xác
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-2xl p-7 border border-[#E8E2D9] shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FAF9F5] border border-[#E8E2D9] text-[#B47820] flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1917]">
                    Ảnh Nháp AI &amp; Thư Viện Media
                  </h3>
                  <p className="text-sm text-[#706E68] leading-relaxed">
                    Khảo sát concept hình ảnh sản phẩm với nhãn phân định minh bạch giữa ảnh nháp tạo bởi AI và ảnh chụp thực tế tại quầy bar.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#E8E2D9] text-xs font-semibold text-[#B47820]">
                  Trực quan hóa concept nhanh chóng
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-2xl p-7 border border-[#E8E2D9] shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FAF9F5] border border-[#E8E2D9] text-[#B47820] flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1917]">
                    Phát hành &amp; Phân quyền
                  </h3>
                  <p className="text-sm text-[#706E68] leading-relaxed">
                    Chuyên viên R&amp;D hoàn thiện rồi phát hành công thức trực tiếp; quyền truy cập SOP vẫn được kiểm soát theo vai trò.
                  </p>
                </div>
                <div className="pt-4 border-t border-[#E8E2D9] text-xs font-semibold text-[#B47820]">
                  Quy trình xét duyệt chuẩn mực
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Final CTA Section */}
        <section
          id="cta"
          className="relative py-28 px-4 sm:px-6 lg:px-8 border-t border-[#E8E2D9] bg-[#FAF9F5] text-center scroll-mt-20"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            <span className="text-xs uppercase tracking-[0.2em] text-[#B47820] font-semibold">
              Khởi đầu hành trình mới
            </span>
            <h2 className="landing-heading-chapter font-bold tracking-tight text-[#1A1917]">
              Giữ lại công thức. <br />
              <span className="text-[#B47820]">Tiếp tục sáng tạo.</span>
            </h2>
            <p className="landing-subheading max-w-2xl mx-auto text-[#706E68]">
              Từ bàn thử nghiệm của chuyên viên R&amp;D đến quầy bar mọi cửa hàng trong chuỗi &mdash; RecipeHub là cầu nối giữ trọn vẹn giá trị từng hương vị.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#workspace"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-semibold tracking-wide bg-[#B47820] text-white hover:bg-[#9A6416] transition-colors shadow-sm"
              >
                Khám phá không gian làm việc
              </a>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-semibold tracking-wide bg-white text-[#1A1917] hover:bg-[#F5F0E8] border border-[#E8E2D9] transition shadow-xs"
              >
                Đăng nhập hệ thống &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Minimalist Warm Editorial Footer */}
      <footer className="border-t border-[#E8E2D9] bg-[#F5F0E8] py-12 px-4 sm:px-6 lg:px-8 text-xs text-[#706E68]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <div className="font-bold text-sm text-[#1A1917] flex items-center justify-center sm:justify-start gap-1.5">
              <Coffee className="w-4 h-4 text-[#B47820]" />
              <span className="font-extrabold tracking-tight">RecipeHub</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#B47820]/15 text-[#B47820] font-semibold">
              </span>
            </div>
            <p className="text-[11px] text-[#706E68]">
              Dự án môn học PRN232 &bull; PRM Semester 8 (FPT University)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
            <a href="#story" className="hover:text-[#1A1917] transition">
              Hành trình
            </a>
            <a href="#workspace" className="hover:text-[#1A1917] transition">
              Không gian làm việc
            </a>
            <a href="#features" className="hover:text-[#1A1917] transition">
              Tính năng
            </a>
            <Link href="/platform" className="hover:text-[#1A1917] transition">
              Nền tảng kỹ thuật
            </Link>
            <Link href="/login" className="hover:text-[#1A1917] transition">
              Đăng nhập
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[#E8E2D9] text-center text-[11px] text-[#8C887F] space-y-1">
          <p>
            * Tư liệu hình ảnh TVC trích xuất minh họa từ thương hiệu Phê La nhằm mục đích học tập &amp; nghiên cứu kiến trúc hệ thống (PRN232/PRM). Không hàm ý quan hệ hợp tác hoặc đại diện thương mại.
          </p>
          <p>
            RecipeHub Microservices Architecture Foundation &copy; 2026. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
