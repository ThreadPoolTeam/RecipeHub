'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/workspace/fields';
import { PdfDocumentWorkspace } from '@/components/workspace/pdf-document-workspace';

function RndNewDocumentContent() {
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
    <div className="mx-auto space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">PDF · Ấn phẩm mới</p>
          <h1 className="text-3xl font-medium text-foreground sm:text-4xl">Xuất bộ công thức PDF</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Chọn công thức, xem trước trang A4 ngang rồi xuất bản nháp hoặc bản chính thức.
          </p>
        </div>

        <Link href="/rnd/documents">
          <Button variant="primary" size="sm">Quay lại kho</Button>
        </Link>
      </div>

      <PdfDocumentWorkspace initialSelectedItems={initialSelectedItems} returnUrl="/rnd/documents" />
    </div>
  );
}

export default function RndNewDocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-muted-foreground">
          <div className="mx-auto mb-3 h-8 w-8 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin" />
          <p className="text-xs">Đang tải...</p>
        </div>
      }
    >
      <RndNewDocumentContent />
    </Suspense>
  );
}
