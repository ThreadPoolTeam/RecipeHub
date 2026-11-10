import Image from 'next/image';
import Link from 'next/link';

export function LandingCta() {
  return (
    <section id="cta" className="px-4 pb-24 md:px-10">
      <div className="relative mx-auto flex min-h-[280px] max-w-[1280px] items-center overflow-hidden rounded-2xl bg-ink">
        <Image src="/landing/figma/cta-banner-raw.jpg" alt="" fill sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, color-mix(in srgb, var(--color-ink) 80%, transparent), color-mix(in srgb, var(--color-ink) 50%, transparent), transparent)' }} />
        <div className="relative max-w-2xl space-y-4 px-6 py-12 text-ink-foreground md:px-14">
          <h2 className="font-display text-h2 font-medium md:text-4xl">Sẵn sàng chuẩn hóa từng ly?</h2>
          <p className="text-body-lg">Đăng nhập để mở không gian làm việc theo vai trò của bạn.</p>
          <Link href="/login" className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Đăng nhập</Link>
        </div>
      </div>
    </section>
  );
}
