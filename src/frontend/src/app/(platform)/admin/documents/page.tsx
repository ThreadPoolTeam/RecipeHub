'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Button } from '@/components/workspace/fields';
import { PdfDocumentHistory } from '@/components/workspace/pdf-document-history';
import { useDemo } from '@/lib/demo/provider';

function AdminDocumentsPageContent() {
  const { session } = useDemo();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1917] flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#B47820]" />
            Tài liệu PDF
          </h1>
          <p className="text-[#706E68] text-sm mt-1">
            Quản lý và xuất bản tài liệu SOP công thức đồ uống chuẩn lưu hành nội bộ.
          </p>
        </div>

        <Link href="/admin/documents/new">
          <Button variant="gold">+ Xuất tài liệu mới</Button>
        </Link>
      </div>

      <PdfDocumentHistory actorId={session?.userId || null} />
    </div>
  );
}

export default function AdminDocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-[#706E68]">
          <div className="w-8 h-8 border-2 border-[#B47820] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Đang tải...</p>
        </div>
      }
    >
      <AdminDocumentsPageContent />
    </Suspense>
  );
}
