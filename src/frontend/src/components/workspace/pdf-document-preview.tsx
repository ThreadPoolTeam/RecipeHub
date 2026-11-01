'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ExternalLink, Download, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { Button, Alert } from './fields';

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
      <div className="flex flex-col items-center justify-center min-h-[420px] bg-[#FAF9F5] rounded-2xl border border-[#E8E2D9] p-8 text-center text-[#706E68]">
        <div className="w-8 h-8 border-2 border-[#B47820] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-[#1A1917]">Đang kết xuất tài liệu PDF...</p>
        <p className="text-xs text-[#706E68] mt-1">Đang xử lý định dạng ngang A4 sắc nét từ máy chủ</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-4">
        <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-rose-900">Không thể kết xuất xem trước</h4>
          <p className="text-xs text-rose-700 max-w-md">{error}</p>
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
      <div className="flex flex-col items-center justify-center min-h-[350px] bg-[#FAF9F5] rounded-2xl border border-dashed border-[#D8D0C5] p-8 text-center text-[#706E68] space-y-3">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-[#E8E2D9] shadow-2xs">
          <FileText className="w-6 h-6 text-[#8C887F]" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h4 className="text-sm font-semibold text-[#1A1917]">Chưa có bản xem trước</h4>
          <p className="text-xs text-[#706E68]">
            Chọn công thức và nhấn nút &quot;Xem thử tài liệu&quot; để kết xuất trực quan PDF trước khi xuất bản.
          </p>
        </div>
        {onRefreshPreview && (
          <Button variant="gold" size="sm" onClick={onRefreshPreview}>
            Xem thử ngay
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-[#E8E2D9] overflow-hidden shadow-xs">
      {/* Action / Warning Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#FAF9F5] border-b border-[#E8E2D9] text-xs">
        <div className="flex items-center gap-2">
          {isStale ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Nội dung đã đổi — Cần kết xuất lại để xem bản mới nhất
            </span>
          ) : (
            <span className="text-[#706E68] font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Bản xem trước sẵn sàng
              {!isSavedHistory && (
                <span className="text-amber-800 text-[11px] font-normal">
                  (Chưa lưu vào lịch sử)
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isStale && onRefreshPreview && (
            <Button variant="secondary" size="sm" onClick={onRefreshPreview}>
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#B47820]" /> Cập nhật xem trước
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
            <Download className="w-3.5 h-3.5 mr-1 text-[#B47820]" />
            {isSavedHistory ? 'Tải tệp PDF' : 'Tải bản xem trước'}
          </Button>
        </div>
      </div>

      {/* PDF View Frame */}
      <div className="relative flex-1 min-h-[520px] bg-[#525659]">
        <iframe
          src={`${objectUrl}#toolbar=1&navpanes=0&view=FitH`}
          className="w-full h-full min-h-[520px] border-none"
          title="Bản xem trước tài liệu PDF"
        />
        <noscript>
          <div className="p-4 text-center text-white text-xs">
            Trình duyệt không hỗ trợ xem trực tiếp. Vui lòng{' '}
            <a href={objectUrl} download={fileName} className="underline text-amber-300">
              bấm vào đây để tải xuống
            </a>.
          </div>
        </noscript>
      </div>
    </div>
  );
}
