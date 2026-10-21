'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Lock,
  Download,
  Clock,
  Thermometer,
  Wrench,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import {
  RecipeVersion,
  Ingredient,
  MediaAsset,
  PublishedDocument,
} from '@/lib/demo/types';
import { Button, Alert } from '@/components/workspace/fields';
import { StatusBadge, MediaSourceBadge } from '@/components/workspace/status-badge';
import { downloadPdfBlob } from '@/lib/demo/pdf-export';

export default function ViewerRecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const { session, repo, dataVersion } = useDemo();

  const [recipe, setRecipe] = useState<RecipeVersion | null>(null);
  const [ingredientsMap, setIngredientsMap] = useState<Record<string, Ingredient>>({});
  const [mediaMap, setMediaMap] = useState<Record<string, MediaAsset>>({});
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [publishedDoc, setPublishedDoc] = useState<PublishedDocument | null>(null);

  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!id || !session) return;

    setLoading(true);
    setPermissionDenied(false);
    setErrorMsg(null);

    Promise.all([
      repo.getRecipeVersion(session, id),
      repo.getIngredients(),
      repo.getMedia(),
      repo.getPublishedDocument(id),
    ])
      .then(([rec, ings, mediaList, pubDoc]) => {
        if (!isMounted) return;

        setRecipe(rec);

        const ingMap: Record<string, Ingredient> = {};
        ings.forEach((ing) => {
          ingMap[ing.id] = ing;
        });
        setIngredientsMap(ingMap);

        const mMap: Record<string, MediaAsset> = {};
        const urls: Record<string, string> = {};
        mediaList.forEach((m) => {
          mMap[m.id] = m;
          if (m.blob) {
            urls[m.id] = URL.createObjectURL(m.blob);
          }
        });
        setMediaMap(mMap);
        setMediaUrls(urls);

        setPublishedDoc(pubDoc);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err?.code === 'Forbidden' || err?.message?.toLowerCase().includes('quyền')) {
          setPermissionDenied(true);
        } else {
          setErrorMsg(err.message || 'Không thể tải chi tiết công thức');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      Object.values(mediaUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [id, session, repo, dataVersion]);

  const handleDownloadPdf = () => {
    if (!publishedDoc || !publishedDoc.pdfBlob) return;
    setIsDownloading(true);
    try {
      const filename = `SOP_${publishedDoc.recipeCode}_${publishedDoc.versionLabel}.pdf`;
      downloadPdfBlob(publishedDoc.pdfBlob, filename);
    } catch (e: unknown) {
      const err = e as Error;
      alert(`Lỗi tải tệp PDF: ${err.message || 'Không xác định'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-5xl mx-auto">
        <div className="w-8 h-8 border-2 border-[#B47820] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-[#78716C]">Đang tải tài liệu hướng dẫn kỹ thuật SOP...</p>
      </div>
    );
  }

  // 2. Permission Denied State (graceful without flashing recipe info)
  if (permissionDenied) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-xs">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#1C1917] mb-2">Truy Cập Bị Từ Chối (403 Forbidden)</h2>
        <p className="text-sm text-[#78716C] leading-relaxed mb-6">
          Bạn không có quyền truy cập hoặc xem quy trình pha chế của công thức này. Chỉ công thức đã phát hành và được Quản trị viên phân quyền vào tài khoản mới có thể hiển thị.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/viewer">
            <Button variant="secondary">Quay lại danh mục tra cứu</Button>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Generic Error State
  if (errorMsg || !recipe) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border border-[#E2DDD2] rounded-2xl p-8 text-center shadow-xs">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#FAF8F2] flex items-center justify-center text-[#78716C]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#1C1917] mb-2">Không tìm thấy công thức</h2>
        <p className="text-sm text-[#78716C] mb-6">{errorMsg || 'Công thức không tồn tại hoặc đã bị xóa.'}</p>
        <Link href="/viewer">
          <Button variant="secondary">Quay lại danh mục</Button>
        </Link>
      </div>
    );
  }

  // 4. Normal Read-Only Recipe SOP View
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/viewer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#706E68] hover:text-[#1A1917] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại danh mục công thức</span>
        </Link>

        {/* Read-only notification badge */}
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded bg-[#FAF9F5] text-[#706E68] border border-[#E8E2D9]">
          <Lock className="w-3 h-3 text-[#706E68]" />
          <span>Chế độ Chỉ Đọc (Read-Only SOP)</span>
        </span>
      </div>

      {/* Header Section */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E8E2D9]">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-bold px-3 py-1 rounded bg-[#F5F0E8] border border-[#E8E2D9] text-[#B47820]">
                {recipe.code}
              </span>
              <span className="text-xs px-2.5 py-1 rounded bg-[#F5F0E8] text-[#706E68] border border-[#E8E2D9] font-mono font-medium">
                Phiên bản {recipe.versionLabel}
              </span>
              <StatusBadge status={recipe.status} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917] mt-1">
              {recipe.name}
            </h1>
            {recipe.description && (
              <p className="text-sm text-[#706E68] max-w-2xl leading-relaxed">
                {recipe.description}
              </p>
            )}
          </div>

          {/* Official PDF Download Block */}
          <div className="lg:text-right shrink-0">
            {publishedDoc ? (
              <div className="space-y-2">
                <Button
                  variant="gold"
                  size="md"
                  onClick={handleDownloadPdf}
                  isLoading={isDownloading}
                  className="w-full lg:w-auto shadow-xs"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Tải Bản PDF SOP Đã Phát Hành
                </Button>
                <p className="text-[11px] text-emerald-700 flex items-center justify-end gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đã ban hành chính thức ({new Date(publishedDoc.createdAt).toLocaleDateString('vi-VN')})
                </p>
              </div>
            ) : (
              <div className="p-3 bg-[#FAF9F5] border border-[#E8E2D9] rounded-xl text-left lg:text-right max-w-xs">
                <span className="block text-xs font-semibold text-[#1A1917] mb-0.5">
                  Chưa có ấn bản PDF
                </span>
                <span className="text-[11px] text-[#706E68]">
                  Bản PDF chính thức sẽ hiển thị tại đây khi Quản lý hoàn tất đóng dấu ban hành.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Publication Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs text-[#706E68]">
          <div className="bg-[#FAF9F5] rounded-xl p-3.5 border border-[#E8E2D9]">
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-[#8C887F] mb-1">
              Định mức thành phẩm
            </span>
            <span className="text-sm font-semibold text-[#1A1917]">
              {recipe.targetYield !== null && recipe.yieldUnit ? `${recipe.targetYield} ${recipe.yieldUnit}` : 'Chưa thiết lập'}
            </span>
          </div>

          <div className="bg-[#FAF9F5] rounded-xl p-3.5 border border-[#E8E2D9]">
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-[#8C887F] mb-1">
              Ngày phát hành
            </span>
            <span className="text-sm font-medium text-[#1A1917]">
              {recipe.publishedAt
                ? new Date(recipe.publishedAt).toLocaleString('vi-VN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'Chưa có thông tin'}
            </span>
          </div>

          <div className="bg-[#FAF9F5] rounded-xl p-3.5 border border-[#E8E2D9]">
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-[#8C887F] mb-1">
              Trạng thái sử dụng
            </span>
            <span className="text-xs text-[#706E68] italic line-clamp-2">
              Công thức đã được phát hành để tra cứu tại quầy.
            </span>
          </div>
        </div>
      </div>

      {/* Ingredients Section */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-4.5 bg-[#B47820] rounded-full" />
            <h2 className="text-lg font-bold text-[#1A1917] tracking-tight">
              Bảng Định Lượng Nguyên Liệu
            </h2>
          </div>
          <span className="text-xs text-[#706E68]">
            Tổng cộng: <strong className="text-[#1A1917]">{recipe.ingredients.length}</strong> nguyên liệu
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E8E2D9] bg-white">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#E8E2D9] bg-[#F5F0E8] text-[#706E68]">
                <th className="py-3 px-4 font-semibold text-center w-12">STT</th>
                <th className="py-3 px-4 font-semibold">Tên nguyên liệu</th>
                <th className="py-3 px-4 font-semibold text-right">Định lượng</th>
                <th className="py-3 px-4 font-semibold text-center">Đơn vị</th>
                <th className="py-3 px-4 font-semibold">Ghi chú kỹ thuật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D9] text-[#1A1917]">
              {recipe.ingredients.map((item, idx) => {
                const ingInfo = ingredientsMap[item.ingredientId];
                return (
                  <tr key={`${item.ingredientId}_${idx}`} className="hover:bg-[#FAF9F5] transition">
                    <td className="py-3.5 px-4 text-center font-mono text-[#8C887F] font-semibold">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#1A1917]">
                      <div>{ingInfo ? ingInfo.name : item.ingredientId}</div>
                      {ingInfo?.code && (
                        <div className="text-[11px] font-mono text-[#8C887F]">{ingInfo.code}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#B47820]">
                      {item.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#706E68]">
                      {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#706E68]">
                      {item.notes || item.stageNote || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standard Operating Procedures (SOP) Section */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-4.5 bg-[#B47820] rounded-full" />
            <h2 className="text-lg font-bold text-[#1A1917] tracking-tight">
              Quy Trình Thao Tác Chuẩn (SOP)
            </h2>
          </div>
          <span className="text-xs text-[#706E68]">
            Số bước thực hiện: <strong className="text-[#1A1917]">{recipe.steps.length}</strong> bước
          </span>
        </div>

        <div className="space-y-6">
          {recipe.steps.map((step) => {
            const coverMedia = step.coverMediaAssetId ? mediaMap[step.coverMediaAssetId] : null;
            const coverUrl = step.coverMediaAssetId ? mediaUrls[step.coverMediaAssetId] : null;

            return (
              <div
                key={step.id || step.stepNumber}
                className="bg-[#FAF9F5] border border-[#E8E2D9] rounded-xl p-5 sm:p-6 transition hover:border-[#C9A84C]"
              >
                {/* Step header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E8E2D9]">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-white border border-[#E8E2D9] text-[#B47820] font-bold text-xs flex items-center justify-center shrink-0">
                      {step.stepNumber}
                    </span>
                    <h3 className="font-semibold text-base text-[#1A1917]">
                      {step.title}
                    </h3>
                  </div>

                  {/* Badges / Metrics */}
                  <div className="flex flex-wrap items-center gap-2">
                    {step.durationSeconds !== undefined && step.durationSeconds > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-white border border-[#E8E2D9] text-[#1A1917]">
                        <Clock className="w-3.5 h-3.5 text-[#B47820]" />
                        <span>{step.durationSeconds} giây</span>
                      </span>
                    )}
                    {step.temperatureCelsius !== undefined && (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-white border border-[#E8E2D9] text-[#1A1917]">
                        <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                        <span>{step.temperatureCelsius}°C</span>
                      </span>
                    )}
                    {step.equipment && (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-white border border-[#E8E2D9] text-[#1A1917]">
                        <Wrench className="w-3.5 h-3.5 text-[#706E68]" />
                        <span>{step.equipment}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Step Body & Cover Image Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider font-semibold text-[#8C887F] mb-1">
                        Hướng dẫn thao tác
                      </h4>
                      <p className="text-sm text-[#1A1917] leading-relaxed whitespace-pre-line">
                        {step.instruction}
                      </p>
                    </div>

                    {step.completionCriteria && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <h4 className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800 mb-1 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tiêu chuẩn hoàn thành</span>
                        </h4>
                        <p className="text-xs text-emerald-900 leading-relaxed">
                          {step.completionCriteria}
                        </p>
                      </div>
                    )}

                    {step.notes && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-800 block mb-0.5">
                          Lưu ý quan trọng
                        </span>
                        <p className="text-xs text-amber-900 leading-relaxed">
                          {step.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Media attachment block */}
                  <div className="lg:col-span-1">
                    {coverUrl ? (
                      <div className="space-y-2">
                        <div className="relative rounded-lg overflow-hidden border border-[#E8E2D9] aspect-video bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={coverUrl}
                            alt={step.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#706E68]">
                          <span>{coverMedia?.name || 'Ảnh minh họa thao tác'}</span>
                          {coverMedia?.source && (
                            <MediaSourceBadge source={coverMedia.source} />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-[#E8E2D9] rounded-lg p-5 text-center text-[#8C887F] h-full flex flex-col items-center justify-center min-h-[120px]">
                        <FileText className="w-6 h-6 mb-1 text-[#8C887F]" />
                        <span className="text-xs">Không có ảnh đính kèm</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
