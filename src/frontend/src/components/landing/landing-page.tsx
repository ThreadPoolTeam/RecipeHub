'use client';

import './landing.css';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ManifestData } from './frame-sequence';
import { ScrollFrameStory } from './scroll-frame-story';

interface LandingPageProps {
  manifest: ManifestData;
}

export function LandingPage({ manifest }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing min-h-screen flex flex-col">
      {/* 1. Global Navigation Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#0C0C0E]/90 backdrop-blur-md border-b border-[rgba(242,240,235,0.08)] py-3 shadow-lg'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-xl sm:text-2xl font-bold tracking-tight text-[#F2F0EB] flex items-center gap-2 group"
            >
              <span className="text-[#C9A84C] group-hover:scale-110 transition-transform">☕</span>
              <span>RecipeHub</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#9E9A90]">
              <a href="#story" className="hover:text-[#F2F0EB] transition-colors">
                Hành trình
              </a>
              <a href="#workspace" className="hover:text-[#F2F0EB] transition-colors">
                Không gian công thức
              </a>
              <Link href="/platform" className="hover:text-[#F2F0EB] transition-colors flex items-center gap-1.5">
                <span>Nền tảng kỹ thuật</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(201,168,76,0.15)] text-[#C9A84C] border border-[rgba(201,168,76,0.3)]">
                  .NET 8
                </span>
              </Link>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <a
              href="#workspace"
              className="px-4 py-2 rounded-full text-xs font-semibold tracking-wide bg-[#C9A84C] text-[#0C0C0E] hover:bg-[#DEBF64] transition-colors shadow-sm"
            >
              Khám phá giao diện
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#9E9A90] hover:text-[#F2F0EB] hover:bg-[rgba(242,240,235,0.05)]"
            aria-label="Mở menu điều hướng"
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

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#151518] border-b border-[rgba(242,240,235,0.1)] px-4 pt-3 pb-6 space-y-4">
            <nav className="flex flex-col gap-3 text-sm font-medium text-[#9E9A90]">
              <a
                href="#story"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#F2F0EB] py-1 transition"
              >
                Hành trình
              </a>
              <a
                href="#workspace"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#F2F0EB] py-1 transition"
              >
                Không gian công thức
              </a>
              <Link
                href="/platform"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#F2F0EB] py-1 transition flex items-center justify-between"
              >
                <span>Nền tảng kỹ thuật</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(201,168,76,0.15)] text-[#C9A84C]">
                  .NET 8
                </span>
              </Link>
            </nav>
            <a
              href="#workspace"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center w-full px-4 py-2.5 rounded-full text-xs font-semibold bg-[#C9A84C] text-[#0C0C0E]"
            >
              Khám phá giao diện
            </a>
          </div>
        )}
      </header>

      {/* 2. Scroll-Driven Storytelling Track */}
      <main className="flex-1 w-full">
        <ScrollFrameStory manifest={manifest} />

        {/* 3. Phân hệ Không gian làm việc thật (Workspaces Showcase) */}
        <section
          id="workspace"
          className="relative py-28 px-4 sm:px-6 lg:px-8 border-t border-[rgba(242,240,235,0.08)] bg-[#0C0C0E]"
        >
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(201,168,76,0.12)] text-[#C9A84C] border border-[rgba(201,168,76,0.25)]">
                <span>✦</span>
                <span>Định hướng phân hệ vận hành</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F2F0EB]">
                Câu chuyện ấy có một nơi để lưu giữ.
              </h2>
              <p className="text-base sm:text-lg text-[#9E9A90] leading-relaxed">
                Không gian làm việc số hoá kết nối trực tiếp các vai trò vận hành chuỗi: từ thử nghiệm công thức R&amp;D, chuẩn hoá quy trình quầy bar, đến quản trị tài khoản và hạ tầng kỹ thuật.
              </p>
            </div>

            {/* 4 Workspace Showcase Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Card 1: R&D Specialist */}
              <div className="group relative rounded-2xl bg-[#151518] border border-[rgba(242,240,235,0.08)] hover:border-[#C9A84C] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(201,168,76,0.12)] overflow-hidden flex flex-col justify-between">
                <div className="relative h-60 w-full overflow-hidden">
                  <img
                    src="/landing/workspaces/rnd-lab.jpg"
                    alt="Phòng Lab Nghiên cứu & Phát triển R&D"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151518] via-[rgba(21,21,24,0.4)] to-transparent" />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(12,12,14,0.85)] text-[#C9A84C] border border-[rgba(201,168,76,0.3)] backdrop-blur-sm">
                    <span>R&amp;D LAB</span>
                    <span className="text-[#9E9A90]">&bull;</span>
                    <span className="font-mono text-[11px] text-[#F2F0EB]">/rnd</span>
                  </div>
                  <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[rgba(12,12,14,0.7)] text-[#9E9A90] border border-[rgba(242,240,235,0.1)] backdrop-blur-sm">
                    R&amp;D Shell
                  </div>
                </div>

                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-2.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#F2F0EB] group-hover:text-[#C9A84C] transition-colors">
                      Nghiên cứu &amp; Thử nghiệm Công thức
                    </h3>
                    <p className="text-sm text-[#9E9A90] leading-relaxed">
                      Thiết lập tỷ lệ thành phần nguyên liệu, định lượng gram/ml chuẩn xác và kiểm soát lịch sử phiên bản công thức (v1.0 &rarr; v2.4).
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[rgba(242,240,235,0.06)] flex items-center justify-between">
                    <Link
                      href="/rnd"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[#C9A84C] group-hover:text-[#DEBF64] transition"
                    >
                      <span>Vào không gian R&amp;D</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                    <span className="text-[11px] text-[#9E9A90]">Thử nghiệm định lượng</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Barista SOP Viewer */}
              <div className="group relative rounded-2xl bg-[#151518] border border-[rgba(242,240,235,0.08)] hover:border-[#C9A84C] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(201,168,76,0.12)] overflow-hidden flex flex-col justify-between">
                <div className="relative h-60 w-full overflow-hidden">
                  <img
                    src="/landing/workspaces/barista-sop.jpg"
                    alt="Barista pha chế tại quầy bar"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151518] via-[rgba(21,21,24,0.4)] to-transparent" />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(12,12,14,0.85)] text-[#C9A84C] border border-[rgba(201,168,76,0.3)] backdrop-blur-sm">
                    <span>STORE VIEWER</span>
                    <span className="text-[#9E9A90]">&bull;</span>
                    <span className="font-mono text-[11px] text-[#F2F0EB]">/viewer</span>
                  </div>
                  <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[rgba(12,12,14,0.7)] text-[#9E9A90] border border-[rgba(242,240,235,0.1)] backdrop-blur-sm">
                    Viewer Shell
                  </div>
                </div>

                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-2.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#F2F0EB] group-hover:text-[#C9A84C] transition-colors">
                      Tra cứu Quy trình Pha chế (SOP)
                    </h3>
                    <p className="text-sm text-[#9E9A90] leading-relaxed">
                      Hướng dẫn thao tác quầy bar từng bước, định mức đá/đường và checklist thao tác phục vụ đồng nhất chất lượng toàn chuỗi.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[rgba(242,240,235,0.06)] flex items-center justify-between">
                    <Link
                      href="/viewer"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[#C9A84C] group-hover:text-[#DEBF64] transition"
                    >
                      <span>Mở Barista SOP</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                    <span className="text-[11px] text-[#9E9A90]">SOP quầy bar</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Administration */}
              <div className="group relative rounded-2xl bg-[#151518] border border-[rgba(242,240,235,0.08)] hover:border-[#C9A84C] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(201,168,76,0.12)] overflow-hidden flex flex-col justify-between">
                <div className="relative h-60 w-full overflow-hidden">
                  <img
                    src="/landing/workspaces/admin-management.jpg"
                    alt="Bảng điều khiển quản trị hệ thống"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151518] via-[rgba(21,21,24,0.4)] to-transparent" />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(12,12,14,0.85)] text-[#C9A84C] border border-[rgba(201,168,76,0.3)] backdrop-blur-sm">
                    <span>ADMINISTRATION</span>
                    <span className="text-[#9E9A90]">&bull;</span>
                    <span className="font-mono text-[11px] text-[#F2F0EB]">/admin</span>
                  </div>
                  <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[rgba(12,12,14,0.7)] text-[#9E9A90] border border-[rgba(242,240,235,0.1)] backdrop-blur-sm">
                    Admin Shell
                  </div>
                </div>

                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-2.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#F2F0EB] group-hover:text-[#C9A84C] transition-colors">
                      Bảng điều khiển Quản trị &amp; Phân quyền
                    </h3>
                    <p className="text-sm text-[#9E9A90] leading-relaxed">
                      Quản lý danh mục hệ thống, phân quyền người dùng theo vai trò (RBAC) và truy vết nhật ký Audit Log bảo mật.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[rgba(242,240,235,0.06)] flex items-center justify-between">
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[#C9A84C] group-hover:text-[#DEBF64] transition"
                    >
                      <span>Vào trang Quản trị</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                    <span className="text-[11px] text-[#9E9A90]">Phân quyền &amp; Audit</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Platform & Microservices */}
              <div className="group relative rounded-2xl bg-[#151518] border border-[rgba(242,240,235,0.08)] hover:border-[#C9A84C] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(201,168,76,0.12)] overflow-hidden flex flex-col justify-between">
                <div className="relative h-60 w-full overflow-hidden">
                  <img
                    src="/landing/workspaces/platform-architecture.jpg"
                    alt="Hạ tầng kỹ thuật .NET 8 Microservices"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151518] via-[rgba(21,21,24,0.4)] to-transparent" />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(12,12,14,0.85)] text-[#C9A84C] border border-[rgba(201,168,76,0.3)] backdrop-blur-sm">
                    <span>.NET 8 PLATFORM</span>
                    <span className="text-[#9E9A90]">&bull;</span>
                    <span className="font-mono text-[11px] text-[#F2F0EB]">/platform</span>
                  </div>
                  <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[rgba(12,12,14,0.7)] text-[#9E9A90] border border-[rgba(242,240,235,0.1)] backdrop-blur-sm">
                    Platform Shell
                  </div>
                </div>

                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-2.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#F2F0EB] group-hover:text-[#C9A84C] transition-colors">
                      Kiến trúc Nền tảng &amp; YARP Gateway
                    </h3>
                    <p className="text-sm text-[#9E9A90] leading-relaxed">
                      Giám sát trạng thái 4 microservices Clean Architecture, định tuyến YARP Gateway, hợp đồng gRPC và phân tán Redis Streams.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[rgba(242,240,235,0.06)] flex items-center justify-between">
                    <Link
                      href="/platform"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[#C9A84C] group-hover:text-[#DEBF64] transition"
                    >
                      <span>Khám phá Nền tảng Kỹ thuật</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                    <span className="text-[11px] text-[#9E9A90]">Clean Architecture</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transparent Note */}
            <p className="text-center text-xs text-[#9E9A90] mt-6">
              * Hình ảnh minh họa định hướng phân hệ. Nút bấm liên kết trực tiếp tới khung nền tảng kỹ thuật hiện có trong dự án.
            </p>
          </div>
        </section>

        {/* 4. Final CTA Section */}
        <section
          id="cta"
          className="relative py-28 px-4 sm:px-6 lg:px-8 border-t border-[rgba(242,240,235,0.08)] bg-gradient-to-b from-[#0C0C0E] to-[#121215] text-center"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            <span className="text-xs uppercase tracking-[0.2em] text-[#C9A84C] font-semibold">
              Khởi đầu hành trình mới
            </span>
            <h2 className="landing-heading-chapter font-bold tracking-tight text-[#F2F0EB]">
              Giữ lại công thức. <br />
              <span className="text-[#C9A84C]">Tiếp tục sáng tạo.</span>
            </h2>
            <p className="landing-subheading max-w-2xl mx-auto text-[#9E9A90]">
              Từ bàn thử nghiệm của chuyên viên R&D đến quầy bar mọi cửa hàng trong chuỗi &mdash; RecipeHub là cầu nối giữ trọn vẹn giá trị từng hương vị.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#workspace"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-semibold tracking-wide bg-[#C9A84C] text-[#0C0C0E] hover:bg-[#DEBF64] transition-colors shadow-lg"
              >
                Khám phá giao diện đề xuất
              </a>
              <Link
                href="/platform"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-semibold tracking-wide bg-[rgba(242,240,235,0.06)] text-[#F2F0EB] hover:bg-[rgba(242,240,235,0.12)] border border-[rgba(242,240,235,0.15)] transition"
              >
                Xem nền tảng kỹ thuật &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 5. Minimalist Semantic Footer */}
      <footer className="border-t border-[rgba(242,240,235,0.08)] bg-[#0A0A0C] py-12 px-4 sm:px-6 lg:px-8 text-xs text-[#9E9A90]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <div className="font-bold text-sm text-[#F2F0EB] flex items-center justify-center sm:justify-start gap-1.5">
              <span>☕ RecipeHub</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[rgba(201,168,76,0.15)] text-[#C9A84C]">
                R&D System
              </span>
            </div>
            <p className="text-[11px] text-[#9E9A90]">
              Dự án môn học PRN232 &bull; PRM Semester 8 (FPT University)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="#story" className="hover:text-[#F2F0EB] transition">
              Hành trình
            </a>
            <a href="#workspace" className="hover:text-[#F2F0EB] transition">
              Không gian công thức
            </a>
            <Link href="/platform" className="hover:text-[#F2F0EB] transition">
              Nền tảng kỹ thuật
            </Link>
            <Link href="/admin" className="hover:text-[#F2F0EB] transition">
              Admin
            </Link>
            <Link href="/rnd" className="hover:text-[#F2F0EB] transition">
              R&D
            </Link>
            <Link href="/viewer" className="hover:text-[#F2F0EB] transition">
              Viewer
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[rgba(242,240,235,0.06)] text-center text-[11px] text-[#78756E] space-y-1">
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
