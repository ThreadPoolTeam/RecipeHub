'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileText, Shield } from 'lucide-react';
import { PdfDocumentWorkspace } from '@/components/workspace/pdf-document-workspace';

function AdminDocumentsPageContent() {
  const searchParams = useSearchParams();
  const recipeId = searchParams.get('recipeId');
  const versionId = searchParams.get('versionId');
  const recipesParam = searchParams.get('recipes');

  const initialSelectedItems = React.useMemo(() => {
    if (recipeId && versionId) {
      return [{ recipeId, recipeVersionId: versionId }];
    }
    if (recipesParam) {
      const ids = recipesParam.split(',').map((s) => s.trim()).filter(Boolean);
      return ids.map((id) => ({ recipeId: id, recipeVersionId: id }));
    }
    return [];
  }, [recipeId, versionId, recipesParam]);
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E2D9] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#706E68] mb-1">
            <span>Quản Trị Hệ Thống</span>
            <span>/</span>
            <span className="font-semibold text-[#1A1917]">Quản Lý Ấn Phẩm PDF</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1917] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#B47820]" /> Quản Lý &amp; Phát Hành Tài Liệu SOP
          </h1>
          <p className="text-xs text-[#706E68] mt-1">
            Kiểm tra và phát hành ấn phẩm chính thức từ các công thức đã hoàn thiện, quản lý kho lưu trữ tài liệu kỹ thuật.
          </p>
        </div>
      </div>

      <PdfDocumentWorkspace initialSelectedItems={initialSelectedItems} />
    </div>
  );
}

export default function AdminDocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-[#706E68]">
          <div className="w-8 h-8 border-2 border-[#B47820] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Đang tải không gian tài liệu quản trị...</p>
        </div>
      }
    >
      <AdminDocumentsPageContent />
    </Suspense>
  );
}
