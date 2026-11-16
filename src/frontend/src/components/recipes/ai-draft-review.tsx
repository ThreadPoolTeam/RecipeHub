'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Clock, FlaskConical, Sparkles, Thermometer, Utensils } from 'lucide-react';
import { Alert, Button } from '@/components/workspace/fields';
import { EmptyState } from '@/components/workspace/empty-state';
import { cardTitleClass, panelTitleClass, sectionTitleClass } from '@/components/workspace/page-header';
import { useToast } from '@/components/workspace/toast';
import {
  describeAiDraftError,
  labelBeverageFamily,
  labelServingStyle,
  type AiRecipeDraft,
} from '@/lib/api/recipe-ai-draft';
import { useDemo } from '@/lib/demo/provider';

const QUANTITY_FORMAT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const DEFAULT_BATCH_NOTE = 'Giá trị mặc định của hệ thống: 1 ly, 500 ml. Chưa được R&D xác nhận.';

export interface AiDraftReviewProps {
  draft: AiRecipeDraft;
  onRestart: () => void;
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  if (seconds < 60) return `${seconds} giây`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} giờ` : `${hours} giờ ${rest} phút`;
}

function formatTemperature(celsius: number | null): string | null {
  if (celsius === null) return null;
  return `${QUANTITY_FORMAT.format(celsius)} °C`;
}

export function AiDraftReview({ draft, onRestart }: AiDraftReviewProps) {
  const { session, repo, touch } = useDemo();
  const { toast } = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isEmpty = draft.ingredients.length === 0 || draft.steps.length === 0;
  const ingredientNameByCode = useMemo(
    () => new Map(draft.ingredients.map((item) => [item.ingredientCode, item.name])),
    [draft.ingredients]
  );

  const handleSave = async () => {
    if (!session || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const code = await repo.generateRecipeCode(session);
      const recipe = await repo.createRecipe(session, {
        code,
        name: draft.name.trim(),
        description: draft.description || undefined,
        targetYield: draft.yield.quantity,
        yieldUnit: draft.yield.unitCode,
        ingredients: draft.ingredients.map((item, index) => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unit: item.unitCode,
          order: index + 1,
          stageNote: item.stageName ?? undefined,
          notes: item.note ?? undefined,
        })),
        steps: draft.steps.map((step, index) => ({
          id: `ai-draft-step-${index + 1}`,
          stepNumber: index + 1,
          title: step.title,
          instruction: step.description,
          durationSeconds: step.durationSeconds ?? undefined,
          temperatureCelsius: step.temperatureCelsius ?? undefined,
          equipment: step.equipment.length > 0 ? step.equipment.join(', ') : undefined,
          notes: step.safetyNote ?? undefined,
          completionCriteria: step.completionCriteria || undefined,
        })),
      });
      touch();
      toast({
        type: 'success',
        title: 'Đã lưu bản nháp',
        description: `${recipe.code} · ${recipe.name}`,
      });
      router.push(`/rnd/recipes/${recipe.id}`);
    } catch (error: unknown) {
      setSaveError(describeAiDraftError(error));
    } finally {
      setSaving(false);
    }
  };

  if (isEmpty) {
    return (
      <EmptyState
        title="Bản nháp chưa có nội dung"
        description="AI không trả về đủ nguyên liệu và bước pha để lưu. Bạn hãy thử tạo lại với tên món hoặc mô tả rõ hơn."
        action={
          <Button type="button" variant="primary" onClick={onRestart}>
            Tạo bản nháp mới
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <Alert
        type="info"
        title="Bản nháp do AI tạo. Số lượng là ước tính, chưa kiểm thử vị. R&D cần nếm và chỉnh trước khi dùng."
        message={DEFAULT_BATCH_NOTE}
      />

      <section className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-pill font-medium uppercase tracking-[0.06em] text-muted-foreground">Tên món AI đề xuất</p>
            <h2 className={sectionTitleClass}>{draft.name}</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-info-soft px-2.5 py-1 text-pill font-medium text-info">
            <Sparkles className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
            Nội dung do AI tạo
          </span>
        </div>

        {draft.description && <p className="text-body text-foreground">{draft.description}</p>}

        <dl className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-pill font-medium uppercase tracking-[0.06em] text-muted-foreground">Nhóm đồ uống</dt>
            <dd className="mt-1 text-body text-foreground">{labelBeverageFamily(draft.beverageFamily)}</dd>
          </div>
          <div>
            <dt className="text-pill font-medium uppercase tracking-[0.06em] text-muted-foreground">Kiểu phục vụ</dt>
            <dd className="mt-1 text-body text-foreground">{labelServingStyle(draft.servingStyle)}</dd>
          </div>
          <div>
            <dt className="text-pill font-medium uppercase tracking-[0.06em] text-muted-foreground">Số ly</dt>
            <dd className="mt-1 text-body text-foreground tabular-nums">{draft.servings}</dd>
          </div>
          <div>
            <dt className="text-pill font-medium uppercase tracking-[0.06em] text-muted-foreground">Thể tích ước tính</dt>
            <dd className="mt-1 text-body text-foreground tabular-nums">
              {QUANTITY_FORMAT.format(draft.estimatedTotalVolumeMl)} ml
            </dd>
          </div>
        </dl>

        <p className="text-body-sm text-muted-foreground">
          Sản lượng AI đề xuất:{' '}
          <span className="font-medium text-foreground tabular-nums">
            {QUANTITY_FORMAT.format(draft.yield.quantity)} {draft.yield.unitCode}
          </span>
          {draft.yield.note ? ` · ${draft.yield.note}` : ''}
        </p>
      </section>

      <section aria-labelledby="ai-draft-ingredients-title" className="space-y-3">
        <h2 id="ai-draft-ingredients-title" className={cardTitleClass}>Nguyên liệu</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-soft">
          <table className="w-full min-w-[640px] border-collapse text-body">
            <thead className="bg-secondary">
              <tr>
                <th scope="col" className="h-14 px-4 text-left font-medium text-foreground">Nguyên liệu</th>
                <th scope="col" className="h-14 px-4 text-left font-medium text-foreground">
                  Định lượng
                  <span className="block text-pill font-normal text-muted-foreground">AI ước tính</span>
                </th>
                <th scope="col" className="h-14 px-4 text-left font-medium text-foreground">Giai đoạn</th>
                <th scope="col" className="h-14 px-4 text-left font-medium text-foreground">Mục đích</th>
              </tr>
            </thead>
            <tbody>
              {draft.ingredients.map((item, index) => (
                <tr key={`${item.ingredientCode}-${index}`} className="border-t border-border align-top hover:bg-accent">
                  <td className="px-4 py-4">
                    <span className="block font-medium text-foreground">{item.name}</span>
                    {item.note && <span className="mt-0.5 block text-body-sm text-muted-foreground">{item.note}</span>}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="font-medium text-foreground tabular-nums">
                      {QUANTITY_FORMAT.format(item.quantity)}
                    </span>{' '}
                    <span className="text-muted-foreground">{item.unitCode}</span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{item.stageName ?? 'Chưa cập nhật'}</td>
                  <td className="px-4 py-4 text-muted-foreground">{item.purpose || 'Chưa cập nhật'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="ai-draft-steps-title" className="space-y-3">
        <h2 id="ai-draft-steps-title" className={cardTitleClass}>Các bước pha</h2>
        <ol className="space-y-3">
          {draft.steps.map((step) => {
            const duration = formatDuration(step.durationSeconds);
            const temperature = formatTemperature(step.temperatureCelsius);
            const usedIngredients = step.ingredientCodes.map(
              (code) => ingredientNameByCode.get(code) ?? 'Không xác định'
            );
            return (
              <li
                key={`${step.order}-${step.title}`}
                className="flex gap-4 rounded-lg border border-border bg-card p-4 shadow-soft"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-body font-semibold text-primary tabular-nums">
                  {step.order}
                </span>
                <div className="min-w-0 space-y-3">
                  <div>
                    <h3 className={panelTitleClass}>{step.title}</h3>
                    <p className="mt-1 text-body text-muted-foreground">{step.description}</p>
                  </div>

                  {(duration || temperature || step.equipment.length > 0) && (
                    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-body-sm text-muted-foreground">
                      {duration && (
                        <li className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                          <span className="tabular-nums">{duration}</span>
                        </li>
                      )}
                      {temperature && (
                        <li className="inline-flex items-center gap-1.5">
                          <Thermometer className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                          <span className="tabular-nums">{temperature}</span>
                        </li>
                      )}
                      {step.equipment.length > 0 && (
                        <li className="inline-flex items-start gap-1.5">
                          <Utensils className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                          <span>{step.equipment.join(' · ')}</span>
                        </li>
                      )}
                    </ul>
                  )}

                  {usedIngredients.length > 0 && (
                    <p className="text-body-sm text-muted-foreground">
                      Nguyên liệu dùng ở bước này: {usedIngredients.join(' · ')}
                    </p>
                  )}

                  {step.completionCriteria && (
                    <p className="flex items-start gap-1.5 text-body-sm text-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" strokeWidth={1.5} aria-hidden="true" />
                      <span>Đạt khi: {step.completionCriteria}</span>
                    </p>
                  )}

                  {step.safetyNote && (
                    <p className="flex items-start gap-1.5 rounded-md bg-destructive-tint px-3 py-2 text-body-sm text-destructive">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                      <span>Lưu ý an toàn: {step.safetyNote}</span>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {draft.qualityChecks.length > 0 && (
        <section aria-labelledby="ai-draft-quality-title" className="space-y-3">
          <h2 id="ai-draft-quality-title" className={cardTitleClass}>Kiểm tra chất lượng</h2>
          <ul className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-soft">
            {draft.qualityChecks.map((check, index) => (
              <li key={`${check}-${index}`} className="flex items-start gap-2 text-body text-foreground">
                <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {draft.servingInstructions && (
        <section aria-labelledby="ai-draft-serving-title" className="space-y-3">
          <h2 id="ai-draft-serving-title" className={cardTitleClass}>Hướng dẫn phục vụ</h2>
          <p className="rounded-lg border border-border bg-card p-4 text-body text-foreground shadow-soft">
            {draft.servingInstructions}
          </p>
        </section>
      )}

      {saveError && <Alert type="error" title="Chưa lưu được bản nháp" message={saveError} />}

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm text-muted-foreground">
          Lưu bằng luồng tạo công thức hiện có. Bản lưu ở trạng thái nháp, chưa phát hành.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={onRestart} disabled={saving}>
            Tạo bản nháp khác
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} isLoading={saving}>
            Lưu bản nháp
          </Button>
        </div>
      </div>
    </div>
  );
}
