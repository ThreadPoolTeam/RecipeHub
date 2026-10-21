'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Share2,
  Download,
  Award,
  Sparkles,
  BookOpen,
  Coffee,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Calendar,
  Layers,
  Check,
} from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion } from '@/lib/demo/types';
import { Button } from '@/components/workspace/fields';
import { StatusBadge } from '@/components/workspace/status-badge';

export default function ProfilePage() {
  const { session, currentUser, repo, dataVersion } = useDemo();
  const [recipes, setRecipes] = useState<RecipeVersion[]>([]);
  const [activityMode, setActivityMode] = useState<'daily' | 'weekly' | 'cumulative'>('daily');
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (session) {
      repo
        .getRecipes(session, { pageSize: 20 })
        .then((res) => {
          if (mounted) setRecipes(res.items);
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [session, repo, dataVersion]);

  const fullName = currentUser?.fullName || session?.fullName || 'Lê Chuyên Viên R&D';
  const email = session?.email || 'rd@recipehub.demo';
  const role = session?.role || 'rnd';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handlePrintPdf = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Generate 28-day activity matrix (4 weeks x 7 days)
  const activityDays = Array.from({ length: 35 }, (_, i) => {
    // Generate deterministic heat pattern
    const level = (i * 7 + 3) % 5;
    return { day: i + 1, level };
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
        <div className="text-xs text-[#706E68] font-medium">
          Hồ sơ Chuyên viên R&amp;D • RecipeHub Profile
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrintPdf}
            className="rounded-full gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Lưu PDF</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleShare}
            className="rounded-full gap-1.5 text-xs"
          >
            {copiedShare ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Đã sao chép link</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Chia sẻ hồ sơ</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Hero Profile Section (Image #5 style) */}
      <div className="flex flex-col items-center text-center space-y-4 pt-2">
        <div className="relative inline-flex items-center justify-center">
          {/* Main Avatar Circle */}
          <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#B47820] to-[#E5A84B] text-white flex items-center justify-center text-3xl font-extrabold shadow-md border-4 border-white">
            {initials || 'VM'}
          </div>

          {/* Decorative Chibi / Mascot Sticker (like Image #5) */}
          <div
            className="absolute -right-5 -bottom-2 w-14 h-14 bg-white rounded-full p-1.5 shadow-md border border-[#E8E2D9] flex items-center justify-center animate-bounce-subtle"
            title="Barista Mascot Sticker"
          >
            <svg
              className="w-10 h-10 text-[#B47820]"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Cute Chibi Coffee Cup / Mascot */}
              <circle cx="24" cy="24" r="20" fill="#FAF9F5" stroke="#B47820" strokeWidth="2.5" />
              <path
                d="M17 19c0 3.5 3 6.5 7 6.5s7-3 7-6.5"
                stroke="#1A1917"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="19" cy="16" r="2" fill="#1A1917" />
              <circle cx="29" cy="16" r="2" fill="#1A1917" />
              <path
                d="M16 28c2 2 5 3 8 3s6-1 8-3"
                stroke="#B47820"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M24 6v4M20 7v3M28 7v3"
                stroke="#B47820"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1917] tracking-tight">
            {fullName}
          </h1>
          <p className="text-xs sm:text-sm text-[#706E68] mt-1 font-mono">
            @{email.split('@')[0]} • {email}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF9F5] text-[#B47820] border border-[#B47820]/30 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {role === 'rnd'
                  ? 'R&D Specialist'
                  : role === 'viewer'
                  ? 'Barista Viewer'
                  : 'System Administrator'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Stat Pills Container (Image #5 style 4-column metric bar) */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E8E2D9]">
          <div className="text-center sm:px-2 pt-2 sm:pt-0">
            <div className="text-xl sm:text-2xl font-extrabold text-[#1A1917] font-mono">
              {recipes.length > 0 ? recipes.length : 12}
            </div>
            <div className="text-xs text-[#706E68] font-medium mt-0.5">Công thức R&amp;D</div>
          </div>
          <div className="text-center sm:px-2 pt-2 sm:pt-0">
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono">
              {recipes.filter((r) => r.status === 'Published').length || 8}
            </div>
            <div className="text-xs text-[#706E68] font-medium mt-0.5">SOP đã phát hành</div>
          </div>
          <div className="text-center sm:px-2 pt-2 sm:pt-0">
            <div className="text-xl sm:text-2xl font-extrabold text-[#B47820] font-mono">98.5%</div>
            <div className="text-xs text-[#706E68] font-medium mt-0.5">Định mức chuẩn hóa</div>
          </div>
          <div className="text-center sm:px-2 pt-2 sm:pt-0">
            <div className="text-xl sm:text-2xl font-extrabold text-amber-700 font-mono flex items-center justify-center gap-1">
              <Flame className="w-5 h-5 text-amber-600 animate-pulse" />
              <span>15 ngày</span>
            </div>
            <div className="text-xs text-[#706E68] font-medium mt-0.5">Chuỗi nghiên cứu</div>
          </div>
        </div>
      </div>

      {/* Showcase Section (Image #5 style Showcase cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1A1917]">Công thức Tiêu biểu (Showcase)</h2>
            <p className="text-xs text-[#706E68]">
              Các công thức pha chế tiêu biểu đã hoàn thiện định mức và quy trình SOP.
            </p>
          </div>
          <Link href="/rnd/recipes">
            <Button variant="ghost" size="sm" className="rounded-full text-xs text-[#B47820]">
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs hover:border-[#B47820] transition duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-[#B47820] bg-[#FAF9F5] px-2 py-0.5 rounded border border-[#B47820]/30">
                  REC-PHL-01
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Published
                </span>
              </div>
              <h3 className="font-bold text-sm text-[#1A1917]">Ô Long Sữa Phê La</h3>
              <p className="text-xs text-[#706E68] mt-1.5 leading-relaxed">
                Trà Ô Long đặc sản ủ lạnh 16h kết hợp sữa thanh trùng và trân châu ô long thủ công.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E8E2D9] flex items-center justify-between text-xs text-[#706E68]">
              <span>Dung tích: 500ml</span>
              <Link href="/rnd/recipes" className="text-[#B47820] font-semibold hover:underline">
                Mở SOP &rarr;
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs hover:border-[#B47820] transition duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-[#B47820] bg-[#FAF9F5] px-2 py-0.5 rounded border border-[#B47820]/30">
                  REC-CF-02
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Published
                </span>
              </div>
              <h3 className="font-bold text-sm text-[#1A1917]">Cà Phê Trứng Hà Nội</h3>
              <p className="text-xs text-[#706E68] mt-1.5 leading-relaxed">
                Cốt cà phê Robusta Đắk Lắk đậm đà phủ lớp kem trứng đánh bông béo ngậy truyền thống.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E8E2D9] flex items-center justify-between text-xs text-[#706E68]">
              <span>Dung tích: 250ml</span>
              <Link href="/rnd/recipes" className="text-[#B47820] font-semibold hover:underline">
                Mở SOP &rarr;
              </Link>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs hover:border-[#B47820] transition duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-[#B47820] bg-[#FAF9F5] px-2 py-0.5 rounded border border-[#B47820]/30">
                  REC-TEA-03
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  <Clock className="w-3 h-3" /> In Review
                </span>
              </div>
              <h3 className="font-bold text-sm text-[#1A1917]">Trà Nhài Mãng Cầu Tươi</h3>
              <p className="text-xs text-[#706E68] mt-1.5 leading-relaxed">
                Trà lài Tây Bắc thanh khiết dầm cùng thịt mãng cầu xiêm tươi và thạch nha đam giòn.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E8E2D9] flex items-center justify-between text-xs text-[#706E68]">
              <span>Dung tích: 600ml</span>
              <Link href="/rnd/recipes" className="text-[#B47820] font-semibold hover:underline">
                Mở SOP &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* R&D Activity Matrix (Image #5 style Token Activity heatmap) */}
      <div className="p-5 sm:p-6 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#1A1917]">
              Nhật ký Đóng góp &amp; Thẩm định (R&amp;D Activity)
            </h2>
            <p className="text-xs text-[#706E68]">
              Tần suất nghiên cứu công thức, điều chỉnh định mức và phát hành SOP theo thời gian.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-[#FAF9F5] p-1 rounded-full border border-[#E8E2D9]">
            <button
              type="button"
              onClick={() => setActivityMode('daily')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                activityMode === 'daily'
                  ? 'bg-white text-[#1A1917] shadow-xs'
                  : 'text-[#706E68] hover:text-[#1A1917]'
              }`}
            >
              Hàng ngày
            </button>
            <button
              type="button"
              onClick={() => setActivityMode('weekly')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                activityMode === 'weekly'
                  ? 'bg-white text-[#1A1917] shadow-xs'
                  : 'text-[#706E68] hover:text-[#1A1917]'
              }`}
            >
              Hàng tuần
            </button>
            <button
              type="button"
              onClick={() => setActivityMode('cumulative')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                activityMode === 'cumulative'
                  ? 'bg-white text-[#1A1917] shadow-xs'
                  : 'text-[#706E68] hover:text-[#1A1917]'
              }`}
            >
              Tích lũy
            </button>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pt-2 pb-1">
          <div className="min-w-[480px]">
            <div className="grid grid-flow-col grid-rows-5 gap-1.5">
              {activityDays.map((cell, idx) => {
                let cellColor = 'bg-[#FAF9F5] border border-[#E8E2D9]';
                if (cell.level === 1) cellColor = 'bg-[#F2E0C4] border border-[#E5CCA8]';
                if (cell.level === 2) cellColor = 'bg-[#DDB47D] border border-[#CBA065]';
                if (cell.level === 3) cellColor = 'bg-[#C99144] border border-[#B57F34]';
                if (cell.level === 4) cellColor = 'bg-[#B47820] border border-[#9A6416]';

                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-xs transition-all duration-150 hover:scale-125 cursor-pointer ${cellColor}`}
                    title={`Ngày ${cell.day}: ${cell.level * 3} hoạt động R&D`}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#706E68] mt-3 pt-2 border-t border-[#E8E2D9]">
              <span>T1</span>
              <span>T2</span>
              <span>T3</span>
              <span>T4</span>
              <span>T5</span>
              <span>T6</span>
              <span>T7</span>
              <span>T8</span>
              <span>T9</span>
              <span>T10</span>
              <span>T11</span>
              <span>T12</span>
              <div className="flex items-center gap-1.5 ml-4">
                <span>Ít</span>
                <span className="w-2.5 h-2.5 rounded-xs bg-[#FAF9F5] border border-[#E8E2D9]" />
                <span className="w-2.5 h-2.5 rounded-xs bg-[#F2E0C4]" />
                <span className="w-2.5 h-2.5 rounded-xs bg-[#DDB47D]" />
                <span className="w-2.5 h-2.5 rounded-xs bg-[#B47820]" />
                <span>Nhiều</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details & RBAC Scope */}
      <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-[#1A1917]">Thông tin Tài khoản &amp; Phân quyền RBAC</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9]">
            <span className="text-[#706E68]">Mã người dùng:</span>{' '}
            <span className="font-mono font-bold text-[#1A1917]">{session?.userId || 'user_rd'}</span>
          </div>
          <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9]">
            <span className="text-[#706E68]">Vai trò vận hành:</span>{' '}
            <span className="font-bold text-[#B47820] uppercase">{role} Specialist</span>
          </div>
          <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9]">
            <span className="text-[#706E68]">Phạm vi thao tác:</span>{' '}
            <span className="font-bold text-emerald-700">
              {role === 'rnd' ? 'Soạn thảo và phát hành công thức' : 'Theo vai trò tài khoản'}
            </span>
          </div>
          <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9]">
            <span className="text-[#706E68]">Lưu trữ phiên:</span>{' '}
            <span className="font-mono text-[#1A1917]">IndexedDB + Cookie Session</span>
          </div>
        </div>
      </div>
    </div>
  );
}
