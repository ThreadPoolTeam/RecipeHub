'use client';

import { pageTitleClass } from '@/components/workspace/page-header';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  Thermometer,
  ArrowLeft,
  Pencil,
  Send,
  RefreshCw,
  Copy,
  Archive,
  FileDown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- giữ import cho nút "Lịch sử" đang comment
  History,
} from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion, RecipeIngredient, Ingredient, MediaAsset } from '@/lib/demo/types';
import { RecipeBatchScaler } from '@/components/recipes/RecipeBatchScaler';
import { Button, TextInput, Alert } from '@/components/workspace/fields';
import { StatusBadge } from '@/components/workspace/status-badge';
import { Dialog } from '@/components/workspace/dialog';
import { StyledSelect } from '@/components/workspace/styled-select';
import { VersionHistoryDrawer } from '@/components/workspace/version-history-drawer';
import { useToast } from '@/components/workspace/toast';
import { getStoredAiDrafts } from '@/lib/ai-draft-storage';
import { stepIngredientText } from '@/lib/recipe-step-links';

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { session, repo, dataVersion, touch } = useDemo();
  const { toast } = useToast();
  const [recipe, setRecipe] = useState<RecipeVersion | null>(null);
  const [scaledIngredients, setScaledIngredients] = useState<RecipeIngredient[] | null>(null);
  const [ingredientsMap, setIngredientsMap] = useState<Record<string, Ingredient>>({});
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({}); // mediaId -> objectUrl
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);

  // Version History State
  const [versions, setVersions] = useState<RecipeVersion[]>([]);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  // Action Loading
  const [isPublishing, setIsPublishing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copyCode, setCopyCode] = useState('');
  const [copyName, setCopyName] = useState('');
  const [copySubmitting, setCopySubmitting] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Load Recipe Data
  useEffect(() => {
    if (!session || !id) return;
    let isMounted = true;
    setLoading(true);
    setMediaWarning(null);

    Promise.all([
      repo.getRecipeVersion(session, id),
      repo.getIngredients(),
      repo.getMedia().catch(() => {
        if (isMounted) setMediaWarning('Chưa tải được media. Bạn vẫn có thể xem SOP và tính định lượng.');
        return [] as MediaAsset[];
      }),
      repo.getRecipeVersions(session, id),
    ])
      .then(([rec, allIngs, mediaList, versionList]) => {
        if (!isMounted) return;
        setRecipe(rec);
        setVersions(versionList.length > 0 ? versionList : [rec]);
        const ingDict: Record<string, Ingredient> = {};
        allIngs.forEach((ing) => {
          ingDict[ing.id] = ing;
        });
        setIngredientsMap(ingDict);

        const urlDict: Record<string, string> = {};
        mediaList.forEach((m) => {
          if (m.blob && m.blob.size > 0) {
            urlDict[m.id] = URL.createObjectURL(m.blob);
          } else if (m.deliveryUrl) {
            urlDict[m.id] = m.deliveryUrl;
          }
        });
        setMediaMap(urlDict);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const e = err as Error;
        setErrorMsg(e.message || 'Không thể tải chi tiết công thức.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      Object.values(mediaMap).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [session, repo, id, dataVersion]);

  const handlePublish = async () => {
    if (!session || !recipe) return;
    if (recipe.targetYield === null || !recipe.yieldUnit) {
      setErrorMsg('Hãy thiết lập sản lượng và đơn vị thành phẩm trước khi phát hành.');
      return;
    }
    if (recipe.ingredients.length === 0 || recipe.steps.length === 0) {
      setErrorMsg('Công thức cần có ít nhất 1 nguyên liệu và 1 bước quy trình để phát hành.');
      return;
    }
    if (recipe.steps.some((step) => !step.title.trim() || !step.instruction.trim())) {
      setErrorMsg('Mỗi bước cần có tên và nội dung thao tác trước khi phát hành.');
      return;
    }

    try {
      setIsPublishing(true);
      setErrorMsg(null);
      const updated = await repo.publishRecipe(session, recipe.id);
      setRecipe(updated);
      touch();
      toast({ type: 'success', title: 'Đã phát hành công thức', description: `${updated.code} · ${updated.versionLabel}` });
    } catch (err: unknown) {
      const e = err as Error;
      toast({
        type: 'error',
        title: 'Không thể phát hành công thức',
        description: e.message || 'Vui lòng thử lại.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleOpenCopyDialog = () => {
    if (!recipe) return;
    setCopyCode(`${recipe.code}-COPY`);
    setCopyName(`${recipe.name} (Bản sao)`);
    setCopyError(null);
    setIsCopyDialogOpen(true);
  };

  const handleConfirmCopy = async () => {
    if (!session || !recipe) return;
    const cleanCode = copyCode.trim().toUpperCase();
    const cleanName = copyName.trim();

    if (!cleanCode || !cleanName) {
      setCopyError('Vui lòng nhập đầy đủ mã và tên cho bản sao.');
      return;
    }

    try {
      setCopySubmitting(true);
      setCopyError(null);
      const copiedRecipe = await repo.copyRecipe(session, recipe.id, cleanCode, cleanName);
      touch();
      setIsCopyDialogOpen(false);
      toast({ type: 'success', title: 'Đã tạo bản sao công thức', description: `${cleanCode} · ${cleanName}` });
      router.push(`/rnd/recipes/${copiedRecipe.id}`);
    } catch (err: unknown) {
      const e = err as Error;
      toast({
        type: 'error',
        title: 'Không thể sao chép công thức',
        description: e.message || 'Vui lòng thử lại.',
      });
    } finally {
      setCopySubmitting(false);
    }
  };

  // Action: Archive Recipe
  const handleArchiveRecipe = async () => {
    if (!session || !recipe) return;
    try {
      setIsArchiving(true);
      setErrorMsg(null);
      const updated = await repo.archiveRecipe(session, recipe.id);
      setRecipe(updated);
      touch();
      setIsArchiveConfirmOpen(false);
      toast({ type: 'success', title: 'Đã lưu trữ công thức', description: `${updated.code} · ${updated.versionLabel}` });
    } catch (err: unknown) {
      const e = err as Error;
      toast({
        type: 'error',
        title: 'Không thể lưu trữ công thức',
        description: e.message || 'Vui lòng thử lại.',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  // Action: Activate (Restore) Recipe
  const handleActivateRecipe = async () => {
    if (!session || !recipe) return;
    try {
      setIsActivating(true);
      setErrorMsg(null);
      const updated = await repo.activateRecipe(session, recipe.id);
      setRecipe(updated);
      touch();
      toast({ type: 'success', title: 'Đã khôi phục công thức', description: `${updated.code} · ${updated.versionLabel}` });
    } catch (err: unknown) {
      const e = err as Error;
      toast({
        type: 'error',
        title: 'Không thể khôi phục công thức',
        description: e.message || 'Vui lòng thử lại.',
      });
    } finally {
      setIsActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <p className="mt-3 text-sm">Đang tải hồ sơ công thức...</p>
      </div>
    );
  }

  if (errorMsg && !recipe) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <Alert type="error" message={errorMsg} />
        <Link href="/rnd/recipes">
          <Button variant="secondary">← Quay về danh sách công thức</Button>
        </Link>
      </div>
    );
  }

  if (!recipe) return null;

  return (
    <div className="space-y-8 pb-12">
      <div className="grid items-center gap-8 lg:grid-cols-2">
      {/* Breadcrumb & Top Bar */}
      {/* Hero Cover Image (if available) */}
      {(() => {
        let coverUrl: string | null = null;
        if (recipe.primaryMediaAssetId) {
          coverUrl = mediaMap[recipe.primaryMediaAssetId] || null;
          if (!coverUrl && typeof window !== 'undefined') {
            coverUrl = localStorage.getItem(`recipehub_media_url_${recipe.primaryMediaAssetId}`) || null;
          }

        }
        if (!coverUrl) {
          const versionId = recipe.versionId || recipe.id;
          const localDrafts = getStoredAiDrafts(versionId, 'final_product');
          if (localDrafts.length > 0) {
            coverUrl = localDrafts[0].previewUrl;
          }
        }

        if (!coverUrl || coverUrl === failedCoverUrl) return null;

        return (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-muted shadow-soft">
            <img
              src={coverUrl}
              alt={recipe.name}
              className="aspect-square w-full object-contain"
              onError={() => setFailedCoverUrl(coverUrl)}
            />
          </div>
        );
      })()}
      <div className="space-y-5">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/rnd/recipes" className="flex items-center gap-1 font-medium hover:text-primary">
              <ArrowLeft className="w-3 h-3" /> Công thức R&amp;D
            </Link>
            <span>/</span>
            <span className="font-semibold text-primary">{recipe.code}</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={pageTitleClass}>{recipe.name}</h1>
            {versions.length > 1 ? (
              <div className="w-52">
                <StyledSelect aria-label="Chuyển đổi phiên bản công thức" value={recipe.versionId || recipe.id}
                  onChange={(value) => { const selected = versions.find((version) => (version.versionId || version.id) === value); if (selected) setRecipe(selected); }}
                  options={versions.map((version) => ({ value: version.versionId || version.id, label: version.versionLabel }))} />
              </div>
            ) : (
              <span className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-primary">
                {recipe.versionLabel}
              </span>
            )}
            <StatusBadge status={recipe.status} />
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {recipe.status !== 'Archived' && (
            <Link href={`/rnd/recipes/${recipe.id}/edit`}>
              <Button variant="secondary" size="sm">
                <Pencil className="w-3.5 h-3.5 mr-1" /> Chỉnh sửa
              </Button>
            </Link>
          )}

          {recipe.status === 'Draft' && (
            <Button
              variant="gold"
              size="sm"
              isLoading={isPublishing}
              onClick={handlePublish}
              title="Phát hành công thức để sử dụng"
            >
              <Send className="w-3.5 h-3.5 mr-1" /> Phát hành
            </Button>
          )}

          <Button variant="secondary" size="sm" onClick={handleOpenCopyDialog} title="Tạo một công thức độc lập từ dữ liệu hiện tại">
            <Copy className="mr-1 h-3.5 w-3.5 text-muted-foreground" /> Sao chép
          </Button>
          {/*
            Nút "Lịch sử" tạm ẩn theo yêu cầu người dùng: trùng chức năng với nút xem phiên bản khác trên trang.
            Không xoá code, bật lại bằng cách bỏ comment khối này.
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsHistoryDrawerOpen(true)}
            title="Xem lịch sử các phiên bản"
          >
            <History className="mr-1 h-3.5 w-3.5 text-primary" /> Lịch sử ({versions.length})
          </Button>
          */}

          <Link href={`/rnd/documents/new?recipeId=${recipe.recipeId || id}&versionId=${recipe.versionId || id}`}>
            <Button variant="secondary" size="sm">
              <FileDown className="mr-1 h-3.5 w-3.5 text-primary" /> Xuất bản PDF
            </Button>
          </Link>
          {recipe.status === 'Archived' ? (
            <Button
              variant="gold"
              size="sm"
              isLoading={isActivating}
              onClick={handleActivateRecipe}
              title="Khôi phục công thức hoạt động"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Khôi phục
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              onClick={() => setIsArchiveConfirmOpen(true)}
              title="Lưu trữ công thức này"
            >
              <Archive className="w-3.5 h-3.5 mr-1" /> Lưu trữ
            </Button>
          )}

        </div>
      </div>
      </div>

      {errorMsg && (
        <Alert
          type="error"
          message={errorMsg}
          onClose={() => setErrorMsg(null)}
        />
      )}

      {/* Archived Warning Banner */}
      {recipe.status === 'Archived' && (
        <div className="p-4 bg-zinc-100 border border-zinc-300 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 text-zinc-700 text-sm">
            <Archive className="w-4 h-4 text-zinc-500" />
            <span>Công thức này đang ở trạng thái <strong>Lưu trữ</strong> và đang bị khóa chỉnh sửa.</span>
          </div>
          <Button variant="gold" size="sm" isLoading={isActivating} onClick={handleActivateRecipe}>
            Khôi phục hoạt động
          </Button>
        </div>
      )}


      <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-h3 font-medium text-foreground">
          Thông số kỹ thuật
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-secondary p-4">
            <span className="block text-xs text-muted-foreground">Nguyên liệu</span>
            <span className="font-semibold text-foreground">{recipe.ingredients.length}</span>
          </div>
          <div className="rounded-lg border border-border bg-secondary p-4">
            <span className="block text-xs text-muted-foreground">Sản lượng chuẩn</span>
            <span className="font-semibold text-foreground">
              {recipe.targetYield !== null && recipe.yieldUnit ? `${recipe.targetYield} ${recipe.yieldUnit}` : 'Chưa thiết lập'}
            </span>
          </div>
          <div className="rounded-lg border border-border bg-secondary p-4">
            <span className="block text-xs text-muted-foreground">Bước thực hiện</span>
            <span className="font-semibold text-foreground">{recipe.steps.length}</span>
          </div>
          <div className="rounded-lg border border-border bg-secondary p-4">
            <span className="block text-xs text-muted-foreground">Tổng thời gian</span>
            <span className="font-semibold text-foreground">
              {recipe.steps.some((step) => step.durationSeconds) ? `${recipe.steps.reduce((sum, step) => sum + (step.durationSeconds || 0), 0)} giây` : 'Chưa cập nhật'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span>Mã công thức: <strong className="text-foreground">{recipe.code}</strong></span>
          <span>Người khởi tạo: {recipe.creatorEmail || 'Chưa cập nhật'}</span>
          <span>Thời điểm phát hành: {recipe.publishedAt ? new Date(recipe.publishedAt).toLocaleString('vi-VN') : 'Chưa phát hành'}</span>
        </div>

        {recipe.description && (
          <div className="border-t border-border pt-2.5 text-xs text-muted-foreground">
            <span className="mr-1 font-semibold text-foreground">Mô tả hương vị:</span>
            {recipe.description}
          </div>
        )}
      </div>
      {/* Ingredients Section */}
      {mediaWarning && <Alert variant="warning">{mediaWarning}</Alert>}
      <RecipeBatchScaler key={recipe.versionId ?? recipe.id} recipe={recipe} onScaled={setScaledIngredients} />
      <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="flex items-center justify-between font-display text-h3 font-medium text-foreground">
          <span>Định lượng nguyên liệu ({recipe.ingredients.length})</span>
          <span className="text-xs font-normal normal-case text-muted-foreground">
            Định mức: {recipe.targetYield !== null && recipe.yieldUnit ? `${recipe.targetYield} ${recipe.yieldUnit}` : 'Chưa thiết lập'}
          </span>
        </h2>

        {recipe.ingredients.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Chưa có nguyên liệu nào trong công thức.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted text-xs font-semibold text-muted-foreground">
                  <th className="py-2 px-3">STT</th>
                  <th className="py-2 px-3">Mã &amp; Tên nguyên liệu</th>
                  <th className="py-2 px-3">Nhóm</th>
                  <th className="py-2 px-3 text-right">Định lượng</th>
                  <th className="py-2 px-3">Đơn vị</th>
                  <th className="py-2 px-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(scaledIngredients ?? recipe.ingredients).map((item, index) => {
                  const ing = ingredientsMap[item.ingredientId];
                  return (
                    <tr key={index} className="hover:bg-muted">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{index + 1}</td>
                      <td className="py-2 px-3">
                        <span className="mr-2 text-xs text-primary">
                          {ing ? ing.code : 'Chưa cập nhật'}
                        </span>
                        <span className="font-medium text-foreground">
                          {ing ? ing.name : 'Nguyên liệu chưa cập nhật'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {ing ? ing.group : 'Khác'}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-foreground">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{item.unit}</td>
                      <td className="px-3 py-2 text-xs italic text-muted-foreground">
                        {item.notes || 'Chưa cập nhật'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Steps Section */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-h3 font-medium text-foreground">
          Quy trình chuẩn thao tác SOP ({recipe.steps.length} bước)
        </h2>

        {recipe.steps.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Chưa có các bước hướng dẫn thao tác.</p>
        ) : (
          <div className="space-y-3 border-l-2 border-primary/20 pl-4">
            {recipe.steps.map((step, idx) => {
              const stepIngredients = stepIngredientText(scaledIngredients ?? recipe.ingredients, ingredientsMap, step.stepNumber);
              const coverUrl = step.coverMediaAssetId
                ? mediaMap[step.coverMediaAssetId] ||
                  (typeof window !== 'undefined'
                    ? localStorage.getItem(`recipehub_media_url_${step.coverMediaAssetId}`)
                    : null)
                : null;

              return (
                <div
                  key={step.id}
                  className="space-y-2.5 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {idx + 1}
                      </span>
                      <h3 className="text-sm text-foreground font-medium font-display">{step.title}</h3>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {step.durationSeconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-primary" /> {step.durationSeconds}s
                        </span>
                      )}
                      {step.temperatureCelsius && (
                        <span className="flex items-center gap-1">
                          <Thermometer className="w-3 h-3 text-rose-500" /> {step.temperatureCelsius}°C
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap pl-9 text-sm leading-relaxed text-foreground">
                    {step.instruction}
                  </p>
                  {stepIngredients && <p className="pl-9 text-sm text-foreground"><span className="font-medium">Nguyên liệu:</span> {stepIngredients}</p>}

                  <div className="grid grid-cols-1 gap-2 pl-9 pt-1 text-xs text-muted-foreground sm:grid-cols-2">
                    {step.equipment && (
                      <div>
                        <span className="font-semibold text-foreground">Dụng cụ:</span> {step.equipment}
                      </div>
                    )}
                    {step.completionCriteria && (
                      <div>
                        <span className="font-semibold text-foreground">Tiêu chí đạt:</span> {step.completionCriteria}
                      </div>
                    )}
                  </div>


                  {/* Media Preview & Cover Badge */}
                  {coverUrl && (
                    <div className="pl-7 pt-1">
                      <div className="relative inline-block overflow-hidden rounded-md border border-border bg-card shadow-soft">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverUrl}
                          alt={step.title}
                          className="w-32 h-20 object-cover"
                        />
                        <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded text-[9px] bg-black/70 text-white font-medium">
                          Ảnh thao tác
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Copy Recipe Dialog */}
      <Dialog
        isOpen={isCopyDialogOpen}
        onClose={() => {
          if (!copySubmitting) setIsCopyDialogOpen(false);
        }}
        title={`Sao Chép Công Thức ${recipe.code}`}
        description="Bản sao kế thừa dữ liệu hiện tại nhưng là một công thức độc lập với mã và tên riêng."
        confirmLabel="Tạo Bản Sao"
        confirmVariant="gold"
        isConfirming={copySubmitting}
        onConfirm={handleConfirmCopy}
      >
        <div className="space-y-4 py-2">
          {copyError && <Alert type="error" message={copyError} />}
          <TextInput
            label="Mã Công Thức Mới *"
            value={copyCode}
            onChange={(e) => setCopyCode(e.target.value.toUpperCase())}
            placeholder="VD: REC-OLO-COPY"
            helper="Mã viết hoa, không trùng lặp"
          />
          <TextInput
            label="Tên Công Thức Mới *"
            value={copyName}
            onChange={(e) => setCopyName(e.target.value)}
            placeholder="VD: Trà Ô Long Sữa Nóng"
          />
        </div>
      </Dialog>

      {/* Archive Confirm Dialog */}
      <Dialog
        isOpen={isArchiveConfirmOpen}
        onClose={() => {
          if (!isArchiving) setIsArchiveConfirmOpen(false);
        }}
        title={`Lưu Trữ Công Thức ${recipe.code}?`}
        description="Công thức sẽ được đưa vào kho lưu trữ và bị khóa. Bạn vẫn có thể tìm kiếm trong bộ lọc Lưu Trữ và khôi phục lại bất kỳ lúc nào."
        confirmLabel="Xác Nhận Lưu Trữ"
        confirmVariant="danger"
        isConfirming={isArchiving}
        onConfirm={handleArchiveRecipe}
      />

      {/* Version History Drawer */}
      <VersionHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        recipe={recipe}
        versions={versions}
        currentVersionId={recipe.versionId || recipe.id}
        ingredientsMap={ingredientsMap}
        onSelectVersion={(selectedVersion) => {
          setRecipe(selectedVersion);
          setIsHistoryDrawerOpen(false);
        }}
      />
    </div>
  );
}
