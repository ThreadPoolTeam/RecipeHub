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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 mb-1.5">
            <Package className="w-3.5 h-3.5" />
            <span>Media Storage &amp; Asset Lifecycle</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1917]">Quản trị Kho ảnh &amp; Đa phương tiện</h1>
          <p className="text-[#706E68] text-xs mt-1 max-w-2xl">
            Giám sát toàn bộ hình ảnh thực tế và ảnh mô phỏng AI. Truy vết liên kết tới từng bước công thức, phát hiện ảnh mồ côi và thử nghiệm cơ chế khôi phục lỗi xóa.
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
      <div className="p-4 bg-white border border-[#E8E2D9] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="space-y-1 text-[#1A1917]">
          <div className="font-semibold text-[#B47820] flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#B47820]" /> Hướng dẫn kiểm thử Khả năng Phục hồi:
          </div>
          <p className="text-[#706E68]">
            1. Vào <strong className="text-[#1A1917]">Cấu hình AI</strong> &rarr; Bật <em>"Mô phỏng lỗi xóa tệp Media"</em>.<br />
            2. Trở lại trang này, chọn xóa một ảnh chưa được gắn vào công thức (0 liên kết). Trạng thái ảnh sẽ chuyển thành <span className="text-rose-700 font-semibold">DeleteFailed</span>.<br />
            3. Quay lại tắt lỗi mô phỏng, sau đó bấm nút <strong className="text-[#1A1917]">"Thử xóa lại"</strong> để chứng minh hệ thống phục hồi và xóa thành công.
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
      <div className="bg-white border border-[#E8E2D9] rounded-xl p-4 sm:p-6 shadow-xs">
        <MediaLibrary mode="manage" allowDelete={false} />
      </div>
    </div>
  );
}
