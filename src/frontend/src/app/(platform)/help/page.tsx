'use client';

import { pageTitleClass } from '@/components/workspace/page-header';

import React from 'react';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { Accordion } from '@/components/workspace/accordion';
import { useDemo } from '@/lib/demo/provider';

const adminGuides = [
  {
    title: '1. Tài khoản & Quyền',
    description: 'Tạo tài khoản, đổi vai trò, đặt lại mật khẩu, khóa hoặc mở khóa người dùng. Khóa tài khoản sẽ thu hồi mọi phiên đăng nhập.',
    href: '/admin/users',
    linkLabel: 'Mở quản lý tài khoản',
  },
  {
    title: '2. Giám sát hệ thống',
    description: 'Theo dõi tình trạng các dịch vụ, kết nối cơ sở dữ liệu và công cụ vận hành như Grafana, pgAdmin.',
    href: '/admin/system',
    linkLabel: 'Mở giám sát hệ thống',
  },
  {
    title: '3. Nhật ký hoạt động',
    description: 'Tra cứu lịch sử thao tác quan trọng: ai làm gì, vào lúc nào, trên đối tượng nào.',
    href: '/admin/logs',
    linkLabel: 'Mở nhật ký hoạt động',
  },
];

const guides = [
  {
    title: '1. Soạn thảo & R&D Công thức',
    description: 'Tạo bản nháp công thức, phân nhóm đồ uống, xác định đơn vị đo lường (ml, g, shot), nhiệt độ phục vụ và các bước thực hiện tuần tự.',
    href: '/rnd/recipes',
    linkLabel: 'Xem danh mục công thức',
  },
  {
    title: '2. Phát hành SOP',
    description: 'Chuyên viên R&D kiểm tra công thức hoàn thiện rồi phát hành trực tiếp để phục vụ quầy Barista.',
    href: '/rnd/recipes',
    linkLabel: 'Mở danh mục công thức',
  },
  {
    title: '3. Tra cứu SOP Barista',
    description: 'Giao diện tinh gọn dành cho nhân viên pha chế tại quầy: tra cứu nhanh tỷ lệ thành phần, thời gian đánh sữa và hướng dẫn chiết xuất.',
    href: '/viewer',
    linkLabel: 'Trang tra cứu SOP',
  },
  {
    title: '4. Xuất bản Tài liệu PDF SOP',
    description: 'Hỗ trợ xuất bản tài liệu chuẩn hóa dạng PDF in màu để cấp phát cho hệ thống chi nhánh và đào tạo Barista chuỗi cửa hàng.',
    href: '/rnd/recipes',
    linkLabel: 'Khám phá tài liệu SOP',
  },
];

export default function HelpPage() {
  const { session } = useDemo();
  const isAdmin = session?.role === 'admin';
  const description = isAdmin
    ? 'Quản trị viên phụ trách tài khoản, giám sát hệ thống và nhật ký hoạt động. Dữ liệu công thức do bộ phận R&D quản lý.'
    : 'Tài liệu quy chuẩn về vòng đời công thức, kiểm định định mức và xuất bản SOP quầy pha chế.';

  return (
    <div className="space-y-8 pb-12">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{isAdmin ? 'Trung tâm Hướng dẫn Quản trị' : 'Trung tâm Hướng dẫn R&D'}</p>
        <h1 className={pageTitleClass}>{isAdmin ? 'Cẩm nang Quản trị RecipeHub' : 'Cẩm nang Vận hành RecipeHub BeverageLab'}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(240px,1fr)]">
        <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <h2 className="mb-4 text-lg font-medium text-card-foreground font-display">Hướng dẫn</h2>
          <div className="space-y-3">
            {(isAdmin ? adminGuides : guides).map((guide) => (
              <Accordion key={guide.title} title={guide.title} open>
                <p>{guide.description}</p>
                <Link href={guide.href} className="mt-3 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {guide.linkLabel} &rarr;
                </Link>
              </Accordion>
            ))}
          </div>
        </section>
        <aside className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <HelpCircle className="h-6 w-6 text-primary" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="mt-4 text-lg font-medium text-card-foreground font-display">{isAdmin ? 'Trung tâm Hướng dẫn Quản trị' : 'Trung tâm Hướng dẫn R&D'}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </aside>
      </div>
    </div>
  );
}
