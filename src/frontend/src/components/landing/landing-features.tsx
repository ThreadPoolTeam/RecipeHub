import { BookOpen, GraduationCap, Users } from 'lucide-react';

const features = [
  { icon: BookOpen, title: 'R&D công thức', description: 'Soạn bản nháp, quản lý phiên bản, nhân mẻ và phát hành.' },
  { icon: GraduationCap, title: 'Đào tạo barista', description: 'Bài kiểm tra theo công thức, chấm điểm và lịch sử.' },
  { icon: Users, title: 'Quản trị an toàn', description: 'Phân quyền theo vai trò, giám sát và nhật ký hoạt động.' },
];

export function LandingFeatures() {
  return (
    <section id="features" className="px-4 pb-20 md:px-10 md:pb-[84px]">
      <div className="mx-auto grid max-w-[1280px] items-stretch gap-6 md:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <article key={title} className="space-y-3 rounded-2xl border border-border bg-secondary p-7 shadow-soft">
            <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <h3 className="font-display text-card-title font-medium text-foreground">{title}</h3>
            <p className="text-sm leading-5 text-muted-foreground">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
