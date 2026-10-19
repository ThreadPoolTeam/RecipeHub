'use client';

import React from 'react';
import Link from 'next/link';
import { HelpCircle, BookOpen, CheckSquare, Sparkles, Coffee, ArrowRight, ShieldCheck, FileText } from 'lucide-react';
import { Button } from '@/components/workspace/fields';

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="pb-4 border-b border-[#E8E2D9]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#B47820]/10 text-[#B47820] border border-[#B47820]/20 mb-2">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Trung tâm Hướng dẫn R&amp;D</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1917]">Cẩm nang Vận hành RecipeHub BeverageLab</h1>
        <p className="text-xs text-[#706E68] mt-1">
          Tài liệu quy chuẩn về vòng đời công thức, kiểm định định mức và xuất bản SOP quầy pha chế.
        </p>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF9F5] border border-[#E8E2D9] flex items-center justify-center text-[#B47820]">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#1A1917]">1. Soạn thảo &amp; R&amp;D Công thức</h2>
          <p className="text-xs text-[#706E68] leading-relaxed">
            Tạo bản nháp công thức, phân nhóm đồ uống, xác định đơn vị đo lường (ml, g, shot), nhiệt độ phục vụ và các bước thực hiện tuần tự.
          </p>
          <Link href="/rnd/recipes" className="inline-flex items-center gap-1 text-xs font-semibold text-[#B47820] hover:underline pt-2">
            Xem danh mục công thức &rarr;
          </Link>
        </div>

        <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF9F5] border border-[#E8E2D9] flex items-center justify-center text-emerald-700">
            <CheckSquare className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#1A1917]">2. Quy trình Phê duyệt SOP</h2>
          <p className="text-xs text-[#706E68] leading-relaxed">
            Chuyên viên R&amp;D có quyền tự thẩm định và phê duyệt phiên bản công thức hoàn thiện để chuyển trạng thái sang Approved phục vụ quầy Barista.
          </p>
          <Link href="/approvals" className="inline-flex items-center gap-1 text-xs font-semibold text-[#B47820] hover:underline pt-2">
            Mở hàng chờ phê duyệt &rarr;
          </Link>
        </div>

        <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF9F5] border border-[#E8E2D9] flex items-center justify-center text-sky-700">
            <Coffee className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#1A1917]">3. Tra cứu SOP Barista (Viewer)</h2>
          <p className="text-xs text-[#706E68] leading-relaxed">
            Giao diện tinh gọn dành cho nhân viên pha chế tại quầy: tra cứu nhanh tỷ lệ thành phần, thời gian đánh sữa và hướng dẫn chiết xuất.
          </p>
          <Link href="/viewer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#B47820] hover:underline pt-2">
            Trang tra cứu SOP &rarr;
          </Link>
        </div>

        <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF9F5] border border-[#E8E2D9] flex items-center justify-center text-purple-700">
            <FileText className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#1A1917]">4. Xuất bản Tài liệu PDF SOP</h2>
          <p className="text-xs text-[#706E68] leading-relaxed">
            Hỗ trợ xuất bản tài liệu chuẩn hóa dạng PDF in màu để cấp phát cho hệ thống chi nhánh và đào tạo Barista chuỗi cửa hàng.
          </p>
          <Link href="/rnd/recipes" className="inline-flex items-center gap-1 text-xs font-semibold text-[#B47820] hover:underline pt-2">
            Khám phá tài liệu SOP &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
