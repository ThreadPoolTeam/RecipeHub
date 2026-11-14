'use client';

import React from 'react';
import { MediaLibrary } from '@/components/workspace/media-library';
import { PageHeader } from '@/components/workspace/page-header';

export default function RndMediaPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Nguyên liệu & Tư liệu" title="Tư liệu hình ảnh"
        description="Xem ảnh dùng cho công thức, nguyên liệu và tài liệu PDF." />

      <MediaLibrary mode="manage" allowDelete={false} />
    </div>
  );
}
