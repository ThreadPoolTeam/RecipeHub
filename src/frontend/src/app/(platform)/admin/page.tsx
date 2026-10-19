'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Leaf,
  Cpu,
  ShieldCheck,
  Image,
  Settings,
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
    auditCount: 0,
    mediaCount: 0,
    recipeCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      try {
        const [users, ingredients, logs, media, recipes] = await Promise.all([
          repo.getUsers(),
          repo.getIngredients('', 'all', false),
          repo.getAuditLogs(),
          repo.getMedia(),
          repo.getRecipes({ role: 'admin', userId: 'admin', email: 'admin@recipehub.demo', fullName: 'Administrator', canApprove: true, lastActiveAt: Date.now() }),
        ]);

        if (mounted) {
          setStats({
            userCount: users.length,
            activeIngredientsCount: ingredients.filter((i) => i.isActive).length,
            totalIngredientsCount: ingredients.length,
            auditCount: logs.length,
            mediaCount: media.length,
            recipeCount: recipes.total,
          });
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
      desc: 'Phân quyền tài khoản Demo (Admin, R&D, Viewer), thiết lập quyền phê duyệt và giới hạn công thức.',
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
      title: 'Cấu hình & Mô phỏng AI Demo',
      desc: 'Kiểm soát bộ mô phỏng Gemini / Flux, công tắc lỗi giả lập (503 Service Unavailable, DeleteFailed), idle timeout.',
      href: '/admin/ai-settings',
      icon: Cpu,
      count: 'Simulation Controls',
      tag: 'AI Simulation',
    },
    {
      title: 'Nhật ký kiểm toán (Audit Trail)',
      desc: 'Truy vết toàn diện mọi hành động: tạo/sửa công thức, phê duyệt SOP, khóa tài khoản, xuất bản tài liệu.',
      href: '/admin/logs',
      icon: ShieldCheck,
      count: `${stats.auditCount} sự kiện ghi nhận`,
      tag: 'Audit Logs',
    },
    {
      title: 'Quản trị kho ảnh đa phương tiện',
      desc: 'Kiểm tra ảnh đính kèm theo bước SOP, giải phóng ảnh mồ côi (unreferenced) và xử lý ảnh xóa thất bại.',
      href: '/admin/media',
      icon: Image,
      count: `${stats.mediaCount} tệp media`,
      tag: 'Media Storage',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 bg-white rounded-xl border border-[#E8E2D9] shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs font-semibold bg-[#B47820]/15 text-[#B47820] border border-[#B47820]/30 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#B47820] animate-pulse" />
              Bảng điều khiển Quản trị viên Toàn quyền
            </div>
            <h1 className="text-2xl font-bold text-[#1A1917]">Hệ thống Quản trị &amp; Điều phối Trung tâm</h1>
            <p className="text-[#706E68] text-sm mt-1 max-w-2xl">
              Giám sát nhân sự, danh mục nguyên vật liệu, cơ chế mô phỏng AI và lịch sử thay đổi phiên bản công thức theo tiêu chuẩn BeverageLab.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/ai-settings">
              <Button variant="gold" size="sm">
                <Settings className="w-3.5 h-3.5 mr-1" /> Cấu hình AI &amp; Lỗi giả lập
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-[#E8E2D9]">
          <div className="bg-[#FAF9F5] border border-[#E8E2D9] rounded-lg p-3">
            <div className="text-xs text-[#706E68] font-medium">Tài khoản nhân sự</div>
            <div className="text-xl font-bold text-[#1A1917] mt-1">{loading ? '...' : stats.userCount}</div>
          </div>
          <div className="bg-[#FAF9F5] border border-[#E8E2D9] rounded-lg p-3">
            <div className="text-xs text-[#706E68] font-medium">Nguyên liệu khả dụng</div>
            <div className="text-xl font-bold text-emerald-700 mt-1">{loading ? '...' : `${stats.activeIngredientsCount}`}</div>
          </div>
          <div className="bg-[#FAF9F5] border border-[#E8E2D9] rounded-lg p-3">
            <div className="text-xs text-[#706E68] font-medium">Phiên bản công thức</div>
            <div className="text-xl font-bold text-[#B47820] mt-1">{loading ? '...' : stats.recipeCount}</div>
          </div>
          <div className="bg-[#FAF9F5] border border-[#E8E2D9] rounded-lg p-3">
            <div className="text-xs text-[#706E68] font-medium">Tệp Media lưu trữ</div>
            <div className="text-xl font-bold text-sky-700 mt-1">{loading ? '...' : stats.mediaCount}</div>
          </div>
          <div className="bg-[#FAF9F5] border border-[#E8E2D9] rounded-lg p-3">
            <div className="text-xs text-[#706E68] font-medium">Sự kiện Audit Log</div>
            <div className="text-xl font-bold text-purple-700 mt-1">{loading ? '...' : stats.auditCount}</div>
          </div>
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
              className="group p-5 bg-white hover:bg-[#FAF9F5] border border-[#E8E2D9] hover:border-[#B47820] rounded-xl transition duration-200 flex flex-col justify-between shadow-xs"
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
