'use client';

import React from 'react';
import Link from 'next/link';
import { HelpCircle, BookOpen, CheckSquare, Sparkles, Coffee, ArrowRight, ShieldCheck, FileText, Users, Activity } from 'lucide-react';
import { Button } from '@/components/workspace/fields';
import { useDemo } from '@/lib/demo/provider';

const adminGuides = [
  {
    icon: Users,
    iconColor: 'text-[#B47820]',
    title: '1. Tài khoản & Quyền',
    description: 'Tạo tài khoản, đổi vai trò, đặt lại mật khẩu, khóa hoặc mở khóa người dùng. Khóa tài khoản sẽ thu hồi mọi phiên đăng nhập.',
    href: '/admin/users',
    linkLabel: 'Mở quản lý tài khoản',
  },
  {
    icon: Activity,
    iconColor: 'text-emerald-700',
    title: '2. Giám sát hệ thống',
    description: 'Theo dõi tình trạng các dịch vụ, kết nối cơ sở dữ liệu và công cụ vận hành như Grafana, pgAdmin.',
    href: '/admin/system',
    linkLabel: 'Mở giám sát hệ thống',
  },
  {
    icon: ShieldCheck,
    iconColor: 'text-sky-700',
    title: '3. Nhật ký Audit',
    description: 'Tra cứu lịch sử thao tác quan trọng: ai làm gì, vào lúc nào, trên đối tượng nào.',
    href: '/admin/logs',
    linkLabel: 'Mở nhật ký Audit',
  },
];

function AdminHelp() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="pb-4 border-b border-[#E8E2D9]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#B47820]/10 text-[#B47820] border border-[#B47820]/20 mb-2">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Trung tâm Hướng dẫn Quản trị</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1917]">Cẩm nang Quản trị RecipeHub</h1>
        <p className="text-xs text-[#706E68] mt-1">
          Quản trị viên phụ trách tài khoản, giám sát hệ thống và nhật ký Audit. Dữ liệu công thức do bộ phận R&amp;D quản lý.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adminGuides.map((guide) => (
          <div key={guide.href} className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-3">
            <div className={`w-10 h-10 rounded-xl bg-[#FAF9F5] border border-[#E8E2D9] flex items-center justify-center ${guide.iconColor}`}>
              <guide.icon className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-[#1A1917]">{guide.title}</h2>
            <p className="text-xs text-[#706E68] leading-relaxed">{guide.description}</p>
            <Link href={guide.href} className="inline-flex items-center gap-1 text-xs font-semibold text-[#B47820] hover:underline pt-2">
              {guide.linkLabel} &rarr;
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HelpPage() {
  const { session } = useDemo();
  if (session?.role === 'admin') return <AdminHelp />;

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
          <h2 className="text-base font-bold text-[#1A1917]">2. Phát hành SOP</h2>
          <p className="text-xs text-[#706E68] leading-relaxed">
            Chuyên viên R&amp;D kiểm tra công thức hoàn thiện rồi phát hành trực tiếp để phục vụ quầy Barista.
          </p>
          <Link href="/rnd/recipes" className="inline-flex items-center gap-1 text-xs font-semibold text-[#B47820] hover:underline pt-2">
            Mở danh mục công thức &rarr;
          </Link>
        </div>

        <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF9F5] border border-[#E8E2D9] flex items-center justify-center text-sky-700">
            <Coffee className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#1A1917]">3. Tra cứu SOP Barista</h2>
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
