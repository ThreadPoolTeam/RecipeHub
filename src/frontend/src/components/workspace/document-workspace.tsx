'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Save,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  FileDown,
  Image as ImageIcon,
} from 'lucide-react';
import { RecipeVersion, DocumentDraft, PublishedDocument } from '@/lib/demo/types';
import { useDemo } from '@/lib/demo/provider';
import { Button, TextInput, TextArea, Select, Alert } from './fields';
import { generateRecipePdf, downloadPdfBlob } from '@/lib/demo/pdf-export';
import { MediaLibrary } from './media-library';
import { Dialog } from './dialog';
interface DocumentWorkspaceProps {
  recipe: RecipeVersion;
  readOnly?: boolean;
}

export function DocumentWorkspace({ recipe, readOnly = false }: DocumentWorkspaceProps) {
  const { session, repo, touch } = useDemo();
  const [draft, setDraft] = useState<DocumentDraft | null>(null);
  const [publishedDoc, setPublishedDoc] = useState<PublishedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExportingDraft, setIsExportingDraft] = useState(false);
  const [isPublishingOfficial, setIsPublishingOfficial] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cover image picker dialog
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      repo.getDocumentDraft(recipe.id),
      repo.getPublishedDocument(recipe.id),
    ])
      .then(([draftData, publishedData]) => {
        if (!isMounted) return;
        setDraft(draftData);
        setPublishedDoc(publishedData);
      })
      .catch((err) => {
        if (isMounted) setErrorMsg(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [repo, recipe.id]);

  const handleSaveDraft = async () => {
    if (!session || !draft) return;
    touch();
    setIsSavingDraft(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await repo.saveDocumentDraft(session, draft);
      setSuccessMsg('Đã lưu cấu hình tài liệu nháp thành công!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu thất bại';
      setErrorMsg(msg);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleExportDraftPdf = async () => {
    if (!draft) return;
    touch();
    setIsExportingDraft(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const pdfBlob = await generateRecipePdf(recipe, draft, true);
      const filename = `NHAP_SOP_${recipe.code}_${recipe.versionLabel}.pdf`;
      downloadPdfBlob(pdfBlob, filename);
      setSuccessMsg(`Đã tải xuống ${filename} (Bản thử nghiệm có watermark)`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xuất bản thử thất bại';
      setErrorMsg(msg);
    } finally {
      setIsExportingDraft(false);
    }
  };

  const handlePublishOfficialPdf = async () => {
    if (!session || !draft) return;
    if (recipe.status !== 'Published') {
      setErrorMsg('Chỉ công thức đã phát hành mới được phép xuất bản tài liệu chính thức.');
      return;
    }

    touch();
    setIsPublishingOfficial(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // 1. Generate clean official PDF without watermark
      const pdfBlob = await generateRecipePdf(recipe, draft, false);

      // 2. Publish snapshot to IndexedDB
      const published = await repo.publishDocument(session, recipe.id, pdfBlob);
      setPublishedDoc(published);

      // 3. Trigger download
      const filename = `CHINH_THUC_SOP_${recipe.code}_${recipe.versionLabel}.pdf`;
      downloadPdfBlob(pdfBlob, filename);
      setSuccessMsg(`Đã xuất bản và tải xuống tài liệu chính thức: ${filename}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xuất bản chính thức thất bại';
      setErrorMsg(msg);
    } finally {
      setIsPublishingOfficial(false);
    }
  };

  const handleDownloadPublishedPdf = () => {
    if (!publishedDoc || !publishedDoc.pdfBlob) return;
    touch();
    const filename = `SOP_${recipe.code}_${recipe.versionLabel}.pdf`;
    downloadPdfBlob(publishedDoc.pdfBlob, filename);
    setSuccessMsg(`Đang tải tệp tài liệu phát hành: ${filename}`);
  };

  if (loading || !draft) {
    return (
      <div className="p-8 text-center text-[#706E68]">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#B47820]"></div>
        <p className="mt-2 text-xs">Đang tải không gian biên tập tài liệu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <Alert variant="error" title="Lỗi thao tác">
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" title="Thông báo">
          {successMsg}
        </Alert>
      )}

      {/* Published Status Banner */}
      {publishedDoc ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-emerald-900 text-sm">
                Ấn Bản Chính Thức Đã Được Phát Hành
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[11px] font-semibold">
                {publishedDoc.recipeCode}-{publishedDoc.versionLabel}
              </span>
            </div>
            <p className="text-xs text-emerald-800">
              Phát hành bởi: <span className="font-medium text-emerald-950">{publishedDoc.actorEmail}</span> • Thời điểm:{' '}
              {new Date(publishedDoc.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
          <Button variant="gold" size="sm" onClick={handleDownloadPublishedPdf}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Tải Bản PDF Đã Phát Hành
          </Button>
        </div>
      ) : (
        <div className="p-3.5 bg-white border border-[#E8E2D9] rounded-lg text-xs text-[#706E68] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Chưa có ấn bản tài liệu chính thức được phát hành cho phiên bản này.</span>
          </div>
          {recipe.status === 'Published' ? (
            <span className="text-emerald-700 font-medium">Sẵn sàng để xuất bản chính thức</span>
          ) : (
            <span className="text-amber-700 font-medium">
              Cần phát hành công thức trước khi xuất bản chính thức
            </span>
          )}
        </div>
      )}

      {/* Editor & Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Column */}
        <div className="lg:col-span-2 space-y-4 bg-white p-5 rounded-xl border border-[#E8E2D9] shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-3">
            <div>
              <h4 className="text-sm font-bold text-[#1A1917] uppercase tracking-wider">
                Cấu hình trình bày tài liệu SOP
              </h4>
              <p className="text-xs text-[#706E68] mt-0.5">
                Các tùy biến hiển thị tại đây không làm thay đổi nội dung công thức gốc.
              </p>
            </div>
            {!readOnly && (
              <Button
                variant="secondary"
                size="sm"
                isLoading={isSavingDraft}
                onClick={handleSaveDraft}
              >
                <Save className="w-3.5 h-3.5 mr-1 text-[#706E68]" /> Lưu cấu hình
              </Button>
            )}
          </div>
          <div className="space-y-4">
            <Select
              label="Mẫu bố cục tài liệu (Template)"
              disabled={readOnly}
              value={draft.template}
              onChange={(e) =>
                setDraft({ ...draft, template: e.target.value as DocumentDraft['template'] })
              }
            >
              <option value="standard-sop">Tiêu chuẩn SOP Cửa Hàng (Đầy đủ quy trình + định lượng)</option>
              <option value="summary-card">Thẻ Tóm Tắt Barista (Gọn gàng cho quầy pha chế)</option>
              <option value="barista-handbook">Cẩm Nang Đào Tạo Nội Bộ</option>
            </Select>

            <TextInput
              label="Tiêu đề tài liệu tùy chỉnh (Ghi đè tên công thức nếu cần)"
              disabled={readOnly}
              value={draft.titleOverride || ''}
              placeholder={recipe.name}
              onChange={(e) => setDraft({ ...draft, titleOverride: e.target.value })}
            />

            {/* Cover photo override */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#1A1917]">
                Ảnh Bìa Tài Liệu
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#706E68]">
                  {draft.coverMediaIdOverride
                    ? `Đang chọn ảnh tùy chỉnh: ID ${draft.coverMediaIdOverride}`
                    : 'Đang dùng ảnh đại diện mặc định của bước 1'}
                </span>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-[#B47820]"
                    onClick={() => setIsCoverPickerOpen(true)}
                  >
                    Đổi ảnh bìa...
                  </Button>
                )}
                {draft.coverMediaIdOverride && !readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-rose-400"
                    onClick={() => setDraft({ ...draft, coverMediaIdOverride: undefined })}
                  >
                    Bỏ ghi đè
                  </Button>
                )}
              </div>
            </div>

            {/* Step Caption Overrides */}
            <div className="space-y-3 pt-2 border-t border-[#E8E2D9]">
              <h5 className="text-xs font-semibold uppercase text-[#1A1917]">
                Chú thích ảnh theo từng bước (Step Captions):
              </h5>
              {recipe.steps.map((step) => (
                <div key={step.id} className="p-3 bg-[#FAF9F5] rounded-lg border border-[#E8E2D9] space-y-1">
                  <div className="text-xs font-medium text-[#1A1917]">
                    Bước {step.stepNumber}: {step.title}
                  </div>
                  <TextInput
                    disabled={readOnly}
                    value={draft.stepCaptionOverrides?.[step.id] || ''}
                    placeholder={
                      step.mediaCaptions?.[step.coverMediaAssetId || ''] ||
                      'Nhập chú thích kỹ thuật hiển thị dưới ảnh trong file PDF...'
                    }
                    onChange={(e) => {
                      const updatedCaptions = {
                        ...(draft.stepCaptionOverrides || {}),
                        [step.id]: e.target.value,
                      };
                      setDraft({ ...draft, stepCaptionOverrides: updatedCaptions });
                    }}
                  />
                </div>
              ))}
            </div>

            <TextArea
              label="Lưu ý vận hành bổ sung"
              disabled={readOnly}
              rows={3}
              value={draft.customNotes || ''}
              placeholder="Ví dụ: Kiểm tra hạn dùng của nguyên liệu trước mỗi ca mở cửa..."
              onChange={(e) => setDraft({ ...draft, customNotes: e.target.value })}
            />
          </div>
        </div>

        {/* Action & Preview Column */}
        {/* Export & Preview Column */}
        <div className="space-y-4">
          <div className="p-5 bg-white border border-[#E8E2D9] rounded-xl space-y-4 shadow-xs">
            <h4 className="text-sm font-bold text-[#1A1917] uppercase tracking-wider border-b border-[#E8E2D9] pb-3">
              Tác vụ xuất bản tài liệu PDF
            </h4>
            <p className="text-xs text-[#706E68]">
              Tạo tệp PDF A4 sắc nét phông chữ tiếng Việt với đầy đủ bảng định lượng và quy trình SOP.
            </p>

            <div className="space-y-3 pt-1">
              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#E8E2D9] text-xs space-y-1">
                <span className="font-semibold text-[#1A1917]">1. Xuất Bản Thử Nghiệm</span>
                <p className="text-[#706E68]">
                  Có đóng dấu watermark &quot;BẢN NHÁP — CHƯA PHÁT HÀNH&quot;. Dành cho chuyên viên kiểm tra trước.
                </p>
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    isLoading={isExportingDraft}
                    onClick={handleExportDraftPdf}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1 text-[#B47820]" /> Tải Xuất Bản Thử (Watermark)
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#E8E2D9] text-xs space-y-1">
                <span className="font-semibold text-[#1A1917]">2. Xuất Bản Phát Hành Chính Thức</span>
                <p className="text-[#706E68]">
                  Bản sạch không có watermark. Chỉ kích hoạt khi công thức đạt trạng thái{' '}
                  <strong className="text-emerald-700">Đã Phát Hành (Published)</strong>.
                </p>
                <div className="pt-2">
                  <Button
                    variant="gold"
                    size="sm"
                    className="w-full"
                    disabled={recipe.status !== 'Published' || readOnly}
                    isLoading={isPublishingOfficial}
                    onClick={handlePublishOfficialPdf}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Xuất Bản Chính Thức &amp; Tải PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cover Image Picker Dialog */}
      {isCoverPickerOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsCoverPickerOpen(false)}
          title="Chọn ảnh bìa tài liệu SOP"
          description="Chọn từ thư viện ảnh R&D hoặc tải lên tệp mới."
        >
          <MediaLibrary
            mode="picker"
            selectedMediaId={draft.coverMediaIdOverride}
            onSelect={(media) => {
              setDraft({ ...draft, coverMediaIdOverride: media.id });
              setIsCoverPickerOpen(false);
            }}
          />
        </Dialog>
      )}
    </div>
  );
}
