import { BookOpen, ShieldCheck, Sparkles } from 'lucide-react';

const features = [
  { icon: BookOpen, title: 'Biên tập & Quản lý Phiên bản', description: 'Định lượng thành phần theo gram/ml, nhiệt độ ủ trà và các bước pha chế SOP. Truy vết lịch sử chỉnh sửa rõ ràng.' },
  { icon: Sparkles, title: 'Ảnh Nháp AI & Thư Viện Media', description: 'Khảo sát concept hình ảnh sản phẩm với nhãn phân định minh bạch giữa ảnh nháp tạo bởi AI và ảnh chụp thực tế tại quầy bar.' },
  { icon: ShieldCheck, title: 'Phát hành & Phân quyền', description: 'Chuyên viên R&D hoàn thiện rồi phát hành công thức trực tiếp; quyền truy cập SOP vẫn được kiểm soát theo vai trò.' },
];

export function LandingFeatures() {
  return (
    <section id="features" className="scroll-mt-20 bg-background px-4 py-12 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1360px] space-y-8">
        <h2 className="font-display text-h2 font-medium text-foreground">Chuẩn mực vận hành từ ý tưởng đến quầy bar.</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => <article key={title} className="space-y-4 rounded-lg border border-border bg-secondary p-6">
            <Icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            <h3 className="font-display text-card-title font-medium text-foreground">{title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </article>)}
        </div>
      </div>
    </section>
  );
}
