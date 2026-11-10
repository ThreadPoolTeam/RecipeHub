import Link from 'next/link';

export function LandingHero() {
  return (
    <section className="bg-background px-4 py-16 md:px-10 md:py-24">
      <div className="mx-auto grid max-w-[1360px] items-center gap-10 md:grid-cols-2 md:gap-16">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Beverage R&amp;D Platform</p>
          <h1 className="max-w-xl font-display text-4xl font-medium leading-tight text-foreground md:text-hero">Mọi ly đồ uống, đúng chuẩn ở mọi quầy.</h1>
          <p className="max-w-xl text-body-lg text-muted-foreground">RecipeHub giúp đội R&amp;D soạn và phát hành công thức, xuất tài liệu PDF, và đào tạo barista bằng bài kiểm tra ngắn.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">Đăng nhập</Link>
            <a href="#workspace" className="rounded-md border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-control hover:bg-accent">Khám phá không gian làm việc</a>
          </div>
        </div>
        <img src="/landing/workspaces/barista-sop.jpg" alt="Barista pha chế tại quầy bar" className="aspect-[4/3] w-full rounded-2xl object-cover" />
      </div>
    </section>
  );
}
