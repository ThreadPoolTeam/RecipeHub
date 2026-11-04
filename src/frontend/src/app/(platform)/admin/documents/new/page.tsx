'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/workspace/fields';
import { PdfDocumentWorkspace } from '@/components/workspace/pdf-document-workspace';

function AdminNewDocumentContent() {
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1917] flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#B47820]" />
            Tạo ấn phẩm PDF mới
          </h1>
          <p className="text-[#706E68] text-sm mt-1">
            Chọn công thức nguồn đã hoàn thiện, xem trước bản in A4 ngang và phát hành tài liệu PDF.
          </p>
        </div>

        <Link href="/admin/documents">
          <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-[#706E68] hover:text-[#1A1917]">
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </Button>
        </Link>
      </div>

      <PdfDocumentWorkspace initialSelectedItems={initialSelectedItems} returnUrl="/admin/documents" />
    </div>
  );
}

export default function AdminNewDocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-[#706E68]">
          <div className="w-8 h-8 border-2 border-[#B47820] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Đang tải...</p>
        </div>
      }
    >
      <AdminNewDocumentContent />
    </Suspense>
  );
}
