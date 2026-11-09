import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const workspaces = [
  { href: '/rnd', image: '/landing/workspaces/rnd-lab.jpg', alt: 'Phòng Lab Nghiên cứu & Phát triển R&D', title: 'Nghiên cứu & Thử nghiệm Công thức', description: 'Thiết lập tỷ lệ thành phần nguyên liệu, định lượng gram/ml chuẩn xác và kiểm soát lịch sử phiên bản công thức.', action: 'Vào không gian R&D' },
  { href: '/viewer', image: '/landing/workspaces/barista-sop.jpg', alt: 'Barista pha chế tại quầy bar', title: 'Tra cứu Quy trình Pha chế (SOP)', description: 'Hướng dẫn thao tác quầy bar từng bước, định mức đá/đường và checklist thao tác phục vụ đồng nhất chất lượng toàn chuỗi.', action: 'Mở Barista SOP' },
  { href: '/admin', image: '/landing/workspaces/admin-management.jpg', alt: 'Bảng điều khiển quản trị hệ thống', title: 'Bảng điều khiển Quản trị & Phân quyền', description: 'Quản lý tài khoản, phân quyền người dùng theo vai trò (RBAC), giám sát hệ thống và truy vết nhật ký Audit Log bảo mật.', action: 'Vào trang Quản trị' },
  { href: '/platform', image: '/landing/workspaces/platform-architecture.jpg', alt: 'Hạ tầng kỹ thuật .NET 8 Microservices', title: 'Kiến trúc Nền tảng & YARP Gateway', description: 'Giám sát trạng thái microservices Clean Architecture, định tuyến YARP Gateway, hợp đồng gRPC và phân tán Redis Streams.', action: 'Khám phá Nền tảng Kỹ thuật' },
];

export function LandingFeatured() {
  return (
    <section className="bg-background px-4 py-12 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1360px] space-y-8">
        <h2 className="font-display text-h2 font-medium text-foreground">Câu chuyện ấy có một nơi để lưu giữ.</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {workspaces.map((workspace) => <article key={workspace.href} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft">
            <img src={workspace.image} alt={workspace.alt} className="aspect-[4/3] w-full object-cover" />
            <div className="flex flex-1 flex-col gap-4 p-5">
              <h3 className="font-display text-card-title font-medium text-card-foreground">{workspace.title}</h3>
              <p className="flex-1 text-sm leading-6 text-muted-foreground">{workspace.description}</p>
              <Link href={workspace.href} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{workspace.action}<ArrowRight className="h-4 w-4" strokeWidth={1.5} /></Link>
            </div>
          </article>)}
        </div>
        <p className="text-xs text-muted-foreground">Hình ảnh minh họa định hướng phân hệ.</p>
      </div>
    </section>
  );
}
