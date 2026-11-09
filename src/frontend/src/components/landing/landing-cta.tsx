import Link from 'next/link';

export function LandingCta() {
  return (
    <section id="cta" className="scroll-mt-20 bg-background px-4 py-12 md:px-10 md:py-16">
      <div className="relative mx-auto max-w-[1360px] overflow-hidden rounded-2xl bg-ink">
        <img src="/landing/workspaces/barista-sop.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="relative max-w-2xl space-y-5 px-6 py-12 text-ink-foreground md:px-12 md:py-16">
          <h2 className="font-display text-h2 font-medium">Sẵn sàng chuẩn hóa từng ly?</h2>
          <p className="text-body-lg">Đăng nhập để mở không gian làm việc theo vai trò của bạn.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">Đăng nhập</Link>
            <a href="#workspace" className="rounded-md border border-ink-foreground px-5 py-3 text-sm font-semibold text-ink-foreground">Khám phá không gian làm việc</a>
          </div>
        </div>
      </div>
    </section>
  );
}
