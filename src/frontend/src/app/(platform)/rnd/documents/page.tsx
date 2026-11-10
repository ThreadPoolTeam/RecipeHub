'use client';

import { pageTitleClass } from '@/components/workspace/page-header';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/workspace/fields';
import { PdfDocumentHistory } from '@/components/workspace/pdf-document-history';
import { useDemo } from '@/lib/demo/provider';

function RndDocumentsPageContent() {
  const { session } = useDemo();

  return (
    <div className="mx-auto space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">PDF</p>
          <h1 className={pageTitleClass}>Kho tài liệu PDF</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Xem lại, tải xuống các bộ công thức đã xuất hoặc tạo ấn phẩm mới.
          </p>
        </div>

        <Link href="/rnd/documents/new">
          <Button variant="primary">Tạo ấn phẩm</Button>
        </Link>
      </div>

      <PdfDocumentHistory actorId={session?.userId || null} />
    </div>
  );
}

export default function RndDocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-muted-foreground">
          <div className="mx-auto mb-3 h-8 w-8 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin" />
          <p className="text-xs">Đang tải...</p>
        </div>
      }
    >
      <RndDocumentsPageContent />
    </Suspense>
  );
}
