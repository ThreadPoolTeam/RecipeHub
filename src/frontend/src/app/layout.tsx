import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RecipeHub — Không gian Quản lý & Phát triển Công thức Đồ uống',
  description: 'Hành trình từ lá trà mộc, trân châu ô long đến hệ thống chuẩn hoá công thức R&D chuỗi đồ uống chuyên nghiệp.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="scroll-smooth">
      <body className="antialiased min-h-screen bg-[#0C0C0E] text-[#F2F0EB]">
        {children}
      </body>
    </html>
  );
}
