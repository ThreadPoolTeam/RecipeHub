'use client';

import { FileText } from 'lucide-react';
import type { PdfDocumentSummaryResponse } from '@/lib/api/pdf-document-types';
import { Button } from './fields';
import { Pagination } from './pagination';

interface PdfDocumentCardsProps {
  documents: PdfDocumentSummaryResponse[];
  loading: boolean;
  page: number;
  totalCount: number;
  pageSize: number;
  downloadingId: string | null;
  onPageChange: (page: number) => void;
  onView: (document: PdfDocumentSummaryResponse) => void;
  onDownload: (document: PdfDocumentSummaryResponse) => void;
  formatFileSize: (bytes?: number | null) => string;
}

export function PdfDocumentCards({ documents, loading, page, totalCount, pageSize, downloadingId, onPageChange, onView, onDownload, formatFileSize }: PdfDocumentCardsProps) {
  if (loading) return <div className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">Đang tải tài liệu...</div>;
  if (!documents.length) return <div className="rounded-lg border border-border bg-card p-12 text-center"><h2 className="font-medium text-foreground">Chưa có tài liệu PDF nào</h2><p className="mt-2 text-sm text-muted-foreground">Hãy tạo ấn phẩm mới để lưu vào kho.</p></div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-2">
        {documents.map((item) => (
          <article key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft sm:flex-row">
            <div className="flex min-h-32 items-center justify-center bg-secondary p-8 text-muted-foreground sm:w-2/5" aria-hidden="true"><FileText className="h-12 w-12" strokeWidth={1.5} /></div>
            <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${item.documentType === 'published' ? 'bg-success-soft text-success' : 'bg-info-soft text-info'}`}>{item.documentType === 'published' ? 'Chính thức' : 'Bản nháp'}</span>
                <span className="text-xs text-muted-foreground">{item.state === 'ready' ? 'Sẵn sàng' : item.state === 'failed' ? 'Thất bại' : 'Đang xử lý'}</span>
              </div>
              <h2 className="break-words text-lg font-medium text-foreground">{item.title}</h2>
              <p className="text-xs text-muted-foreground">{item.exportScope === 'collection' ? `Bộ sưu tập (${item.itemCount} món)` : 'Công thức đơn'}{item.byteSize && item.byteSize > 0 ? ` · ${formatFileSize(item.byteSize)}` : ''}</p>
              <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString('vi-VN')} · {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => onView(item)} disabled={item.state !== 'ready'}>Xem</Button>
                <Button variant="primary" size="sm" onClick={() => onDownload(item)} isLoading={downloadingId === item.id} disabled={item.state !== 'ready'}>Tải PDF</Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Hiển thị {documents.length} tài liệu · Tổng {totalCount}</span>
        <Pagination page={page} totalPages={Math.ceil(totalCount / pageSize) || 1} onPageChange={onPageChange} />
      </div>
    </div>
  );
}
