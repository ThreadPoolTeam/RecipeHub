'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Package, Settings, Info } from 'lucide-react';
import { MediaLibrary } from '@/components/workspace/media-library';
import { Button } from '@/components/workspace/fields';

export default function AdminMediaPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-sky-950/60 text-sky-300 border border-sky-800/80 mb-1.5">
            <Package className="w-3.5 h-3.5" />
            <span>Media Storage &amp; Asset Lifecycle</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F2F0EB]">Quản trị Kho ảnh & Đa phương tiện</h1>
          <p className="text-zinc-400 text-xs mt-1 max-w-2xl">
            Giám sát toàn bộ hình ảnh thực tế (Real SOP) và ảnh mô phỏng AI (AI Concept). Truy vết liên kết tới từng bước công thức, phát hiện ảnh mồ côi và thử nghiệm cơ chế khôi phục lỗi xóa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/ai-settings">
            <Button variant="secondary" size="sm">
              <Settings className="w-3.5 h-3.5 mr-1" /> Kiểm tra Cờ lỗi xóa ảnh
            </Button>
          </Link>
        </div>
      </div>

      {/* Guide Card */}
      <div className="p-4 bg-[#18181C] border border-zinc-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="space-y-1 text-zinc-300">
          <div className="font-semibold text-[#DEBF64] flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#B47820]" /> Hướng dẫn kiểm thử Khả năng Phục hồi (Delete Resilience Demo):
          </div>
          <p className="text-zinc-400">
            1. Vào <strong className="text-zinc-200">Cấu hình AI</strong> &rarr; Bật <em>"Mô phỏng lỗi xóa tệp Media"</em>.<br />
            2. Trở lại trang này, chọn xóa một ảnh chưa được gắn vào công thức (0 liên kết). Trạng thái ảnh sẽ chuyển thành <span className="text-rose-400 font-semibold">DeleteFailed</span>.<br />
            3. Quay lại tắt lỗi mô phỏng, sau đó bấm nút <strong className="text-zinc-200">"Thử xóa lại"</strong> để chứng minh hệ thống phục hồi và xóa thành công.
          </p>
        </div>
        <div className="shrink-0">
          <Link href="/admin/ai-settings">
            <Button variant="gold" size="sm">
              Mở Simulation Settings &rarr;
            </Button>
          </Link>
        </div>
      </div>

      {/* Media Library Full Component */}
      <div className="bg-[#141418] border border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm">
        <MediaLibrary mode="manage" allowDelete={true} />
      </div>
    </div>
  );
}
