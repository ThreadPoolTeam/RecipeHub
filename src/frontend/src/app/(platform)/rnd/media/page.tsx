'use client';

import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { MediaLibrary } from '@/components/workspace/media-library';

export default function RndMediaPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-[#E2DDD2] pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[#1C1917] flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-[#B47820]" /> Kho Tư Liệu Hình Ảnh &amp; AI Concept
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C] mt-0.5">
          Quản lý hình ảnh thao tác SOP thực tế, ý tưởng concept do AI tạo và kiểm tra ràng buộc tham chiếu trước khi dọn dẹp.
        </p>
      </div>

      <MediaLibrary mode="manage" allowDelete={true} />
    </div>
  );
}
