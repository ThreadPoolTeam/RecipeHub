'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  PdfDocumentSummaryResponse,
  PdfDocumentResponse,
  DocumentType,
  DocumentState,
  HistoryFilterParams,
} from '@/lib/api/pdf-document-types';
import {
  getPdfDocuments,
  getPdfDocumentDetail,
  downloadPdfDocumentFile,
} from '@/lib/api/pdf-documents';
import { Button, Select, SearchInput, Alert } from './fields';
import { DataTable } from './data-table';
import { Dialog } from './dialog';
import { PdfDocumentPreview } from './pdf-document-preview';

interface PdfDocumentHistoryProps {
  actorId?: string | null;
  refreshKey?: number;
}

export function PdfDocumentHistory({
  actorId = null,
  refreshKey = 0,
}: PdfDocumentHistoryProps) {
  const [documents, setDocuments] = useState<PdfDocumentSummaryResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filters
  const [search, setSearch] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType | 'all'>('all');
  const [state, setState] = useState<DocumentState | 'all'>('all');

  // Preview Modal
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docDetail, setDocDetail] = useState<PdfDocumentResponse | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFileName, setPreviewFileName] = useState('document.pdf');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Download Action State
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(
    async (currentPage = page) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const filters: HistoryFilterParams = {
          page: currentPage,
          pageSize,
        };
        if (search.trim()) filters.search = search.trim();
        if (documentType !== 'all') filters.documentType = documentType;
        if (state !== 'all') filters.state = state;

        const data = await getPdfDocuments(filters, actorId);
        setDocuments(data.items || []);
        setTotalCount(data.totalCount || 0);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tải danh sách tài liệu';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    },
    [actorId, search, documentType, state, page, pageSize]
  );

  useEffect(() => {
    fetchDocuments(page);
  }, [fetchDocuments, page, refreshKey]);

  const handleViewPdf = async (doc: PdfDocumentSummaryResponse) => {
    setSelectedDocId(doc.id);
    setIsPreviewOpen(true);
    setIsLoadingPreview(true);
    setPreviewError(null);
    setPreviewBlob(null);
    setDocDetail(null);
    setPreviewFileName(doc.fileName || `${doc.title}.pdf`);

    try {
      const [detail, fileResult] = await Promise.all([
        getPdfDocumentDetail(doc.id, actorId),
        downloadPdfDocumentFile(doc.id, 'inline', actorId),
      ]);
      setDocDetail(detail);
      setPreviewBlob(fileResult.blob);
      if (fileResult.fileName) setPreviewFileName(fileResult.fileName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể nạp tệp PDF để xem';
      setPreviewError(msg);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDownloadFile = async (doc: PdfDocumentSummaryResponse) => {
    setDownloadingId(doc.id);
    try {
      const { blob, fileName } = await downloadPdfDocumentFile(doc.id, 'attachment', actorId);
      const name = fileName || doc.fileName || `${doc.title}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tải tệp PDF thất bại';
      alert(msg);
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes?: number | null): string => {
    if (!bytes || bytes <= 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const columns = [
    {
      header: 'Tài liệu',
      render: (item: PdfDocumentSummaryResponse) => (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => handleViewPdf(item)}
            disabled={item.state !== 'ready'}
            className="font-semibold text-[#1A1917] text-sm flex items-center gap-2 hover:text-[#B47820] transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Nhấn để xem trực tiếp tài liệu PDF"
          >
            <FileText className="w-4 h-4 text-[#B47820] shrink-0 group-hover:scale-110 transition-transform" />
            <span className="group-hover:underline">{item.title}</span>
          </button>
          <div className="text-xs text-[#706E68]">
            {item.exportScope === 'collection'
              ? `Bộ sưu tập (${item.itemCount} món)`
              : 'Công thức đơn'}
          </div>
        </div>
      ),
    },
    {
      header: 'Phân loại',
      render: (item: PdfDocumentSummaryResponse) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            item.documentType === 'published'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {item.documentType === 'published' ? 'Chính thức' : 'Bản nháp'}
        </span>
      ),
    },
    {
      header: 'Trạng thái',
      render: (item: PdfDocumentSummaryResponse) => {
        if (item.state === 'ready') {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sẵn sàng
            </span>
          );
        }
        if (item.state === 'failed') {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600" /> Thất bại
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium">
            <Clock className="w-4 h-4 animate-spin text-amber-600" /> Đang xử lý
          </span>
        );
      },
    },
    {
      header: 'Thời gian tạo',
      render: (item: PdfDocumentSummaryResponse) => (
        <div className="text-xs text-[#706E68] space-y-0.5">
          <div className="text-[#1A1917] font-medium">
            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
          </div>
          <div className="text-[11px] text-[#8C887F]">
            {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {item.byteSize && item.byteSize > 0 && ` • ${formatFileSize(item.byteSize)}`}
          </div>
        </div>
      ),
    },
    {
      header: 'Thao tác',
      className: 'text-right',
      render: (item: PdfDocumentSummaryResponse) => (
        <div className="flex items-center justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleDownloadFile(item)}
            isLoading={downloadingId === item.id}
            disabled={item.state !== 'ready'}
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Tải xuống
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {errorMsg && (
        <Alert variant="error" title="Lỗi">
          {errorMsg}
        </Alert>
      )}

      {/* Reactive Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          <SearchInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên tài liệu..."
            onClear={() => {
              setSearch('');
              setPage(1);
            }}
          />
        </div>

        <div className="w-40">
          <Select
            value={documentType}
            onChange={(e) => {
              setDocumentType(e.target.value as DocumentType | 'all');
              setPage(1);
            }}
          >
            <option value="all">Mọi loại</option>
            <option value="published">Chính thức</option>
            <option value="draft">Bản nháp</option>
          </Select>
        </div>
      </div>

      {/* Documents Table */}
      <DataTable
        columns={columns}
        data={documents}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        emptyTitle="Chưa có tài liệu PDF nào"
        emptyMessage="Hãy bấm nút '+ Xuất tài liệu mới' ở góc trên để tạo ấn phẩm SOP."
        pagination={{
          page,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize) || 1,
          onPageChange: (newPage) => setPage(newPage),
        }}
      />

      {/* Preview Modal */}
      <Dialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={docDetail?.title || previewFileName}
        maxWidth="5xl"
      >
        <div className="space-y-4">
          <div className="h-[600px] border border-[#E8E2D9] rounded-xl overflow-hidden bg-[#FAF9F5]">
            <PdfDocumentPreview
              blob={previewBlob}
              fileName={previewFileName}
              isLoading={isLoadingPreview}
              error={previewError}
              isSavedHistory={true}
              onRefreshPreview={
                selectedDocId
                  ? async () => {
                      const found = documents.find((d) => d.id === selectedDocId);
                      if (found) await handleViewPdf(found);
                    }
                  : undefined
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E2D9]">
            {selectedDocId && (
              <Button
                variant="gold"
                size="md"
                onClick={async () => {
                  const found = documents.find((d) => d.id === selectedDocId);
                  if (found) await handleDownloadFile(found);
                }}
                isLoading={downloadingId === selectedDocId}
              >
                <Download className="w-4 h-4 mr-1.5" /> Tải tệp PDF
              </Button>
            )}
            <Button variant="secondary" size="md" onClick={() => setIsPreviewOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
