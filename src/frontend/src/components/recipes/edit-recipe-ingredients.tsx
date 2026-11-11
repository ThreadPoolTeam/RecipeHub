import { Trash2 } from 'lucide-react';
import { Button, Select, TextInput } from '@/components/workspace/fields';
import type { Ingredient, RecipeIngredient } from '@/lib/demo/types';

type Props = {
  ingredients: RecipeIngredient[]; availableIngredients: Ingredient[];
  onAdd: () => void; onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<RecipeIngredient>) => void;
};

export function EditRecipeIngredients({ ingredients, availableIngredients, onAdd, onRemove, onUpdate }: Props) {
  return <section id="recipe-ingredients" className="scroll-mt-24 space-y-4">
    <h2 className="text-lg font-medium font-display"><span className="mr-3 text-primary">02</span>Thành phần &amp; định lượng</h2>
    <p className="text-sm text-muted-foreground">Thay đổi định lượng, đơn vị hoặc giai đoạn sử dụng nguyên liệu.</p>
    {ingredients.length === 0 ? <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">Chưa có nguyên liệu nào.</p> :
      <div className="space-y-3">{ingredients.map((item, idx) => <div key={idx} className="grid items-end gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-12">
        <div className="md:col-span-4"><Select label={`#${idx + 1} Nguyên Liệu`} value={item.ingredientId} onChange={(e) => onUpdate(idx, { ingredientId: e.target.value })} options={availableIngredients.map((ing) => ({ value: ing.id, label: `${ing.code} - ${ing.name}` }))} /></div>
        <div className="md:col-span-2"><TextInput label="Định Lượng" type="number" min="0.1" step="any" value={item.quantity} onChange={(e) => onUpdate(idx, { quantity: Number(e.target.value) || 0 })} /></div>
        <div className="md:col-span-2"><TextInput label="Đơn Vị" value={item.unit} onChange={(e) => onUpdate(idx, { unit: e.target.value })} /></div>
        <div className="md:col-span-3"><TextInput label="Ghi chú giai đoạn" placeholder="VD: Cốt trà nền..." value={item.stageNote || ''} onChange={(e) => onUpdate(idx, { stageNote: e.target.value })} /></div>
        <div className="md:col-span-1"><button type="button" onClick={() => onRemove(idx)} title="Xóa dòng" aria-label={`Xóa nguyên liệu ${idx + 1}`} className="flex h-10 w-full items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" strokeWidth={1.5} /></button></div>
      </div>)}</div>}
    <Button type="button" variant="secondary" size="sm" onClick={onAdd}>+ Thêm Nguyên Liệu</Button>
  </section>;
}
