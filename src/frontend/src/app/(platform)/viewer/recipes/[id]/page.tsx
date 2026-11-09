'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
  RecipeIngredient,
  Ingredient,
  MediaAsset,
} from '@/lib/demo/types';
import { Button, Alert } from '@/components/workspace/fields';
import { StatusBadge, MediaSourceBadge } from '@/components/workspace/status-badge';
import { RecipeBatchScaler } from '@/components/recipes/RecipeBatchScaler';
import {
  getPublishedDocumentByVersion,
  downloadPdfDocumentFile,
} from '@/lib/api/pdf-documents';
import { PublishedDocumentLookupResponse } from '@/lib/api/pdf-document-types';

export default function ViewerRecipeDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const { session, repo, dataVersion } = useDemo();

  const [recipe, setRecipe] = useState<RecipeVersion | null>(null);
  const [scaledIngredients, setScaledIngredients] = useState<RecipeIngredient[] | null>(null);
  const [ingredientsMap, setIngredientsMap] = useState<Record<string, Ingredient>>({});
  const [mediaMap, setMediaMap] = useState<Record<string, MediaAsset>>({});
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [publishedDoc, setPublishedDoc] = useState<PublishedDocumentLookupResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);
  const [pdfWarning, setPdfWarning] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  useEffect(() => {
    let isMounted = true;
    const createdBlobUrls: string[] = [];
    if (!id || !session) return;
    setLoading(true);
    setPermissionDenied(false);
    setErrorMsg(null);
    setMediaWarning(null);

    Promise.all([
      repo.getRecipeVersion(session, id),
      repo.getIngredients(),
      getPublishedDocumentByVersion(id, session.userId).catch(() => null),
    ])
      .then(async ([rec, ings, pubDoc]) => {
        if (!isMounted) return;

        setRecipe(rec);

        const ingMap: Record<string, Ingredient> = {};
        ings.forEach((ing) => {
          ingMap[ing.id] = ing;
        });
        setIngredientsMap(ingMap);
        setPublishedDoc(pubDoc);

        const mediaIds = new Set<string>();
        if (rec.primaryMediaAssetId) mediaIds.add(rec.primaryMediaAssetId);
        rec.steps?.forEach((step) => {
          if (step.coverMediaAssetId) mediaIds.add(step.coverMediaAssetId);
          step.mediaAssetIds?.forEach((mId) => mediaIds.add(mId));
        });

        const mMap: Record<string, MediaAsset> = {};
        const urls: Record<string, string> = {};


        if (mediaIds.size > 0) {
          const results = await Promise.allSettled(
            Array.from(mediaIds).map((mId) => repo.getMediaById(mId))
          );
          if (!isMounted) return;
          results.forEach((res) => {
            if (res.status === 'fulfilled' && res.value) {
              const m = res.value;
              mMap[m.id] = m;
              if (m.blob && m.blob.size > 0) {
                const bUrl = URL.createObjectURL(m.blob);
                createdBlobUrls.push(bUrl);
                urls[m.id] = bUrl;
              } else if (m.deliveryUrl) {
                urls[m.id] = m.deliveryUrl;
              }
            }
          });
          if (results.some((res) => res.status === 'rejected') && isMounted) {
            setMediaWarning('Chưa tải được một số hình ảnh. Bạn vẫn có thể xem SOP và tính định lượng.');
          }
        }
        if (!isMounted) {
          createdBlobUrls.forEach((url) => URL.revokeObjectURL(url));
          return;
        }
        setMediaMap(mMap);
        setMediaUrls(urls);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err?.status === 403 || err?.code === 'Forbidden' || err?.message?.toLowerCase().includes('quyền')) {
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
      createdBlobUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [id, session, repo, dataVersion]);

  const handleDownloadPdf = async () => {
    const versionId = recipe?.versionId || id;
    setIsDownloading(true);
    setPdfWarning(null);
    try {
      let doc = publishedDoc;
      if (!doc) {
        doc = await getPublishedDocumentByVersion(versionId, session?.userId || null);
        if (doc) {
          setPublishedDoc(doc);
        }
      }

      if (!doc) {
        setPdfWarning('Công thức này chưa có bản PDF chính thức được xuất bản.');
        return;
      }

      const { blob, fileName } = await downloadPdfDocumentFile(doc.id, 'attachment', session?.userId || null);
      const downloadName = fileName || doc.fileName || `SOP_${recipe?.code || 'recipe'}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const err = e as Error;
      setPdfWarning(err.message || 'Không thể tải tệp PDF chính thức.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-sm text-muted-foreground" role="status">Đang tải tài liệu hướng dẫn kỹ thuật SOP...</div>;
  }

  if (permissionDenied) {
    return (
      <div className="mx-auto my-12 max-w-xl rounded-lg border border-destructive-border bg-card p-8 text-center shadow-soft">
        <AlertCircle className="mx-auto mb-4 h-8 w-8 text-destructive" strokeWidth={1.5} />
        <h2 className="font-display text-panel font-medium">Truy cập bị từ chối (403 Forbidden)</h2>
        <p className="my-4 text-sm text-muted-foreground">Bạn không có quyền truy cập hoặc xem quy trình pha chế của công thức này. Chỉ công thức đã phát hành và được Quản trị viên phân quyền vào tài khoản mới có thể hiển thị.</p>
        <Link href="/viewer" className="inline-flex h-11 items-center rounded-md border border-input px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Quay lại danh mục tra cứu</Link>
      </div>
    );
  }

  if (errorMsg || !recipe) {
    return (
      <div className="mx-auto my-12 max-w-xl rounded-lg border border-border bg-card p-8 text-center shadow-soft">
        <AlertCircle className="mx-auto mb-4 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        <h2 className="font-display text-panel font-medium">Không tìm thấy công thức</h2>
        <p className="my-4 text-sm text-muted-foreground">{errorMsg || 'Công thức không tồn tại hoặc đã bị xóa.'}</p>
        <Link href="/viewer" className="inline-flex h-11 items-center rounded-md border border-input px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Quay lại danh mục</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/viewer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Sổ tay công thức
        </Link>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-4 w-4" strokeWidth={1.5} /> Chế độ chỉ đọc
        </span>
      </div>
      {pdfWarning && <Alert type="info" message={pdfWarning} onClose={() => setPdfWarning(null)} />}
      {mediaWarning && <Alert variant="warning">{mediaWarning}</Alert>}

      <header className="flex flex-col justify-between gap-6 border-b border-border pb-8 lg:flex-row lg:items-end">
        <div className="space-y-3">
          <h1 className="font-display text-h2 font-medium text-foreground sm:text-h1">{recipe.name}</h1>
          {recipe.description && <p className="max-w-2xl text-sm text-muted-foreground">{recipe.description}</p>}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="text-primary">{recipe.code}</span>
            <span>{recipe.versionLabel}</span>
            <StatusBadge status={recipe.status} />
          </div>
        </div>
        <div className="shrink-0 space-y-2">
          <Button variant={publishedDoc ? 'gold' : 'secondary'} size="lg" onClick={handleDownloadPdf} isLoading={isDownloading} className="w-full lg:w-auto">
            <Download className="mr-2 h-4 w-4" strokeWidth={1.5} /> Tải bản PDF chính thức
          </Button>
          <p className="max-w-xs text-xs text-muted-foreground">
            {publishedDoc ? `Đã ban hành chính thức (${new Date(publishedDoc.completedAt).toLocaleDateString('vi-VN')})` : 'Bấm để kiểm tra và tải bản PDF chính thức từ máy chủ.'}
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-6 lg:border-r lg:border-border lg:pr-8">
          {recipe.primaryMediaAssetId && mediaUrls[recipe.primaryMediaAssetId] && (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrls[recipe.primaryMediaAssetId]} alt={recipe.name} className="aspect-square w-full object-contain" />
            </div>
          )}
          <div className="space-y-4 border-t border-border pt-5">
            <h2 className="font-display text-panel font-medium">Thông số công thức</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-xs text-muted-foreground">Định mức thành phẩm</dt><dd className="mt-1 tabular-nums">{recipe.targetYield !== null && recipe.yieldUnit ? `${recipe.targetYield} ${recipe.yieldUnit}` : 'Chưa thiết lập'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Phiên bản</dt><dd className="mt-1">{recipe.versionLabel}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Ngày phát hành</dt><dd className="mt-1">{recipe.publishedAt ? new Date(recipe.publishedAt).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Chưa có thông tin'}</dd></div>
            </dl>
          </div>
        </aside>

        <div className="min-w-0 space-y-8">
          <section aria-labelledby="ingredients-heading" className="space-y-5">
            <h2 id="ingredients-heading" className="font-display text-h3 font-medium">Định lượng nguyên liệu <span className="text-sm text-muted-foreground">({recipe.ingredients.length})</span></h2>
            <RecipeBatchScaler key={recipe.versionId ?? recipe.id} recipe={recipe} onScaled={setScaledIngredients} />
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary text-xs text-muted-foreground"><tr>
                  <th className="px-4 py-4 font-medium">STT</th>
                  <th className="px-4 py-4 font-medium">Nguyên liệu</th>
                  <th className="px-4 py-4 text-right font-medium">Định lượng</th>
                  <th className="px-4 py-4 font-medium">Đơn vị</th>
                  <th className="px-4 py-4 font-medium">Ghi chú</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {(scaledIngredients ?? recipe.ingredients).map((item, idx) => {
                    const ingInfo = ingredientsMap[item.ingredientId];
                    return <tr key={`${item.ingredientId}_${idx}`} className="hover:bg-accent">
                      <td className="px-4 py-4 tabular-nums text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-4">{ingInfo?.code && <div className="text-xs text-muted-foreground">{ingInfo.code}</div>}{ingInfo ? ingInfo.name : 'Chưa xác định'}</td>
                      <td className="px-4 py-4 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-4 py-4">{item.unit}</td>
                      <td className="px-4 py-4 text-muted-foreground">{item.notes || item.stageNote || '—'}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="steps-heading" className="space-y-5">
            <h2 id="steps-heading" className="font-display text-h3 font-medium">Quy trình thao tác chuẩn <span className="text-sm text-muted-foreground">({recipe.steps.length} bước)</span></h2>
            <div className="space-y-4">
              {recipe.steps.map((step) => {
                const coverMedia = step.coverMediaAssetId ? mediaMap[step.coverMediaAssetId] : null;
                const coverUrl = step.coverMediaAssetId ? mediaUrls[step.coverMediaAssetId] : null;
                return (
                  <article key={step.id || step.stepNumber} className="rounded-lg border border-border bg-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                      <h3 className="font-display text-panel font-medium"><span className="mr-3 text-primary">{step.stepNumber}.</span>{step.title}</h3>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {step.durationSeconds !== undefined && step.durationSeconds > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" strokeWidth={1.5} />{step.durationSeconds} giây</span>}
                        {step.temperatureCelsius !== undefined && <span className="inline-flex items-center gap-1"><Thermometer className="h-4 w-4" strokeWidth={1.5} />{step.temperatureCelsius}°C</span>}
                        {step.equipment && <span className="inline-flex items-center gap-1"><Wrench className="h-4 w-4" strokeWidth={1.5} />{step.equipment}</span>}
                      </div>
                    </div>
                    <div className="grid gap-5 pt-4 lg:grid-cols-3">
                      <div className="space-y-4 lg:col-span-2">
                        <div><h4 className="mb-1 text-xs font-semibold text-muted-foreground">Hướng dẫn thao tác</h4><p className="whitespace-pre-line text-sm">{step.instruction}</p></div>
                        {step.completionCriteria && <div className="rounded-lg bg-success-soft p-3 text-sm"><h4 className="mb-1 flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />Tiêu chuẩn hoàn thành</h4>{step.completionCriteria}</div>}
                        {step.notes && <div className="rounded-lg bg-muted p-3 text-sm"><h4 className="mb-1 text-xs font-semibold text-muted-foreground">Lưu ý quan trọng</h4>{step.notes}</div>}
                      </div>
                      <div>
                        {coverUrl ? <div className="space-y-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={coverUrl} alt={step.title} className="aspect-video w-full rounded-lg border border-border object-cover" />
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{coverMedia?.name || 'Ảnh minh họa thao tác'}</span>{coverMedia?.source && <MediaSourceBadge source={coverMedia.source} />}</div>
                        </div> : <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground"><FileText className="mb-2 h-6 w-6" strokeWidth={1.5} />Không có ảnh đính kèm</div>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
