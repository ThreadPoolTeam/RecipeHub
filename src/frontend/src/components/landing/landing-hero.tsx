import Image from 'next/image';
import Link from 'next/link';
import { StatusBadge } from '@/components/workspace/status-badge';

export function LandingHero() {
  return (
    <section className="px-4 pb-20 pt-10 md:px-10">
      <div className="mx-auto grid max-w-[1280px] items-center gap-10 md:min-h-[540px] md:grid-cols-2 md:gap-0">
        <div className="space-y-6 md:pr-12">
          <p className="text-[11px] font-medium uppercase tracking-[.06em] text-primary">Beverage R&amp;D Platform</p>
          <h1 className="max-w-xl font-display text-4xl font-medium leading-tight text-foreground md:text-hero">Mọi ly đồ uống, đúng chuẩn ở mọi quầy.</h1>
          <p className="max-w-[520px] text-body-lg text-muted-foreground">RecipeHub giúp đội R&amp;D soạn và phát hành công thức, xuất tài liệu PDF, và đào tạo barista bằng bài kiểm tra ngắn.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login" className={`landing-motion-button inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}>Bắt đầu</Link>
            <Link href="/viewer" className={`landing-motion-button inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}>Xem sổ tay công thức</Link>
          </div>
        </div>
        <div className="relative pb-12 md:h-[540px] md:pb-0">
          <Image src="/landing/figma/hero-main.jpg" alt="Ba ly đồ uống tại quầy" width={560} height={440} priority className="ml-auto aspect-[14/11] w-[87.5%] rounded-2xl rounded-tr-[40px] object-cover" />
          <div className="absolute bottom-0 left-0 flex max-w-full items-center gap-3 rounded-lg bg-card p-2.5 shadow-lift md:bottom-[84px] md:w-[353px]">
            <Image src="/landing/figma/tile-ca-phe-sua-da.jpg" alt="" width={56} height={56} className="h-14 w-14 rounded-md object-cover" />
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">CF-001 · Cà phê sữa đá</p><p className="text-xs text-muted-foreground">Phiên bản v3</p></div>
            <StatusBadge status="Published" dot />
          </div>
        </div>
      </div>
    </section>
  );
}
