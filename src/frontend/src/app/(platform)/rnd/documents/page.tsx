'use client';

import { PageHeader } from '@/components/workspace/page-header';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/workspace/fields';
import { PdfDocumentHistory } from '@/components/workspace/pdf-document-history';
import { useDemo } from '@/lib/demo/provider';

function RndDocumentsPageContent() {
  const { session } = useDemo();

  return (
    <div className="mx-auto space-y-6">
      <PageHeader
        eyebrow="Tài liệu & Đào tạo"
        title="Tài liệu PDF"
        description="Xem, tải các ấn phẩm đã xuất hoặc tạo ấn phẩm mới."
        actions={<Link href="/rnd/documents/new"><Button variant="primary">Tạo ấn phẩm</Button></Link>}
      />

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
