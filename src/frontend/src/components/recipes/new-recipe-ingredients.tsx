'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { Button, TextInput, Select } from '@/components/workspace/fields';
import { Ingredient, RecipeIngredient } from '@/lib/demo/types';

type Props = {
  availableIngredients: Ingredient[]; recipeIngredients: RecipeIngredient[];
  handleAddIngredient: () => void; handleRemoveIngredient: (index: number) => void;
  handleUpdateIngredient: (index: number, patch: Partial<RecipeIngredient>) => void;
};

export function NewRecipeIngredients({ availableIngredients, recipeIngredients, handleAddIngredient, handleRemoveIngredient, handleUpdateIngredient }: Props) {
  return (
    <section id="ingredients" className="scroll-mt-24 space-y-5 border-t border-border pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg text-foreground font-medium font-display"><span className="mr-3 text-primary">02</span>Thành phần &amp; định lượng ({recipeIngredients.length})</h2>
          <p className="mt-1 text-sm text-muted-foreground">Chọn nguyên liệu từ kho chuẩn, nhập định lượng (&gt; 0) và phân tách giai đoạn nếu cần.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={handleAddIngredient} disabled={availableIngredients.length === 0}>+ Thêm Nguyên Liệu</Button>
      </div>
      {availableIngredients.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
          Kho nguyên liệu đang trống. Hãy vào mục <Link href="/rnd/ingredients" className="font-medium text-primary underline">Kho Nguyên Liệu</Link> để tạo trước.
        </div>
      ) : recipeIngredients.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted p-8 text-center text-muted-foreground">
          <p className="text-sm">Chưa có nguyên liệu nào được thêm vào công thức này.</p>
          <Button type="button" variant="secondary" size="sm" onClick={handleAddIngredient}>+ Thêm Nguyên Liệu Đầu Tiên</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {recipeIngredients.map((item, idx) => (
            <div key={idx} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-12">
              <div className="md:col-span-4"><Select label={`#${idx + 1} Nguyên Liệu`} value={item.ingredientId}
                onChange={(e) => handleUpdateIngredient(idx, { ingredientId: e.target.value })}
                options={availableIngredients.map((ing) => ({ value: ing.id, label: `${ing.code} - ${ing.name} (${ing.defaultUnit})` }))} /></div>
              <div className="md:col-span-2"><TextInput label="Định Lượng" type="number" min="0.1" step="any" value={item.quantity}
                onChange={(e) => handleUpdateIngredient(idx, { quantity: Number(e.target.value) || 0 })} /></div>
              <div className="md:col-span-2"><TextInput label="Đơn Vị" value={item.unit}
                onChange={(e) => handleUpdateIngredient(idx, { unit: e.target.value })} /></div>
              <div className="md:col-span-3"><TextInput label="Giai đoạn / Ghi chú" placeholder="VD: Cốt trà nền / Topping sau cùng" value={item.stageNote || ''}
                onChange={(e) => handleUpdateIngredient(idx, { stageNote: e.target.value })} /></div>
              <div className="md:col-span-1"><button type="button" onClick={() => handleRemoveIngredient(idx)} title="Xóa nguyên liệu" aria-label={`Xóa nguyên liệu ${idx + 1}`}
                className="flex h-10 w-full items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-destructive-soft hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Trash2 className="h-4 w-4" strokeWidth={1.5} /></button></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
