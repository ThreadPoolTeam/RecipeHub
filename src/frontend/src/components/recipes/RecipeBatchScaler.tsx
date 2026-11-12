'use client';

import { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeIngredient, RecipeVersion } from '@/lib/demo/types';
import { UnitTotal } from '@/lib/api/backend-repository';
import { Alert, Button } from '@/components/workspace/fields';
import { UnitConversionModal } from '@/components/shared/UnitConversionModal';

export function RecipeBatchScaler({ recipe, onScaled }: { recipe: RecipeVersion; onScaled: (lines: RecipeIngredient[] | null) => void }) {
  const { repo, touch } = useDemo();
  const [multiplier, setMultiplier] = useState('1');
  const [totals, setTotals] = useState<UnitTotal[]>([]);
  const [appliedYield, setAppliedYield] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasYield = recipe.targetYield !== null && recipe.targetYield > 0 && !!recipe.yieldUnit;

  useEffect(() => {
    onScaled(null);
    setTotals([]);
    setAppliedYield(null);
    setError('');
    if (!hasYield || !recipe.ingredients.length) return;
    const factor = Number(multiplier);
    if (!multiplier.trim() || !Number.isFinite(factor) || factor <= 0) {
      setError('Hệ số nhân phải là số lớn hơn 0.');
      setLoading(false);
      return;
    }
    const quantity = recipe.targetYield! * factor;
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const scaled = await repo.scaleRecipe(recipe.ingredients, recipe.targetYield!, quantity, controller.signal);
        const calculated = await repo.calculateTotals(scaled.ingredients, controller.signal);
        if (controller.signal.aborted) return;
        onScaled(scaled.ingredients);
        setTotals(calculated);
        setAppliedYield(scaled.targetYield);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Không thể tính quy mô mẻ.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [multiplier, recipe, hasYield, repo, onScaled]);

  const pick = (value: string) => { setMultiplier(value); touch(); };

  return <section className="space-y-2 rounded-xl border border-border bg-card px-4 py-3" aria-label="Nhân định lượng">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium font-display text-foreground"><Scale className="h-4 w-4 text-primary" strokeWidth={1.5} />Nhân định lượng</h2>
        {hasYield && <div className="flex items-center gap-1.5">
          {[1, 2, 5, 10].map(m => <Button key={m} size="sm" variant={Number(multiplier) === m ? 'gold' : 'secondary'} onClick={() => pick(String(m))}>{m}x</Button>)}
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <span aria-hidden>Khác</span>
            <input type="number" min="0.000001" step="any" inputMode="decimal" aria-label="Hệ số nhân tùy chọn" value={multiplier}
              onChange={e => pick(e.target.value)} className="h-8 w-16 rounded-md border border-border bg-background px-2 text-sm tabular-nums text-foreground" />
          </label>
        </div>}
      </div>
      <UnitConversionModal />
    </div>
    {!hasYield ? <p className="text-xs text-muted-foreground">Cần thiết lập sản lượng chuẩn và đơn vị trước khi nhân định lượng.</p> : <>
      {error && <Alert variant="error">{error}</Alert>}
      <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
        {loading ? 'Đang tính định lượng...' : appliedYield !== null
          ? <>Thành phẩm <strong className="text-foreground">{appliedYield.toLocaleString('vi-VN', { maximumFractionDigits: 6 })} {recipe.yieldUnit}</strong> (chuẩn {recipe.targetYield} {recipe.yieldUnit}). Tổng: {totals.map(total => `${total.quantity.toLocaleString('vi-VN', { maximumFractionDigits: 6 })} ${total.unit}`).join(' · ')}. Chỉ để pha chế, không lưu vào công thức.</>
          : 'Chọn hệ số để nhân định lượng trong bảng nguyên liệu. Chỉ để pha chế, không lưu vào công thức.'}
      </p>
    </>}
  </section>;
}
