'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  Thermometer,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Pencil,
  Send,
  RefreshCw,
  GitFork,
  Archive,
  FileDown,
} from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion, Ingredient, MediaAsset } from '@/lib/demo/types';
import { Button, TextInput, Alert } from '@/components/workspace/fields';
import { StatusBadge } from '@/components/workspace/status-badge';
import { Dialog } from '@/components/workspace/dialog';

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { session, repo, dataVersion, touch } = useDemo();
  const [recipe, setRecipe] = useState<RecipeVersion | null>(null);
  const [ingredientsMap, setIngredientsMap] = useState<Record<string, Ingredient>>({});
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({}); // mediaId -> objectUrl
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Action Loading
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [isCreatingNextVer, setIsCreatingNextVer] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  // Variant Dialog state
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [variantCode, setVariantCode] = useState('');
  const [variantName, setVariantName] = useState('');
  const [variantSubmitting, setVariantSubmitting] = useState(false);
  const [variantError, setVariantError] = useState<string | null>(null);

  // Load Recipe Data
  useEffect(() => {
    if (!session || !id) return;
    let isMounted = true;
    setLoading(true);

    Promise.all([
      repo.getRecipeVersion(session, id),
      repo.getIngredients(),
      repo.getMedia(),
    ])
      .then(([rec, allIngs, mediaList]) => {
        if (!isMounted) return;
        setRecipe(rec);

        const ingDict: Record<string, Ingredient> = {};
        allIngs.forEach((ing) => {
          ingDict[ing.id] = ing;
        });
        setIngredientsMap(ingDict);

        const urlDict: Record<string, string> = {};
        mediaList.forEach((m) => {
          urlDict[m.id] = URL.createObjectURL(m.blob);
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

  // Action: Submit for approval
  const handleSubmitApproval = async () => {
    if (!session || !recipe) return;
    if (recipe.ingredients.length === 0 || recipe.steps.length === 0) {
      setErrorMsg('Công thức cần có ít nhất 1 nguyên liệu và 1 bước quy trình để gửi duyệt.');
      return;
    }

    try {
      setIsSubmittingApproval(true);
      setErrorMsg(null);
      const updated = await repo.submitRecipeForApproval(session, recipe.id);
      setRecipe(updated);
      touch();
      setActionSuccess('Đã gửi công thức lên hàng đợi phê duyệt thành công!');
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Lỗi khi gửi phê duyệt.');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Action: Create Next Version (v2.0, v3.0...)
  const handleCreateNextVersion = async () => {
    if (!session || !recipe) return;
    try {
      setIsCreatingNextVer(true);
      setErrorMsg(null);
      const newVer = await repo.createNextVersion(session, recipe.id);
      touch();
      router.push(`/rnd/recipes/${newVer.id}/edit`);
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Không thể tạo phiên bản mới.');
    } finally {
      setIsCreatingNextVer(false);
    }
  };

  // Action: Create Variant
  const handleOpenVariantDialog = () => {
    if (!recipe) return;
    setVariantCode(`${recipe.code}-VAR`);
    setVariantName(`${recipe.name} (Biến thể)`);
    setVariantError(null);
    setIsVariantDialogOpen(true);
  };

  const handleConfirmVariant = async () => {
    if (!session || !recipe) return;
    const cleanCode = variantCode.trim().toUpperCase();
    const cleanName = variantName.trim();

    if (!cleanCode || !cleanName) {
      setVariantError('Vui lòng nhập đầy đủ mã và tên cho biến thể.');
      return;
    }

    try {
      setVariantSubmitting(true);
      setVariantError(null);
      const variant = await repo.createRecipeVariant(session, recipe.id, cleanCode, cleanName);
      touch();
      setIsVariantDialogOpen(false);
      router.push(`/rnd/recipes/${variant.id}`);
    } catch (err: unknown) {
      const e = err as Error;
      setVariantError(e.message || 'Không thể tạo biến thể.');
    } finally {
      setVariantSubmitting(false);
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
      setActionSuccess('Đã chuyển công thức vào kho lưu trữ (Archived) thành công!');
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Lỗi khi lưu trữ công thức.');
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
      setActionSuccess('Đã khôi phục công thức về trạng thái hoạt động thành công!');
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Lỗi khi khôi phục công thức.');
    } finally {
      setIsActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-[#706E68]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B47820]" />
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E2D9] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#706E68] mb-1">
            <Link href="/rnd/recipes" className="hover:text-[#1A1917] flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3 h-3" /> Công thức R&amp;D
            </Link>
            <span>/</span>
            <span className="font-mono text-[#B47820] font-semibold">{recipe.code}</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1A1917]">{recipe.name}</h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F5F0E8] text-[#B47820] font-semibold border border-[#E8E2D9]">
              {recipe.versionLabel}
            </span>
            <StatusBadge status={recipe.status} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {recipe.status === 'Draft' && (
            <>
              <Link href={`/rnd/recipes/${recipe.id}/edit`}>
                <Button variant="secondary" size="sm">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Chỉnh sửa
                </Button>
              </Link>
              <Button
                variant="gold"
                size="sm"
                isLoading={isSubmittingApproval}
                onClick={handleSubmitApproval}
                title="Gửi bản nháp lên cấp quản lý phê duyệt"
              >
                <Send className="w-3.5 h-3.5 mr-1" /> Gửi duyệt
              </Button>
            </>
          )}

          {recipe.status === 'Approved' && (
            <Button
              variant="gold"
              size="sm"
              isLoading={isCreatingNextVer}
              onClick={handleCreateNextVersion}
              title="Tạo phiên bản nâng cấp tiếp theo"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Tạo bản mới
            </Button>
          )}

          <Button variant="secondary" size="sm" onClick={handleOpenVariantDialog} title="Nhân bản công thức làm biến thể">
            <GitFork className="w-3.5 h-3.5 mr-1 text-[#706E68]" /> Tạo biến thể
          </Button>

          <Link href={`/rnd/recipes/${recipe.id}/document`}>
            <Button variant="secondary" size="sm">
              <FileDown className="w-3.5 h-3.5 mr-1 text-[#B47820]" /> Xuất SOP
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

      {actionSuccess && (
        <Alert
          type="success"
          message={actionSuccess}
          onClose={() => setActionSuccess(null)}
        />
      )}

      {errorMsg && (
        <Alert
          type="error"
          message={errorMsg}
          onClose={() => setErrorMsg(null)}
        />
      )}

      {/* Archived Warning Banner */}
      {recipe.status === 'Archived' && (
        <div className="p-4 bg-zinc-100 border border-zinc-300 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 text-zinc-700 text-sm">
            <Archive className="w-4 h-4 text-zinc-500" />
            <span>Công thức này đang ở trạng thái <strong>Lưu trữ (Archived)</strong> và đang bị khóa chỉnh sửa.</span>
          </div>
          <Button variant="gold" size="sm" isLoading={isActivating} onClick={handleActivateRecipe}>
            Khôi phục hoạt động
          </Button>
        </div>
      )}

      {/* Reviewer Comment Box (Amber Highlight for Returned/Draft feedback) */}
      {recipe.reviewerComment && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Ý kiến thẩm định từ người phê duyệt
          </div>
          <p className="text-sm text-amber-800 font-mono whitespace-pre-wrap pl-6">
            &quot;{recipe.reviewerComment}&quot;
          </p>
          {recipe.reviewedAt && (
            <div className="text-[11px] text-amber-700/80 pl-6 pt-0.5">
              Phản hồi lúc: {new Date(recipe.reviewedAt).toLocaleString('vi-VN')}
            </div>
          )}
        </div>
      )}
      <div className="bg-white border border-[#E8E2D9] rounded-xl p-5 space-y-3 shadow-xs">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#706E68]">
          Thông số kỹ thuật
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-[#8C887F] block">Mã công thức</span>
            <span className="font-mono font-semibold text-[#1A1917]">{recipe.code}</span>
          </div>
          <div>
            <span className="text-xs text-[#8C887F] block">Sản lượng chuẩn</span>
            <span className="font-semibold text-[#1A1917]">
              {recipe.targetYield} {recipe.yieldUnit}
            </span>
          </div>
          <div>
            <span className="text-xs text-[#8C887F] block">Người khởi tạo</span>
            <span className="font-mono text-[#706E68] text-xs">{recipe.creatorEmail}</span>
          </div>
          <div>
            <span className="text-xs text-[#8C887F] block">Lần sửa đổi</span>
            <span className="font-mono text-[#706E68] text-xs">rev #{recipe.revision}</span>
          </div>
        </div>

        {recipe.description && (
          <div className="border-t border-[#E8E2D9] pt-2.5 text-xs text-[#706E68]">
            <span className="font-semibold text-[#1A1917] mr-1">Mô tả hương vị:</span>
            {recipe.description}
          </div>
        )}
      </div>
      {/* Ingredients Section */}
      <div className="bg-white border border-[#E8E2D9] rounded-xl p-5 space-y-3 shadow-xs">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#706E68] flex items-center justify-between">
          <span>Định lượng nguyên liệu ({recipe.ingredients.length})</span>
          <span className="text-xs font-normal normal-case text-[#8C887F]">
            Định mức: {recipe.targetYield} {recipe.yieldUnit}
          </span>
        </h2>

        {recipe.ingredients.length === 0 ? (
          <p className="text-sm text-[#8C887F] italic">Chưa có nguyên liệu nào trong công thức.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[#E8E2D9]">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F5F0E8] border-b border-[#E8E2D9] text-xs text-[#706E68] uppercase tracking-wider font-semibold">
                  <th className="py-2 px-3">STT</th>
                  <th className="py-2 px-3">Mã &amp; Tên nguyên liệu</th>
                  <th className="py-2 px-3">Nhóm</th>
                  <th className="py-2 px-3 text-right">Định lượng</th>
                  <th className="py-2 px-3">Đơn vị</th>
                  <th className="py-2 px-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D9]">
                {recipe.ingredients.map((item, index) => {
                  const ing = ingredientsMap[item.ingredientId];
                  return (
                    <tr key={index} className="hover:bg-[#FAF8F2] transition-colors">
                      <td className="py-2 px-3 font-mono text-xs text-[#A8A29E]">{index + 1}</td>
                      <td className="py-2 px-3">
                        <span className="font-mono text-xs text-[#B47820] mr-2">
                          {ing ? ing.code : '—'}
                        </span>
                        <span className="font-medium text-[#1C1917]">
                          {ing ? ing.name : item.ingredientId}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-[#78716C]">
                        {ing ? ing.group : 'Khác'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#1C1917]">
                        {item.quantity}
                      </td>
                      <td className="py-2 px-3 font-mono text-[#78716C] text-xs">{item.unit}</td>
                      <td className="py-2 px-3 text-xs text-[#78716C] italic">
                        {item.stageNote || item.notes || '—'}
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
      <div className="bg-white border border-[#E8E2D9] rounded-xl p-5 space-y-3 shadow-xs">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#706E68]">
          Quy trình chuẩn thao tác SOP ({recipe.steps.length} bước)
        </h2>

        {recipe.steps.length === 0 ? (
          <p className="text-sm text-[#8C887F] italic">Chưa có các bước hướng dẫn thao tác.</p>
        ) : (
          <div className="space-y-3">
            {recipe.steps.map((step, idx) => {
              const coverUrl = step.coverMediaAssetId ? mediaMap[step.coverMediaAssetId] : null;

              return (
                <div
                  key={step.id}
                  className="bg-[#FAF9F5] border border-[#E8E2D9] rounded-lg p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#C9A84C]/15 text-[#B47820] flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <h3 className="font-bold text-[#1A1917] text-sm">{step.title}</h3>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#706E68] font-mono">
                      {step.durationSeconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#B47820]" /> {step.durationSeconds}s
                        </span>
                      )}
                      {step.temperatureCelsius && (
                        <span className="flex items-center gap-1">
                          <Thermometer className="w-3 h-3 text-rose-500" /> {step.temperatureCelsius}°C
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#1A1917] whitespace-pre-wrap pl-7 leading-relaxed">
                    {step.instruction}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7 pt-1 text-xs text-[#706E68]">
                    {step.equipment && (
                      <div>
                        <span className="font-semibold text-[#1A1917]">Dụng cụ:</span> {step.equipment}
                      </div>
                    )}
                    {step.completionCriteria && (
                      <div>
                        <span className="font-semibold text-[#1A1917]">Tiêu chí đạt:</span> {step.completionCriteria}
                      </div>
                    )}
                  </div>


                  {/* Media Preview & Cover Badge */}
                  {coverUrl && (
                    <div className="pl-7 pt-1">
                      <div className="relative inline-block border border-[#E8E2D9] rounded-md overflow-hidden bg-white shadow-xs">
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

      {/* Create Variant Dialog */}
      <Dialog
        isOpen={isVariantDialogOpen}
        onClose={() => {
          if (!variantSubmitting) setIsVariantDialogOpen(false);
        }}
        title={`Tạo Biến Thể Mới Từ ${recipe.code}`}
        description="Biến thể sẽ kế thừa toàn bộ nguyên liệu và các bước hiện tại nhưng tạo mã và phiên bản độc lập để thử nghiệm nhánh sản phẩm mới."
        confirmLabel="Tạo Biến Thể"
        confirmVariant="gold"
        isConfirming={variantSubmitting}
        onConfirm={handleConfirmVariant}
      >
        <div className="space-y-4 py-2">
          {variantError && <Alert type="error" message={variantError} />}
          <TextInput
            label="Mã Biến Thể Mới *"
            value={variantCode}
            onChange={(e) => setVariantCode(e.target.value.toUpperCase())}
            placeholder="VD: REC-OLO-VAR-HOT"
            helper="Mã viết hoa, không trùng lặp"
          />
          <TextInput
            label="Tên Biến Thể *"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            placeholder="VD: Trà Ô Long Sữa Nóng (Biến Thể Mùa Đông)"
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
        description="Công thức sẽ được đưa vào kho lưu trữ (Archived) và bị khóa. Bạn vẫn có thể tìm kiếm trong bộ lọc Lưu Trữ và khôi phục lại bất kỳ lúc nào."
        confirmLabel="Xác Nhận Lưu Trữ"
        confirmVariant="danger"
        isConfirming={isArchiving}
        onConfirm={handleArchiveRecipe}
      />
    </div>
  );
}
