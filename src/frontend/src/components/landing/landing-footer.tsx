import Link from 'next/link';
import { Coffee } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background px-4 py-10 text-xs text-muted-foreground md:px-10">
      <div className="mx-auto max-w-[1360px] space-y-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-display text-lg font-medium text-foreground"><Coffee className="h-5 w-5" strokeWidth={1.5} />RecipeHub</div>
            <p>Dự án môn học PRN232 &bull; PRM Semester 8 (FPT University)</p>
          </div>
          <nav aria-label="Điều hướng chân trang" className="flex flex-wrap items-start gap-5">
            <a href="#story" className="hover:text-foreground">Hành trình</a>
            <a href="#workspace" className="hover:text-foreground">Không gian làm việc</a>
            <a href="#features" className="hover:text-foreground">Tính năng</a>
            <Link href="/platform" className="hover:text-foreground">Nền tảng kỹ thuật</Link>
            <Link href="/login" className="hover:text-foreground">Đăng nhập</Link>
          </nav>
        </div>
        <div className="space-y-1 border-t border-border pt-6 text-center">
          <p>* Tư liệu hình ảnh TVC trích xuất minh họa từ thương hiệu Phê La nhằm mục đích học tập &amp; nghiên cứu kiến trúc hệ thống (PRN232/PRM). Không hàm ý quan hệ hợp tác hoặc đại diện thương mại.</p>
          <p>RecipeHub Microservices Architecture Foundation &copy; 2026. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
