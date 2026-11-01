'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  File,
} from 'lucide-react';
import {
  getPdfDocuments,
  getPdfDocumentDetail,
  downloadPdfDocumentFile,
} from '@/lib/api/pdf-documents';
import {
  PdfDocumentSummaryResponse,
  PdfDocumentResponse,
  DocumentType,
  ExportScope,
  DocumentState,
  HistoryFilterParams,
} from '@/lib/api/pdf-document-types';
import { DataTable } from './data-table';
import { Button, TextInput, Select, SearchInput, Alert } from './fields';
import { Dialog } from './dialog';
import { PdfDocumentPreview } from './pdf-document-preview';

interface PdfDocumentHistoryProps {
  actorId?: string | null;
  refreshKey?: number;
}

export function PdfDocumentHistory({ actorId = null, refreshKey = 0 }: PdfDocumentHistoryProps) {
  const [documents, setDocuments] = useState<PdfDocumentSummaryResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType | 'all'>('all');
  const [exportScope, setExportScope] = useState<ExportScope | 'all'>('all');
  const [state, setState] = useState<DocumentState | 'all'>('all');
  const [fromUtc, setFromUtc] = useState('');
  const [toUtc, setToUtc] = useState('');

  // Detail Modal / Preview State
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docDetail, setDocDetail] = useState<PdfDocumentResponse | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFileName, setPreviewFileName] = useState('document.pdf');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Download Action State
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchHistory = useCallback(
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
        if (exportScope !== 'all') filters.exportScope = exportScope;
        if (state !== 'all') filters.state = state;
        if (fromUtc) filters.fromUtc = new Date(fromUtc).toISOString();
        if (toUtc) filters.toUtc = new Date(toUtc).toISOString();

        const data = await getPdfDocuments(filters, actorId);
        setDocuments(data.items || []);
        setTotalCount(data.totalCount || 0);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tải lịch sử xuất PDF';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    },
    [actorId, search, documentType, exportScope, state, fromUtc, toUtc, page, pageSize]
  );

  useEffect(() => {
    fetchHistory(page);
  }, [fetchHistory, page, refreshKey]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory(1);
  };

  const handleResetFilter = () => {
    setSearch('');
    setDocumentType('all');
    setExportScope('all');
    setState('all');
    setFromUtc('');
    setToUtc('');
    setPage(1);
  };

  const handleViewPdf = async (doc: PdfDocumentSummaryResponse) => {
    setSelectedDocId(doc.id);
    setIsPreviewOpen(true);
    setIsLoadingPreview(true);
    setPreviewError(null);
    setPreviewBlob(null);
    setDocDetail(null);
    setPreviewFileName(doc.fileName || `document-${doc.id.slice(0, 8)}.pdf`);

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
      const name = fileName || doc.fileName || `recipe-doc-${doc.id.slice(0, 8)}.pdf`;
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

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const columns = [
    {
      header: 'Tài liệu / Tiêu đề',
      render: (item: PdfDocumentSummaryResponse) => (
        <div className="space-y-0.5 max-w-xs sm:max-w-md">
          <div className="font-semibold text-[#1A1917] text-sm truncate flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#B47820] shrink-0" />
            <span title={item.title}>{item.title}</span>
          </div>
          <div className="text-xs text-[#706E68] font-mono truncate" title={item.fileName}>
            {item.fileName}
          </div>
        </div>
      ),
    },
    {
      header: 'Phân loại',
      render: (item: PdfDocumentSummaryResponse) => (
        <div className="flex flex-col gap-1 items-start text-xs">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
              item.documentType === 'published'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {item.documentType === 'published' ? 'Chính thức' : 'Bản nháp'}
          </span>
          <span className="text-[11px] text-[#706E68] flex items-center gap-1">
            {item.exportScope === 'collection' ? (
              <>
                <Layers className="w-3 h-3 text-[#B47820]" /> Bộ sưu tập ({item.itemCount} món)
              </>
            ) : (
              <>
                <File className="w-3 h-3 text-[#706E68]" /> Đơn lẻ
              </>
            )}
          </span>
        </div>
      ),
    },
    {
      header: 'Trạng thái',
      render: (item: PdfDocumentSummaryResponse) => {
        if (item.state === 'ready') {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sẵn sàng
            </span>
          );
        }
        if (item.state === 'failed') {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              <AlertCircle className="w-3.5 h-3.5" /> Thất bại
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Đang xử lý
          </span>
        );
      },
    },
    {
      header: 'Dung lượng / Ngày tạo',
      render: (item: PdfDocumentSummaryResponse) => (
        <div className="text-xs text-[#706E68] space-y-0.5">
          <div className="font-mono text-[#1A1917]">{formatFileSize(item.byteSize)}</div>
          <div>{new Date(item.createdAt).toLocaleString('vi-VN')}</div>
          {item.createdByUserId && (
            <div className="text-[11px] text-[#8C887F]" title={`ID: ${item.createdByUserId}`}>
              Bởi: {item.createdByUserId.slice(0, 8)}...
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Thao tác',
      render: (item: PdfDocumentSummaryResponse) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewPdf(item)}
            title="Xem trực quan PDF"
            disabled={item.state !== 'ready'}
          >
            <Eye className="w-3.5 h-3.5 mr-1 text-[#B47820]" /> Xem PDF
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleDownloadFile(item)}
            isLoading={downloadingId === item.id}
            disabled={item.state !== 'ready'}
            title="Tải tệp PDF từ bộ lưu trữ xác thực"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Tải xuống
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {errorMsg && (
        <Alert variant="error" title="Lỗi tải lịch sử">
          {errorMsg}
        </Alert>
      )}

      {/* Filter Bar */}
      <form
        onSubmit={handleApplyFilter}
        className="p-4 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tiêu đề tài liệu..."
              onClear={() => setSearch('')}
            />
          </div>

          <Select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType | 'all')}
          >
            <option value="all">Mọi loại (Nháp/Chính thức)</option>
            <option value="draft">Bản nháp</option>
            <option value="published">Chính thức</option>
          </Select>

          <Select
            value={exportScope}
            onChange={(e) => setExportScope(e.target.value as ExportScope | 'all')}
          >
            <option value="all">Mọi phạm vi (Đơn/Bộ)</option>
            <option value="single">Công thức đơn</option>
            <option value="collection">Bộ sưu tập</option>
          </Select>

          <Select
            value={state}
            onChange={(e) => setState(e.target.value as DocumentState | 'all')}
          >
            <option value="all">Mọi trạng thái</option>
            <option value="ready">Sẵn sàng (Ready)</option>
            <option value="failed">Thất bại (Failed)</option>
            <option value="processing">Đang xử lý</option>
          </Select>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" type="submit" className="w-full">
              <Filter className="w-3.5 h-3.5 mr-1" /> Lọc
            </Button>
            <Button
              variant="ghost"
              size="md"
              type="button"
              onClick={handleResetFilter}
              title="Đặt lại bộ lọc"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#E8E2D9] text-xs text-[#706E68]">
          <span className="font-semibold text-[#1A1917]">Khoảng thời gian:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromUtc}
              onChange={(e) => setFromUtc(e.target.value)}
              className="bg-white border border-[#E8E2D9] rounded-lg px-2.5 py-1 text-xs text-[#1A1917] outline-none focus:border-[#B47820]"
            />
            <span>đến</span>
            <input
              type="date"
              value={toUtc}
              onChange={(e) => setToUtc(e.target.value)}
              className="bg-white border border-[#E8E2D9] rounded-lg px-2.5 py-1 text-xs text-[#1A1917] outline-none focus:border-[#B47820]"
            />
          </div>
        </div>
      </form>

      {/* History Data Table */}
      <DataTable
        columns={columns}
        data={documents}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        emptyTitle="Chưa có tài liệu PDF nào trong lịch sử"
        emptyMessage="Hãy chuyển sang tab 'Xuất PDF' để kết xuất và phát hành tài liệu chuẩn kỹ thuật."
        pagination={{
          page,
          totalPages: Math.ceil(totalCount / pageSize) || 1,
          total: totalCount,
          onPageChange: (newPage) => setPage(newPage),
        }}
      />

      {/* Preview Dialog */}
      {isPreviewOpen && (
        <Dialog
          isOpen={true}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewBlob(null);
          }}
          title={`Xem tài liệu: ${previewFileName}`}
          description={
            docDetail
              ? `Ấn bản ${docDetail.documentType === 'published' ? 'Chính thức' : 'Nháp'} • Tạo lúc: ${new Date(docDetail.createdAt).toLocaleString('vi-VN')} • Số món: ${docDetail.itemCount}`
              : 'Đang tải thông tin chi tiết tài liệu...'
          }
          maxWidth="5xl"
        >
          <div className="space-y-4">
            {docDetail && docDetail.items && docDetail.items.length > 0 && (
              <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9] text-xs space-y-1.5">
                <span className="font-semibold text-[#1A1917]">Danh sách món trong ấn phẩm:</span>
                <div className="flex flex-wrap gap-2">
                  {docDetail.items.map((it) => (
                    <span
                      key={it.recipeVersionId}
                      className="px-2 py-0.5 bg-white border border-[#E8E2D9] rounded-md text-[#1A1917]"
                    >
                      <strong className="text-[#B47820] font-mono mr-1">#{it.sortOrder}</strong>
                      {it.recipeName} ({it.recipeCode} v{it.versionNumber})
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="h-[600px]">
              <PdfDocumentPreview
                blob={previewBlob}
                fileName={previewFileName}
                isLoading={isLoadingPreview}
                error={previewError}
                isSavedHistory={true}
              />
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
