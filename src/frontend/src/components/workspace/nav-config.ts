import { Activity, Award, BookOpen, FileText, FlaskConical, GraduationCap, Image, LayoutDashboard, Package, Settings, Users } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Activity;
  options?: { exact?: boolean; exclude?: string[] };
};

export const navConfig: Record<string, NavItem[]> = {
  rnd: [
    { href: '/rnd', label: 'Tổng quan R&D', icon: LayoutDashboard, options: { exact: true } },
    { href: '/rnd/recipes', label: 'Công thức đồ uống', icon: BookOpen },
    { href: '/rnd/ingredients', label: 'Kho nguyên liệu', icon: FlaskConical },
    { href: '/rnd/catalogue', label: 'Đại lượng & Đơn vị đo', icon: Package },
    { href: '/rnd/media', label: 'Tư liệu hình ảnh', icon: Image },
    { href: '/rnd/documents', label: 'Tài liệu PDF', icon: FileText },
    { href: '/rnd/quizzes', label: 'Bộ Quiz', icon: GraduationCap, options: { exclude: ['/rnd/quizzes/results'] } },
    { href: '/rnd/quizzes/results', label: 'Kết quả làm bài', icon: Award },
  ],
  viewer: [
    { href: '/viewer', label: 'Tra cứu SOP đồ uống', icon: BookOpen, options: { exclude: ['/viewer/quizzes'] } },
    { href: '/viewer/quizzes', label: 'Bài kiểm tra', icon: GraduationCap, options: { exclude: ['/viewer/quizzes/history'] } },
    { href: '/viewer/quizzes/history', label: 'Lịch sử làm bài', icon: Award },
  ],
  admin: [
    { href: '/admin', label: 'Tổng quan Admin', icon: Settings, options: { exact: true } },
    { href: '/admin/users', label: 'Tài khoản & Quyền', icon: Users },
    { href: '/admin/system', label: 'Giám sát hệ thống', icon: Activity },
    { href: '/admin/logs', label: 'Nhật ký Audit Logs', icon: FileText },
  ],
};

export type NavProps = {
  items: NavItem[];
  isLinkActive: (path: string, options?: NavItem['options']) => boolean;
  onNavClick: (href: string, event: React.MouseEvent) => void;
};
