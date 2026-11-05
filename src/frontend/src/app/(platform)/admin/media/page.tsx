'use client';

import React from 'react';
import { MediaLibrary } from '@/components/workspace/media-library';
import { ImageIcon } from 'lucide-react';

export default function AdminMediaPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1917] flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-[#B47820]" />
            Quản trị Kho ảnh &amp; Đa phương tiện
          </h1>
          <p className="text-[#706E68] text-sm mt-1 max-w-2xl">
            Giám sát toàn bộ hình ảnh thực tế và ảnh mô phỏng AI. Truy vết liên kết tới từng bước công thức, phát hiện ảnh mồ côi và thử nghiệm cơ chế khôi phục lỗi xóa.
          </p>
        </div>
      </div>


      {/* Media Library Full Component */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 sm:p-6 shadow-xs">
        <MediaLibrary mode="manage" allowDelete={false} />
      </div>
    </div>
  );
}
