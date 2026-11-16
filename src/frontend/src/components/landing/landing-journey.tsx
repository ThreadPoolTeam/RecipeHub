import { LandingReveal } from './landing-reveal';

const steps = [
  { title: 'Soạn bản nháp', description: 'Ghi nguyên liệu và định lượng.' },
  { title: 'Phát hành phiên bản', description: 'Đưa công thức đến đội ngũ.' },
  { title: 'Xuất tài liệu PDF', description: 'Tạo sổ tay dùng tại quầy.' },
  { title: 'Đào tạo & kiểm tra', description: 'Ôn tập qua bài kiểm tra ngắn.' },
];

export function LandingJourney() {
  return (
    <section id="story" className="bg-secondary px-4 py-12 md:px-10 md:py-20">
      <div className="mx-auto max-w-[1280px]">
        <h2 className="font-display text-h2 font-medium text-foreground">Hành trình công thức</h2>
        <LandingReveal pendingClassName={'landing-motion-railPending'} className="relative mt-10 grid gap-6 pl-8 md:grid-cols-4 md:pl-0">
          <div aria-hidden="true" className={`landing-motion-rail bottom-0 left-0 top-0 w-0.5 md:bottom-auto md:right-0 md:top-[50px] md:h-0.5 md:w-auto`} />
          {steps.map((step, index) => (
            <LandingReveal key={step.title} delay={index * 60}>
              <article>
                <span className="font-display text-[32px] font-medium leading-10 text-destructive tabular-nums md:text-[40px] md:leading-[48px]">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 font-display text-card-title font-medium md:mt-8">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              </article>
            </LandingReveal>
          ))}
        </LandingReveal>
      </div>
    </section>
  );
}
