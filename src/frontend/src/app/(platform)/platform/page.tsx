import Link from 'next/link';
import { ArrowRight, BookOpen, GraduationCap, ShieldCheck } from 'lucide-react';

export default async function PlatformOverviewPage() {
  const gatewayUrl = process.env.GATEWAY_INTERNAL_URL || 'http://localhost:5000';
  let gatewayStatus = 'Unknown (Local / Offline)';

  try {
    const res = await fetch(`${gatewayUrl}/health/live`, { cache: 'no-store' });
    if (res.ok) {
      gatewayStatus = 'Connected (Healthy)';
    } else {
      gatewayStatus = `Degraded (HTTP ${res.status})`;
    }
  } catch {
    gatewayStatus = 'Unavailable / Disconnected';
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nền tảng</p>
        <h1 className="font-display text-3xl font-medium text-foreground sm:text-[40px] sm:leading-[48px]">Chào mừng trở lại</h1>
        <p className="text-sm text-muted-foreground">Chọn khu vực làm việc của bạn.</p>
      </header>

      <div className="grid gap-5 md:grid-cols-3">
        {[
          { href: '/rnd', icon: BookOpen, role: 'R&D', title: 'Không gian R&D', description: 'Công thức, nguyên liệu, đơn vị, tài liệu, quiz' },
          { href: '/viewer', icon: GraduationCap, role: 'Barista', title: 'Sổ tay cửa hàng', description: 'Tra cứu công thức đã phát hành và làm bài kiểm tra' },
          { href: '/admin', icon: ShieldCheck, role: 'Quản trị', title: 'Trung tâm quản trị', description: 'Tài khoản, giám sát hệ thống, nhật ký' },
        ].map(({ href, icon: Icon, role, title, description }) => (
          <div key={href} className="flex flex-col rounded-lg border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <Icon aria-hidden="true" className="h-6 w-6 text-primary" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground">{role}</span>
            </div>
            <h2 className="mt-8 font-display text-xl font-medium text-foreground">{title}</h2>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{description}</p>
            <Link href={href} aria-label={`Mở ${title}`} className="mt-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-foreground hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
              Mở <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
            </Link>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Gateway Status: {gatewayStatus}</p>
    </div>
  );
}
