'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Download, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './fields';

interface PdfDocumentPreviewProps {
  blob: Blob | null;
  fileName?: string;
  isStale?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRefreshPreview?: () => void;
  isSavedHistory?: boolean;
}

export function PdfDocumentPreview({
  blob,
  fileName = 'preview.pdf',
  isStale = false,
  isLoading = false,
  error = null,
  onRefreshPreview,
  isSavedHistory = false,
}: PdfDocumentPreviewProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(blob);
    setObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  const handleDownload = () => {
    if (!objectUrl || !blob) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = () => {
    if (!objectUrl) return;
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-border bg-secondary p-8 text-center text-muted-foreground">
        <div className="mb-3 h-8 w-8 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin" />
        <p className="text-sm font-medium text-foreground">Đang kết xuất tài liệu PDF...</p>
        <p className="mt-1 text-xs text-muted-foreground">Đang xử lý định dạng ngang A4 sắc nét từ máy chủ</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center space-y-4 rounded-lg border border-destructive-border bg-card p-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive-soft text-destructive">
          <AlertCircle className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-destructive">Không thể kết xuất xem trước</h4>
          <p className="max-w-md text-xs text-destructive">{error}</p>
        </div>
        {onRefreshPreview && (
          <Button variant="secondary" size="sm" onClick={onRefreshPreview}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Thử lại xem trước
          </Button>
        )}
      </div>
    );
  }

  if (!blob || !objectUrl) {
    return (
      <div className="flex h-full min-h-[350px] flex-col items-center justify-center space-y-3 bg-secondary p-8 text-center text-muted-foreground">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card">
          <FileText className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="max-w-sm space-y-1">
          <h4 className="text-sm font-semibold text-foreground">Chưa có bản xem trước</h4>
          <p className="text-xs text-muted-foreground">
            Chọn công thức bên trái và nhấn &quot;Xem trước&quot; để hiển thị tài liệu SOP.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* Action / Warning Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          {isStale ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-info-soft px-2.5 py-1 font-medium text-info">
              <span className="h-1.5 w-1.5 rounded-full bg-info" />
              Nội dung đã đổi — Cần kết xuất lại để xem bản mới nhất
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Bản xem trước sẵn sàng
              {!isSavedHistory && (
                <span className="text-[11px] font-normal text-muted-foreground">
                  (Bản tạm thời)
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isStale && onRefreshPreview && (
            <Button variant="secondary" size="sm" onClick={onRefreshPreview}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} /> Cập nhật xem trước
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleOpenNewTab} title="Mở trong tab mới">
            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Mở tab mới
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            title={isSavedHistory ? 'Tải tệp PDF' : 'Tải bản xem trước (chưa lưu)'}
          >
            <Download className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
            {isSavedHistory ? 'Tải tệp PDF' : 'Tải bản xem trước'}
          </Button>
        </div>
      </div>

      {/* PDF View Frame */}
      <div className="relative min-h-[520px] flex-1 bg-secondary">
        <iframe
          src={`${objectUrl}#toolbar=1&navpanes=0&view=FitH`}
          className="w-full h-full min-h-[520px] border-none"
          title="Bản xem trước tài liệu PDF"
        />
        <noscript>
          <div className="p-4 text-center text-xs text-foreground">
            Trình duyệt không hỗ trợ xem trực tiếp. Vui lòng{' '}
            <a href={objectUrl} download={fileName} className="text-primary underline">
              bấm vào đây để tải xuống
            </a>.
          </div>
        </noscript>
      </div>
    </div>
  );
}
