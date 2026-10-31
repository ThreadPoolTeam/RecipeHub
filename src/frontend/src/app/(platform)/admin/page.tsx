'use client';

import { listAuditLogs } from '@/lib/api/audit';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Leaf,
  ShieldCheck,
  Image,
  ArrowRight,
} from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Button } from '@/components/workspace/fields';
export default function AdminPage() {
  const { repo, dataVersion } = useDemo();
  const [stats, setStats] = useState({
    userCount: 0,
    activeIngredientsCount: 0,
    totalIngredientsCount: 0,
    mediaCount: 0,
    recipeCount: 0,
  });
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
        const [users, ingredients, media, recipes] = await Promise.all([
          repo.getUsers(),
          repo.getIngredients('', 'all', false),
          repo.getMedia(),
          repo.getRecipes({ role: 'admin', userId: 'admin', email: 'admin@recipehub.demo', fullName: 'Administrator', lastActiveAt: Date.now() }),
        ]);

        if (mounted) {
          setStats({
            userCount: users.length,
            activeIngredientsCount: ingredients.filter((i) => i.isActive).length,
            totalIngredientsCount: ingredients.length,
            mediaCount: media.length,
            recipeCount: recipes.total,
          });
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
        // demo stats fallback
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
      title: 'Quản lý người dùng',
      desc: 'Phân quyền tài khoản Demo (Admin, R&D, Viewer) và giới hạn công thức được phép tra cứu.',
      href: '/admin/users',
      icon: Users,
      count: `${stats.userCount} người dùng`,
      tag: 'Identity & RBAC',
    },
    {
      title: 'Danh mục nguyên liệu & Đơn vị',
      desc: 'Quản lý kho nguyên liệu dùng chung, nhóm nguyên liệu, quy chuẩn đơn vị đo và đơn giá định mức.',
      href: '/admin/catalogue',
      icon: Leaf,
      count: `${stats.activeIngredientsCount}/${stats.totalIngredientsCount} đang kích hoạt`,
      tag: 'Global Catalogue',
    },
    {
      title: 'Nhật ký kiểm toán',
      desc: 'Truy vết toàn diện mọi hành động: tạo, sửa, phát hành công thức, khóa tài khoản và xuất bản tài liệu.',
      href: '/admin/logs',
      icon: ShieldCheck,
      count: auditStatus.loading ? '...' : auditStatus.error ? 'Không tải được' : `${auditStatus.count} sự kiện ghi nhận`,
      tag: 'Audit Logs',
    },
    {
      title: 'Quản trị kho ảnh đa phương tiện',
      desc: 'Kiểm tra ảnh đính kèm theo bước SOP, giải phóng ảnh không liên kết và xử lý ảnh xóa thất bại.',
      href: '/admin/media',
      icon: Image,
      count: `${stats.mediaCount} tệp media`,
      tag: 'Media Storage',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1917] flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-[#B47820]" />
            Hệ thống Quản trị &amp; Điều phối Trung tâm
          </h1>
          <p className="text-[#706E68] text-sm mt-1 max-w-2xl">
            Giám sát nhân sự, danh mục nguyên vật liệu, cơ chế mô phỏng AI và lịch sử thay đổi phiên bản công thức theo tiêu chuẩn BeverageLab.
          </p>
        </div>
      </div>

      {/* Main Navigation Modules */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#706E68] mb-3">Phân hệ Quản trị Chức năng</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  Mở module &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
