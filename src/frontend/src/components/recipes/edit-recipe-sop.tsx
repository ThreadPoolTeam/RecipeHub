import { ArrowDown, ArrowUp, Camera, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/workspace/fields';
import type { RecipeStep } from '@/lib/demo/types';

type Props = {
  steps: RecipeStep[]; coverPreviews: Record<string, string>; onAdd: () => void; onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<RecipeStep>) => void; onMove: (index: number, direction: 'up' | 'down') => void;
  onPick: (index: number) => void; onAi: (step: RecipeStep) => void;
};
const input = 'w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
export function EditRecipeSop({ steps, coverPreviews, onAdd, onRemove, onUpdate, onMove, onPick, onAi }: Props) {
  return <section id="recipe-sop" className="scroll-mt-24 space-y-4">
    <h2 className="text-lg font-medium font-display"><span className="mr-3 text-primary">03</span>Quy trình SOP</h2>
    <p className="text-sm text-muted-foreground">Sắp xếp thứ tự bước, cập nhật thông số và chọn ảnh minh họa.</p>
    {steps.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">Chưa có bước thao tác nào.</p>}
    {steps.map((step, idx) => <div key={step.id} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{idx + 1}</span>
        <input aria-label={`Tên bước ${idx + 1}`} className={input} value={step.title} onChange={(e) => onUpdate(idx, { title: e.target.value })} placeholder="Tên bước (VD: Chiết xuất espresso, Đánh bọt sữa...)" />
        <button type="button" disabled={idx === 0} onClick={() => onMove(idx, 'up')} title="Đẩy lên" aria-label="Đẩy lên" className="rounded-md border border-border p-2 disabled:opacity-30"><ArrowUp className="h-4 w-4" strokeWidth={1.5} /></button>
        <button type="button" disabled={idx === steps.length - 1} onClick={() => onMove(idx, 'down')} title="Đẩy xuống" aria-label="Đẩy xuống" className="rounded-md border border-border p-2 disabled:opacity-30"><ArrowDown className="h-4 w-4" strokeWidth={1.5} /></button>
        <button type="button" onClick={() => onRemove(idx)} title="Xóa bước này" aria-label="Xóa bước này" className="rounded-md border border-border p-2 text-destructive"><Trash2 className="h-4 w-4" strokeWidth={1.5} /></button>
      </div>
      <label className="block space-y-1 text-xs font-medium">Hướng dẫn thao tác chi tiết *<textarea className={input} value={step.instruction} onChange={(e) => onUpdate(idx, { instruction: e.target.value })} placeholder="Mô tả kỹ thuật ủ trà, đánh bọt, rót tầng hoặc lắc shaker..." rows={2} /></label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-xs font-medium">Thời gian (giây)<input type="number" placeholder="VD: 30" value={step.durationSeconds || ''} onChange={(e) => onUpdate(idx, { durationSeconds: Number(e.target.value) || undefined })} className={input} /></label>
        <label className="space-y-1 text-xs font-medium">Nhiệt độ (°C)<input type="number" placeholder="VD: 85" value={step.temperatureCelsius || ''} onChange={(e) => onUpdate(idx, { temperatureCelsius: Number(e.target.value) || undefined })} className={input} /></label>
        <label className="space-y-1 text-xs font-medium">Dụng cụ cần dùng<input value={step.equipment || ''} onChange={(e) => onUpdate(idx, { equipment: e.target.value })} placeholder="VD: Bình ủ, nhiệt kế" className={input} /></label>
        <label className="space-y-1 text-xs font-medium">Tiêu chí hoàn thành<input value={step.completionCriteria || ''} onChange={(e) => onUpdate(idx, { completionCriteria: e.target.value })} placeholder="VD: Cốt trà sánh, thơm đậm" className={input} /></label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        {step.coverMediaAssetId && coverPreviews[step.coverMediaAssetId] ? <div className="flex items-center gap-3"><img src={coverPreviews[step.coverMediaAssetId]} alt="Ảnh thao tác" className="h-12 w-16 rounded-md object-cover" /><button type="button" className="text-xs text-destructive underline" onClick={() => onUpdate(idx, { coverMediaAssetId: undefined })}>Gỡ ảnh</button></div> : <span className="text-xs text-muted-foreground">Chưa gắn ảnh thao tác</span>}
        <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" size="sm" onClick={() => onPick(idx)}><Camera className="mr-1 h-4 w-4" strokeWidth={1.5} />Chọn từ thư viện</Button><Button type="button" variant="secondary" size="sm" onClick={() => onAi(step)}><Sparkles className="mr-1 h-4 w-4" strokeWidth={1.5} />AI tạo ảnh thao tác</Button></div>
      </div>
    </div>)}
    <Button type="button" variant="secondary" size="sm" onClick={onAdd}>+ Thêm Bước</Button>
  </section>;
}
