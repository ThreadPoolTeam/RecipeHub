import Link from 'next/link';

const workspaces = [
  { href: '/rnd', image: '/landing/workspaces/rnd-lab.jpg', label: 'R&D' },
  { href: '/viewer', image: '/landing/workspaces/barista-sop.jpg', label: 'Barista SOP' },
  { href: '/admin', image: '/landing/workspaces/admin-management.jpg', label: 'Quản trị' },
  { href: '/platform', image: '/landing/workspaces/platform-architecture.jpg', label: 'Nền tảng kỹ thuật' },
];

export function LandingCategories() {
  return (
    <section id="workspace" className="scroll-mt-20 bg-background px-4 py-12 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1360px] space-y-8">
        <div className="space-y-3">
          <h2 className="font-display text-h2 font-medium text-foreground">Không gian làm việc</h2>
          <p className="max-w-3xl text-body-lg text-muted-foreground">Không gian làm việc số hoá kết nối các vai trò vận hành chuỗi: từ thử nghiệm công thức R&amp;D, chuẩn hoá quy trình quầy bar, đến quản trị tài khoản và hạ tầng kỹ thuật.</p>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {workspaces.map((workspace) => <Link key={workspace.href} href={workspace.href} className="group flex flex-col items-center gap-4 text-center text-sm font-semibold text-foreground hover:text-primary">
            <img src={workspace.image} alt="" className="aspect-square w-28 rounded-full object-cover sm:w-36" />
            {workspace.label}
          </Link>)}
        </div>
      </div>
    </section>
  );
}
