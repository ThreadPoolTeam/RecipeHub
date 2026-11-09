'use client';

import { listAuditLogs } from '@/lib/api/audit';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Activity,
  ShieldCheck,
  Database,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';

export default function AdminPage() {
  const { repo, dataVersion } = useDemo();
  const [userCount, setUserCount] = useState(0);
  const [auditStatus, setAuditStatus] = useState<{ loading: boolean; error: boolean; count: number }>({
    loading: true,
    error: false,
    count: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      try {
        const users = await repo.getUsers();
        if (mounted) {
          setUserCount(users.length);
        }

        try {
          const auditRes = await listAuditLogs({ page: 1, pageSize: 1 });
          if (mounted) {
            setAuditStatus({ loading: false, error: false, count: auditRes.totalCount });
          }
        } catch {
          if (mounted) {
            setAuditStatus({ loading: false, error: true, count: 0 });
          }
        }
      } catch {
        // fallback
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStats();
    return () => {
      mounted = false;
    };
  }, [repo, dataVersion]);

  const cards = [
    {
      title: 'Quản lý Tài khoản & Phân quyền',
      desc: 'Quản lý danh sách người dùng (Admin, R&D, Barista Viewer), cấp vai trò, đổi mật khẩu và khóa/mở khóa phiên đăng nhập.',
      href: '/admin/users',
      icon: Users,
      count: `${userCount} người dùng`,
      tag: 'Identity & RBAC',
    },
    {
      title: 'Giám sát Hệ thống & Xử lý Sự cố',
      desc: 'Kiểm tra sức khỏe thời gian thực của 5 Microservices qua YARP Gateway, độ trễ kết nối 5 CSDL PostgreSQL và luồng sự kiện.',
      href: '/admin/system',
      icon: Activity,
      count: 'Xem trạng thái dịch vụ',
      tag: 'System Health',
    },
    {
      title: 'Nhật ký kiểm toán',
      desc: 'Truy vết toàn diện mọi thay đổi dữ liệu trong hệ thống: tạo/sửa/phát hành công thức, quản trị tài khoản và bài kiểm tra.',
      href: '/admin/logs',
      icon: ShieldCheck,
      count: auditStatus.loading ? '...' : auditStatus.error ? 'Không tải được' : `${auditStatus.count} sự kiện ghi nhận`,
      tag: 'Audit Logs',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Quản trị</p>
          <h1 className="font-display text-3xl font-medium text-foreground sm:text-4xl">Trung tâm quản trị &amp; giám sát</h1>
          <p className="mt-2 text-sm text-muted-foreground">Quản lý tài khoản, theo dõi dịch vụ và hoạt động hệ thống.</p>
        </div>
        <Link href="/admin/users" className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-ink-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          Quản lý tài khoản
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group flex flex-col justify-between rounded-lg border border-border bg-card p-5 shadow-soft hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="mt-3 font-display text-2xl text-foreground tabular-nums">{loading ? '...' : card.count}</p>
              </div>
              <card.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{card.desc}</p>
            <span className="mt-4 text-sm font-semibold text-foreground">Xem chi tiết</span>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="mb-4 font-display text-xl font-medium text-foreground">Công cụ hạ tầng &amp; cơ sở dữ liệu</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 shadow-soft hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BarChart3 className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <span className="flex-1"><span className="block font-semibold text-foreground">Grafana Observability Dashboard</span><span className="mt-1 block text-sm text-muted-foreground">Mở trang giám sát tại cổng 3001</span></span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </a>
          <a href="http://localhost:5050" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 shadow-soft hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Database className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <span className="flex-1"><span className="block font-semibold text-foreground">pgAdmin 4 PostgreSQL Manager</span><span className="mt-1 block text-sm text-muted-foreground">Mở trang quản trị tại cổng 5050</span></span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </a>
        </div>
      </section>
    </div>
  );
}
