'use client';

import { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeIngredient, RecipeVersion } from '@/lib/demo/types';
import { UnitTotal } from '@/lib/api/backend-repository';
import { Alert, Button, TextInput } from '@/components/workspace/fields';
import { UnitConversionModal } from '@/components/shared/UnitConversionModal';

export function RecipeBatchScaler({ recipe, onScaled }: { recipe: RecipeVersion; onScaled: (lines: RecipeIngredient[] | null) => void }) {
  const { repo, touch } = useDemo();
  const [target, setTarget] = useState(String(recipe.targetYield ?? ''));
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
    const quantity = Number(target);
    if (!target.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      setError('Sản lượng mong muốn phải là số hữu hạn lớn hơn 0.');
      setLoading(false);
      return;
    }
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
  }, [target, recipe, hasYield, repo, onScaled]);

  return <section className="rounded-2xl border border-[#E8E2D9] bg-[#FAF9F5] p-4 sm:p-5 space-y-4" aria-label="Tính quy mô mẻ">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-[#1A1917] flex items-center gap-2"><Scale className="w-4 h-4 text-[#B47820]" />Tính quy mô mẻ</h2>
      <UnitConversionModal />
    </div>
    {!hasYield ? <p className="text-sm text-[#706E68]">Cần thiết lập sản lượng chuẩn và đơn vị trước khi tính quy mô mẻ.</p> : <>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <TextInput label={`Sản lượng mong muốn (${recipe.yieldUnit})`} type="number" min="0.000001" step="any" value={target}
          onChange={e => { setTarget(e.target.value); touch(); }} helper={`Mẻ chuẩn: ${recipe.targetYield} ${recipe.yieldUnit}`} />
        <div className="flex gap-2 flex-wrap pb-1">
          {[1, 2, 5, 10].map(multiplier => <Button key={multiplier} size="sm" variant={Number(target) === recipe.targetYield! * multiplier ? 'gold' : 'secondary'}
            onClick={() => { setTarget(String(recipe.targetYield! * multiplier)); touch(); }}>{multiplier === 1 ? 'Mẻ chuẩn' : `${multiplier}x`}</Button>)}
        </div>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      <div role="status" aria-live="polite" className="text-xs text-[#706E68] space-y-1">
        {loading ? <p>Đang tính định lượng...</p> : appliedYield !== null ? <>
          <p>Đang hiển thị mẻ <strong className="text-[#1A1917]">{appliedYield} {recipe.yieldUnit}</strong> ({(appliedYield / recipe.targetYield!).toLocaleString('vi-VN', { maximumFractionDigits: 6 })}x).</p>
          <p>Tổng theo đơn vị: {totals.map(total => `${total.quantity.toLocaleString('vi-VN', { maximumFractionDigits: 6 })} ${total.unit}`).join(' · ')}</p>
        </> : <p>Bảng đang hiển thị định lượng mẻ chuẩn.</p>}
        <p>Scale chỉ dùng để pha chế, không lưu thay đổi vào công thức chuẩn.</p>
      </div>
    </>}
  </section>;
}
