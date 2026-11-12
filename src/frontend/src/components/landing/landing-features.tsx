import { ArrowRight } from 'lucide-react';
import { LandingReveal } from './landing-reveal';

const roles = [
  { name: 'Đội R&D', description: 'Soạn, phát hành · Quản lý nguyên liệu và đơn vị đo' },
  { name: 'Barista', description: 'Xem sổ tay · Làm bài kiểm tra' },
  { name: 'Quản trị', description: 'Phân quyền · Xem nhật ký hoạt động' },
];

export function LandingFeatures() {
  return (
    <section id="features" className="px-4 py-12 md:px-10 md:py-20">
      <div className="mx-auto grid max-w-[1280px] gap-8 md:grid-cols-[1fr_2fr] md:gap-12">
        <h2 className="font-display text-h2 font-medium text-foreground">Cùng một công thức,<br />cùng một chuẩn.</h2>
        <div className="border-t border-border">
          {roles.map((role, index) => (
            <LandingReveal key={role.name} delay={index * 60}>
              <article tabIndex={0} className={`landing-motion-roleRow grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 border-b border-border px-2 py-6 md:grid-cols-[1fr_2fr_auto]`}>
                <h3 className="font-display text-card-title font-medium">{role.name}</h3>
                <p className="col-start-1 row-start-2 text-sm text-muted-foreground md:col-auto md:row-auto">{role.description}</p>
                <ArrowRight aria-hidden="true" className={`landing-motion-roleArrow col-start-2 row-span-2 row-start-1 h-4 w-4 md:col-auto md:row-auto`} strokeWidth={1.5} />
              </article>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
