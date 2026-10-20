'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  RotateCcw,
  Clock,
  Thermometer,
  Wrench,
  ArrowLeft,
} from 'lucide-react';
import { RecipeVersion, Ingredient } from '@/lib/demo/types';
import { useDemo } from '@/lib/demo/provider';
import { canApproveRecipe } from '@/lib/demo/permissions';
import { StatusBadge, MediaSourceBadge } from './status-badge';
import { Button, TextArea, Alert } from './fields';

interface ApprovalWorkspaceProps {
  recipeId: string;
}

export function ApprovalWorkspace({ recipeId }: ApprovalWorkspaceProps) {
  const router = useRouter();
  const { session, repo, touch } = useDemo();

  const [recipe, setRecipe] = useState<RecipeVersion | null>(null);
  const [ingredientsMap, setIngredientsMap] = useState<Map<string, Ingredient>>(new Map());
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      repo.getRecipeVersion(session!, recipeId),
      repo.getIngredients(),
    ])
      .then(([rec, ings]) => {
        if (!isMounted) return;
        setRecipe(rec);
        setIngredientsMap(new Map(ings.map((i) => [i.id, i])));
      })
      .catch((err) => {
        if (isMounted) setErrorMsg(err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [repo, session, recipeId]);

  if (isLoading || !recipe) {
    return (
      <div className="p-12 text-center text-[#706E68]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B47820]"></div>
        <p className="mt-3 text-xs">Đang tải hồ sơ thẩm định công thức...</p>
      </div>
    );
  }

  const isAuthor = session?.email === recipe.creatorEmail;
  const isPending = recipe.status === 'PendingApproval';
  const canApprove = session ? canApproveRecipe(session, recipe) : false;

  const handleApprove = async () => {
    if (!session) return;
    touch();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await repo.approveRecipe(session, recipe.id, comment);
      setSuccessMsg('Đã phê duyệt công thức thành công!');
      const updated = await repo.getRecipeVersion(session, recipe.id);
      setRecipe(updated);
      setTimeout(() => router.push('/approvals'), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Phê duyệt thất bại';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!session) return;
    if (!comment.trim()) {
      setErrorMsg('Bắt buộc phải nhập lý do/nhận xét khi trả về công thức yêu cầu chỉnh sửa!');
      return;
    }

    touch();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await repo.returnRecipe(session, recipe.id, comment);
      setSuccessMsg('Đã trả về công thức cho tác giả kèm lý do yêu cầu chỉnh sửa!');
      const updated = await repo.getRecipeVersion(session, recipe.id);
      setRecipe(updated);
      setTimeout(() => router.push('/approvals'), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Trả về thất bại';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E2D9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#F5F0E8] text-[#B47820] border border-[#E8E2D9]">
              {recipe.code}
            </span>
            <span className="text-xs text-[#706E68]">{recipe.versionLabel}</span>
            <StatusBadge status={recipe.status} />
          </div>
          <h2 className="text-2xl font-extrabold text-[#1A1917] mt-1">{recipe.name}</h2>
          <p className="text-xs text-[#706E68] mt-0.5">
            Tác giả: <span className="text-[#1A1917] font-medium">{recipe.creatorEmail}</span> • Thời điểm gửi:{' '}
            {recipe.submittedAt ? new Date(recipe.submittedAt).toLocaleString('vi-VN') : 'Chưa gửi'}
          </p>
        </div>

      </div>
      {errorMsg && (
        <Alert variant="error" title="Lỗi thao tác">
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" title="Thành công">
          {successMsg}
        </Alert>
      )}

      {/* Author Invariant Warning */}
      {isAuthor && isPending && (
        <Alert
          variant="warning"
          title="Quy tắc kiểm soát chất lượng (Quality Gate Invariant)"
        >
          Bạn là người tạo công thức này ({recipe.creatorEmail}). Theo quy định hệ thống, tác giả không được tự phê duyệt chính mình để đảm bảo tính khách quan sensory. Cần một chuyên viên có quyền duyệt khác thẩm định.
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Formula & SOP Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description & Yield */}
            <div className="p-5 bg-white border border-[#E8E2D9] rounded-xl space-y-3 shadow-xs">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#706E68]">
                Mục tiêu sản lượng &amp; Giới thiệu
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs bg-[#FAF9F5] p-3 rounded-lg border border-[#E8E2D9]">
                <div>
                  <span className="text-[#706E68]">Sản lượng chuẩn:</span>{' '}
                  <span className="font-bold text-[#1A1917]">
                    {recipe.targetYield} {recipe.yieldUnit}
                  </span>
                </div>
                <div>
                  <span className="text-[#706E68]">Mã liên kết biến thể:</span>{' '}
                  <span className="text-[#1A1917]">{recipe.sourceRecipeId || 'Công thức gốc (Master)'}</span>
                </div>
              </div>
              {recipe.description && (
                <p className="text-xs text-[#706E68] leading-relaxed italic">
                  &ldquo;{recipe.description}&rdquo;
                </p>
              )}
            </div>

            {/* Ingredients Table */}
            <div className="p-5 bg-white border border-[#E8E2D9] rounded-xl space-y-3 shadow-xs">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#706E68]">
                1. Định lượng nguyên liệu ({recipe.ingredients.length} thành phần)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8E2D9] text-[#706E68] font-semibold">
                      <th className="pb-2">STT</th>
                      <th className="pb-2">Tên nguyên liệu</th>
                      <th className="pb-2">Mã NL</th>
                      <th className="pb-2">Định lượng</th>
                      <th className="pb-2">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2D9]">
                    {recipe.ingredients.map((ing, idx) => {
                      const item = ingredientsMap.get(ing.ingredientId);
                      return (
                        <tr key={idx} className="hover:bg-[#FAF9F5]">
                          <td className="py-2.5 text-[#706E68]">{idx + 1}</td>
                          <td className="py-2.5 font-medium text-[#1A1917]">
                            {item?.name || 'Nguyên liệu'}
                          </td>
                          <td className="py-2.5 text-[#706E68] font-mono">{item?.code || '-'}</td>
                          <td className="py-2.5 font-bold text-[#B47820]">
                            {ing.quantity} {ing.unit}
                          </td>
                          <td className="py-2.5 text-[#706E68]">{ing.notes || ing.stageNote || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Steps & SOP */}
            <div className="p-5 bg-white border border-[#E8E2D9] rounded-xl space-y-4 shadow-xs">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#706E68]">
                2. Quy trình pha chế chuẩn ({recipe.steps.length} bước SOP)
              </h4>
              <div className="space-y-4">
                {recipe.steps.map((step) => (
                  <div
                    key={step.id}
                    className="p-4 bg-[#FAF9F5] rounded-lg border border-[#E8E2D9] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1A1917]">
                        Bước {step.stepNumber}: {step.title}
                      </span>
                      <div className="flex items-center gap-3 text-[#706E68] text-[11px] font-mono">
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
                        {step.equipment && (
                          <span className="flex items-center gap-1">
                            <Wrench className="w-3 h-3 text-[#706E68]" /> {step.equipment}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[#1A1917] leading-relaxed">{step.instruction}</p>

                    {step.completionCriteria && (
                      <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-800 text-[11px]">
                        <strong>Tiêu chí đạt:</strong> {step.completionCriteria}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Review Decision Panel */}
          <div className="space-y-4">
            <div className="p-5 bg-white border border-[#E8E2D9] rounded-xl space-y-4 shadow-xs sticky top-24">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#1A1917]">
                Quyết Định Phê Duyệt
              </h4>
              <p className="text-xs text-[#706E68]">
                Thẩm định công thức dựa trên chuẩn Sensory, độ an toàn vệ sinh và chi phí nguyên liệu.
              </p>

              {recipe.reviewerComment && (
                <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#E8E2D9] text-xs space-y-1">
                  <span className="font-semibold text-[#1A1917]">Nhận xét thẩm định trước đó:</span>
                  <p className="text-[#706E68] italic">&ldquo;{recipe.reviewerComment}&rdquo;</p>
                </div>
              )}

              {isPending ? (
                <div className="space-y-4 pt-2">
                  <TextArea
                    label="Nhận xét / Góp ý chuyên môn"
                    required={false}
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Nhập đánh giá sensory, lưu ý kỹ thuật hoặc lý do yêu cầu chỉnh sửa..."
                  />

                  <div className="space-y-2">
                    <Button
                      variant="gold"
                      size="md"
                      className="w-full flex items-center justify-center gap-1.5"
                      disabled={!canApprove}
                      isLoading={isSubmitting}
                      onClick={handleApprove}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Phê Duyệt Công Thức
                    </Button>

                    <Button
                      variant="danger"
                      size="md"
                      className="w-full flex items-center justify-center gap-1.5"
                      disabled={isAuthor}
                      isLoading={isSubmitting}
                      onClick={handleReturn}
                    >
                      <RotateCcw className="w-4 h-4" /> Trả Về Yêu Cầu Sửa
                    </Button>
                  </div>

                  {!canApprove && (
                    <p className="text-[11px] text-zinc-500 text-center">
                      {isAuthor
                        ? 'Tác giả không thể tự phê duyệt'
                        : 'Yêu cầu tài khoản có quyền canApprove'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-zinc-900 rounded border border-zinc-800 text-xs text-zinc-400 text-center space-y-2">
                  <p>
                    Công thức hiện ở trạng thái <StatusBadge status={recipe.status} />.
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Chỉ hồ sơ ở trạng thái Chờ Duyệt (PendingApproval) mới có thể thực hiện thẩm định.
                  </p>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}
