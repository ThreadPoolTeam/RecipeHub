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
      count: '5 Microservices · 5 DBs',
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1917] flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-[#B47820]" />
            Trung Tâm Quản Trị &amp; Giám Sát Hệ Thống
          </h1>
          <p className="text-[#706E68] text-sm mt-1 max-w-2xl">
            Quản lý tài khoản nhân sự, giám sát tình trạng vận hành 5 Microservices, xử lý sự cố hạ tầng và kiểm toán bảo mật.
          </p>
        </div>
      </div>

      {/* Main Navigation Modules */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#706E68] mb-3">Phân hệ Quản trị Trọng tâm</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group p-5 bg-white hover:bg-[#FAF9F5] border border-[#E8E2D9] hover:border-[#B47820] rounded-2xl transition duration-200 flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="p-2.5 bg-[#FAF9F5] text-[#B47820] rounded-lg border border-[#E8E2D9] group-hover:scale-105 transition flex items-center justify-center">
                    <card.icon className="w-5 h-5" />
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FAF9F5] text-[#706E68] border border-[#E8E2D9]">
                    {card.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#1A1917] group-hover:text-[#B47820] transition">
                  {card.title}
                </h3>
                <p className="text-xs text-[#706E68] mt-1.5 leading-relaxed">
                  {card.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#E8E2D9] flex items-center justify-between text-xs font-medium">
                <span className="text-[#706E68] font-mono">{loading ? '...' : card.count}</span>
                <span className="text-[#B47820] flex items-center gap-1 group-hover:translate-x-1 transition duration-150">
                  Mở phân hệ &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Infrastructure & DB Tools */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#706E68] mb-3">
          Công cụ Hạ tầng &amp; Cơ sở dữ liệu (Docker)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 bg-white hover:bg-[#FAF9F5] border border-[#E8E2D9] hover:border-[#B47820] rounded-2xl transition flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-3.5">
              <span className="p-2.5 bg-[#FAF9F5] text-[#B47820] rounded-lg border border-[#E8E2D9]">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <div className="text-sm font-bold text-[#1A1917] group-hover:text-[#B47820] transition">
                  Grafana Observability Dashboard (Cổng 3001)
                </div>
                <div className="text-xs text-[#706E68] mt-0.5">
                  Biểu đồ thống kê trực tiếp từ 5 PostgreSQL datasources đã cấu hình sẵn.
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-[#B47820] shrink-0" />
          </a>

          <a
            href="http://localhost:5050"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 bg-white hover:bg-[#FAF9F5] border border-[#E8E2D9] hover:border-[#B47820] rounded-2xl transition flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-3.5">
              <span className="p-2.5 bg-[#FAF9F5] text-[#B47820] rounded-lg border border-[#E8E2D9]">
                <Database className="w-5 h-5" />
              </span>
              <div>
                <div className="text-sm font-bold text-[#1A1917] group-hover:text-[#B47820] transition">
                  pgAdmin 4 PostgreSQL Manager (Cổng 5050)
                </div>
                <div className="text-xs text-[#706E68] mt-0.5">
                  Trình quản lý CSDL trực quan nạp sẵn cấu hình 5 database-per-service.
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-[#B47820] shrink-0" />
          </a>
        </div>
      </div>
    </div>
  );
}
