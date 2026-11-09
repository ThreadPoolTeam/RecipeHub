'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
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
import { PdfDocumentCards } from './pdf-document-cards';
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

      <PdfDocumentCards
        documents={documents}
        loading={loading}
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
        downloadingId={downloadingId}
        onPageChange={(newPage) => setPage(newPage)}
        onView={handleViewPdf}
        onDownload={handleDownloadFile}
        formatFileSize={formatFileSize}
      />

      {/* Preview Modal */}
      <Dialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={docDetail?.title || previewFileName}
        maxWidth="5xl"
      >
        <div className="space-y-4">
          <div className="h-[600px] overflow-hidden rounded-lg border border-border bg-secondary">
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

          <div className="flex justify-end gap-2 border-t border-border pt-2">
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
