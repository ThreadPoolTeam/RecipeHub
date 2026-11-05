'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  Image as ImageIcon,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { DocumentDraft, Ingredient, MediaAsset, PublishedDocument, RecipeVersion } from '@/lib/demo/types';
import { useDemo } from '@/lib/demo/provider';
import { downloadPdfBlob, generateRecipePdf, getRecipePdfMediaIds } from '@/lib/demo/pdf-export';
import { Alert, Button, TextArea, TextInput } from './fields';
import { Dialog } from './dialog';
import { MediaLibrary } from './media-library';

interface DocumentWorkspaceProps {
  recipe: RecipeVersion;
  readOnly?: boolean;
}

interface PdfPreview {
  blob: Blob;
  fingerprint: string;
  objectUrl: string;
}

function draftFingerprint(draft: DocumentDraft): string {
  return JSON.stringify({
    sourceVersionId: draft.sourceVersionId,
    titleOverride: draft.titleOverride ?? null,
    coverMediaIdOverride: draft.coverMediaIdOverride ?? null,
    stepCaptionOverrides: draft.stepCaptionOverrides ?? {},
    customNotes: draft.customNotes ?? null,
  });
}

export function DocumentWorkspace({ recipe, readOnly = false }: DocumentWorkspaceProps) {
  const { session, repo, touch } = useDemo();
  const [draft, setDraft] = useState<DocumentDraft | null>(null);
  const [publishedDoc, setPublishedDoc] = useState<PublishedDocument | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [preview, setPreview] = useState<PdfPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPublishingOfficial, setIsPublishingOfficial] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    repo.getDocumentDraft(recipe.id)
      .then(async (draftData) => {
        const [publishedData, ingredientData, mediaData] = await Promise.all([
          repo.getPublishedDocument(recipe.id),
          repo.getIngredients(),
          Promise.all(getRecipePdfMediaIds(recipe, draftData).map((mediaId) => repo.getMediaById(mediaId))),
        ]);
        return {
          draftData,
          publishedData,
          ingredientData,
          mediaData: mediaData.filter((media): media is MediaAsset => media !== null),
        };
      })
      .then(({ draftData, publishedData, ingredientData, mediaData }) => {
        if (!isMounted) return;
        setDraft(draftData);
        setPublishedDoc(publishedData);
        setIngredients(ingredientData);
        setMediaAssets(mediaData);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setErrorMsg(error instanceof Error ? error.message : 'Không thể tải dữ liệu xuất PDF.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [recipe.id, repo]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.objectUrl);
    };
  }, [preview]);

  const fingerprint = useMemo(() => draft ? draftFingerprint(draft) : '', [draft]);
  const hasCurrentPreview = preview?.fingerprint === fingerprint;

  const updateDraft = (updated: DocumentDraft): void => {
    setDraft(updated);
    setSuccessMsg(null);
  };

  const handleSaveDraft = async (): Promise<void> => {
    if (!session || !draft) return;
    touch();
    setIsSavingDraft(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await repo.saveDocumentDraft(session, { ...draft });
      setSuccessMsg('Đã lưu cấu hình trình bày PDF.');
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể lưu cấu hình PDF.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePreview = async (): Promise<void> => {
    if (!draft) return;
    touch();
    setIsPreviewing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const pdfBlob = await generateRecipePdf(
        recipe,
        draft,
        ingredients,
        mediaAssets,
        recipe.status !== 'Published'
      );
      const nextPreview = {
        blob: pdfBlob,
        fingerprint,
        objectUrl: URL.createObjectURL(pdfBlob),
      };
      setPreview(nextPreview);
      setIsPreviewOpen(true);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể tạo bản xem trước PDF.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownloadPreview = (): void => {
    if (!preview || !hasCurrentPreview) {
      setErrorMsg('Nội dung đã thay đổi. Hãy tạo lại bản xem trước trước khi tải PDF.');
      return;
    }
    touch();
    const prefix = recipe.status === 'Published' ? 'SOP' : 'NHAP_SOP';
    const filename = `${prefix}_${recipe.code}_${recipe.versionLabel}.pdf`;
    downloadPdfBlob(preview.blob, filename);
    setSuccessMsg(`Đã tải ${filename}.`);
  };

  const handlePublishOfficialPdf = async (): Promise<void> => {
    if (!session || !preview || !hasCurrentPreview) {
      setErrorMsg('Hãy xem trước phiên bản hiện tại trước khi xuất bản PDF chính thức.');
      return;
    }
    if (recipe.status !== 'Published') {
      setErrorMsg('Chỉ công thức đã phát hành mới được xuất bản PDF chính thức.');
      return;
    }
    touch();
    setIsPublishingOfficial(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const published = await repo.publishDocument(session, recipe.id, preview.blob);
      setPublishedDoc(published);
      const filename = `CHINH_THUC_SOP_${recipe.code}_${recipe.versionLabel}.pdf`;
      downloadPdfBlob(preview.blob, filename);
      setSuccessMsg(`Đã xuất bản và tải ${filename}.`);
      setIsPreviewOpen(false);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể xuất bản PDF chính thức.');
    } finally {
      setIsPublishingOfficial(false);
    }
  };

  const handleDownloadPublishedPdf = (): void => {
    if (!publishedDoc) return;
    touch();
    downloadPdfBlob(publishedDoc.pdfBlob, `SOP_${recipe.code}_${recipe.versionLabel}.pdf`);
  };

  if (loading || !draft) {
    return (
      <div className="p-8 text-center text-[#706E68]">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-[#B47820]" />
        <p className="mt-2 text-xs">Đang tải dữ liệu trang công thức...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && <Alert variant="error" title="Không thể xử lý PDF">{errorMsg}</Alert>}
      {successMsg && <Alert variant="success" title="Hoàn tất">{successMsg}</Alert>}

      {publishedDoc ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
              <CheckCircle2 className="h-4 w-4" /> PDF chính thức đã phát hành
            </div>
            <p className="mt-1 text-emerald-800">
              {publishedDoc.recipeCode}-{publishedDoc.versionLabel} • {new Date(publishedDoc.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
          <Button variant="gold" size="sm" onClick={handleDownloadPublishedPdf}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Tải bản đã phát hành
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-[#E8E2D9] bg-white p-3.5 text-xs text-[#706E68] shadow-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          Chưa có PDF chính thức cho phiên bản công thức này.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="space-y-5 rounded-xl border border-[#E8E2D9] bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E2D9] pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#1A1917]">Cấu hình trang công thức</h2>
              <p className="mt-1 text-xs text-[#706E68]">Mỗi công thức đúng một trang ngang, font Be Vietnam Pro và tự chọn bố cục.</p>
            </div>
            {!readOnly && (
              <Button variant="secondary" size="sm" isLoading={isSavingDraft} onClick={handleSaveDraft}>
                <Save className="mr-1 h-3.5 w-3.5" /> Lưu cấu hình
              </Button>
            )}
          </div>

          <TextInput
            label="Tiêu đề trên trang"
            disabled={readOnly}
            value={draft.titleOverride || ''}
            placeholder={recipe.name}
            onChange={(event) => updateDraft({ ...draft, titleOverride: event.target.value })}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1A1917]">Ảnh chính</label>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E8E2D9] bg-[#FAF9F5] p-3">
              <ImageIcon className="h-4 w-4 text-[#B47820]" />
              <span className="min-w-0 flex-1 truncate text-xs text-[#706E68]">
                {draft.coverMediaIdOverride ? `Ảnh tùy chỉnh: ${draft.coverMediaIdOverride}` : 'Dùng ảnh đại diện của công thức hoặc bước đầu tiên'}
              </span>
              {!readOnly && <Button variant="ghost" size="sm" onClick={() => setIsCoverPickerOpen(true)}>Chọn ảnh</Button>}
              {draft.coverMediaIdOverride && !readOnly && (
                <Button variant="ghost" size="sm" onClick={() => updateDraft({ ...draft, coverMediaIdOverride: undefined })}>Dùng mặc định</Button>
              )}
            </div>
          </div>

          <div className="space-y-3 border-t border-[#E8E2D9] pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1A1917]">Chú thích ảnh từng bước</h3>
            {recipe.steps.map((step) => (
              <div key={step.id} className="rounded-lg border border-[#E8E2D9] bg-[#FAF9F5] p-3">
                <p className="mb-2 text-xs font-medium text-[#1A1917]">Bước {step.stepNumber}: {step.title}</p>
                <TextInput
                  disabled={readOnly}
                  value={draft.stepCaptionOverrides?.[step.id] || ''}
                  placeholder={step.coverMediaAssetId ? step.mediaCaptions?.[step.coverMediaAssetId] || 'Nhập chú thích ảnh...' : 'Bước này chưa có ảnh đại diện'}
                  onChange={(event) => updateDraft({
                    ...draft,
                    stepCaptionOverrides: {
                      ...(draft.stepCaptionOverrides || {}),
                      [step.id]: event.target.value,
                    },
                  })}
                />
              </div>
            ))}
          </div>

          <TextArea
            label="Trang lưu ý vận hành"
            disabled={readOnly}
            rows={5}
            value={draft.customNotes || ''}
            placeholder="Lưu ý sẽ được thu gọn vào khu vực quy trình trên cùng trang..."
            onChange={(event) => updateDraft({ ...draft, customNotes: event.target.value })}
          />
        </section>

        <aside className="space-y-4">
          <div className="space-y-4 rounded-xl border border-[#E8E2D9] bg-white p-5 shadow-xs">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#1A1917]">Xem trước và xuất PDF</h2>
              <p className="mt-1 text-xs leading-5 text-[#706E68]">PDF chỉ được tải hoặc phát hành sau khi bạn xem trước đúng cấu hình hiện tại.</p>
            </div>

            <div className="rounded-lg border border-[#E8E2D9] bg-[#FAF9F5] p-3">
              <p className="text-xs font-semibold text-[#1A1917]">1. Tạo bản xem trước</p>
              <p className="mt-1 text-xs leading-5 text-[#706E68]">Kiểm tra toàn bộ nguyên liệu, quy trình và ảnh trên một trang duy nhất.</p>
              <Button
                variant="gold"
                size="sm"
                className="mt-3 w-full"
                isLoading={isPreviewing}
                onClick={handlePreview}
                data-testid="recipe-pdf-preview"
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" /> Xem trước PDF
              </Button>
            </div>

            <div className="rounded-lg border border-[#E8E2D9] bg-[#FAF9F5] p-3">
              <p className="text-xs font-semibold text-[#1A1917]">2. Xuất file đã kiểm tra</p>
              <p className="mt-1 text-xs leading-5 text-[#706E68]">
                {hasCurrentPreview ? 'Bản xem trước đang khớp với cấu hình hiện tại.' : 'Hãy xem trước lại sau mỗi lần chỉnh nội dung.'}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 w-full"
                disabled={!hasCurrentPreview}
                onClick={handleDownloadPreview}
                data-testid="recipe-pdf-download"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Tải PDF
              </Button>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="w-full"
              disabled={!hasCurrentPreview || recipe.status !== 'Published' || readOnly}
              isLoading={isPublishingOfficial}
              onClick={handlePublishOfficialPdf}
            >
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Phát hành PDF chính thức
            </Button>
          </div>
        </aside>
      </div>

      {isPreviewOpen && preview && (
        <Dialog
          isOpen={true}
          onClose={() => setIsPreviewOpen(false)}
          title={`Xem trước: ${draft.titleOverride?.trim() || recipe.name}`}
          description="Kiểm tra trang công thức hoàn chỉnh trước khi tải hoặc phát hành."
          size="wide"
        >
          <div className="overflow-hidden rounded-lg border border-[#E8E2D9] bg-[#706E68]">
            <iframe
              src={`${preview.objectUrl}#toolbar=1&navpanes=0&view=FitH`}
              title={`Bản xem trước PDF ${recipe.code}`}
              className="h-[68vh] w-full"
              data-testid="recipe-pdf-preview-frame"
            />
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={handleDownloadPreview}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Tải PDF này
            </Button>
            {recipe.status === 'Published' && !readOnly && (
              <Button variant="gold" size="sm" isLoading={isPublishingOfficial} onClick={handlePublishOfficialPdf}>
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Phát hành bản này
              </Button>
            )}
          </div>
        </Dialog>
      )}

      {isCoverPickerOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsCoverPickerOpen(false)}
          title="Chọn ảnh chính cho trang công thức"
          description="Chọn ảnh có sẵn trong thư viện media."
        >
          <MediaLibrary
            mode="picker"
            selectedMediaId={draft.coverMediaIdOverride}
            onSelect={(media) => {
              setMediaAssets((current) => current.some((item) => item.id === media.id) ? current : [...current, media]);
              updateDraft({ ...draft, coverMediaIdOverride: media.id });
              setIsCoverPickerOpen(false);
            }}
          />
        </Dialog>
      )}
    </div>
  );
}
