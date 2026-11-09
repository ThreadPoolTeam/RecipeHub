'use client';

import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { Button, TextArea, TextInput } from '@/components/workspace/fields';
import { RecipeStep } from '@/lib/demo/types';

type Props = {
  steps: RecipeStep[]; handleAddStep: () => void; handleRemoveStep: (index: number) => void;
  handleUpdateStep: (index: number, patch: Partial<RecipeStep>) => void;
  handleMoveStep: (index: number, direction: 'up' | 'down') => void;
};

export function NewRecipeSop({ steps, handleAddStep, handleRemoveStep, handleUpdateStep, handleMoveStep }: Props) {
  return (
    <section id="sop" className="scroll-mt-24 space-y-5 border-t border-border pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground"><span className="mr-3 text-primary">03</span>Quy trình SOP ({steps.length})</h2>
          <p className="mt-1 text-sm text-muted-foreground">Mô tả chi tiết từng thao tác, thời gian khuấy/ủ, nhiệt độ và tiêu chí hoàn thành.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={handleAddStep}>+ Thêm Bước Thao Tác</Button>
      </div>
      {steps.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted p-8 text-center text-muted-foreground">
          <p className="text-sm">Chưa có bước thao tác nào.</p>
          <Button type="button" variant="secondary" size="sm" onClick={handleAddStep}>+ Tạo Bước Đầu Tiên</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div key={step.id} className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex flex-wrap items-center gap-3 border-b border-border bg-secondary p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{idx + 1}</span>
                <input type="text" aria-label={`Tên bước ${idx + 1}`} className="min-w-0 flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={step.title} placeholder="Tên bước (VD: Chiết xuất espresso, Đánh bọt sữa...)" onChange={(e) => handleUpdateStep(idx, { title: e.target.value })} />
                <div className="flex items-center gap-1">
                  <button type="button" disabled={idx === 0} onClick={() => handleMoveStep(idx, 'up')} title="Di chuyển lên" aria-label="Di chuyển lên" className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-ring"><ArrowUp className="h-4 w-4" strokeWidth={1.5} /></button>
                  <button type="button" disabled={idx === steps.length - 1} onClick={() => handleMoveStep(idx, 'down')} title="Di chuyển xuống" aria-label="Di chuyển xuống" className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-ring"><ArrowDown className="h-4 w-4" strokeWidth={1.5} /></button>
                  <button type="button" onClick={() => handleRemoveStep(idx)} title="Xóa bước này" aria-label="Xóa bước này" className="rounded-md p-2 text-muted-foreground hover:bg-destructive-soft hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="h-4 w-4" strokeWidth={1.5} /></button>
                </div>
              </div>
              <div className="space-y-4 p-4">
                <TextArea id={`step-instruction-${idx}`} label="Hướng dẫn thao tác chi tiết *" placeholder="Mô tả kỹ thuật ủ trà, đánh bọt, rót tầng hoặc lắc shaker..." value={step.instruction}
                  onChange={(e) => handleUpdateStep(idx, { instruction: e.target.value })} rows={2} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <TextInput id={`step-duration-${idx}`} label="Thời gian (giây)" type="number" placeholder="VD: 30" value={step.durationSeconds || ''}
                    onChange={(e) => handleUpdateStep(idx, { durationSeconds: Number(e.target.value) || undefined })} />
                  <TextInput id={`step-temperature-${idx}`} label="Nhiệt độ (°C)" type="number" placeholder="VD: 85" value={step.temperatureCelsius || ''}
                    onChange={(e) => handleUpdateStep(idx, { temperatureCelsius: Number(e.target.value) || undefined })} />
                  <TextInput id={`step-equipment-${idx}`} label="Dụng cụ cần dùng" type="text" placeholder="VD: Bình ủ, nhiệt kế" value={step.equipment || ''}
                    onChange={(e) => handleUpdateStep(idx, { equipment: e.target.value })} />
                  <TextInput id={`step-completion-${idx}`} label="Tiêu chí hoàn thành" type="text" placeholder="VD: Cốt trà sánh, thơm đậm" value={step.completionCriteria || ''}
                    onChange={(e) => handleUpdateStep(idx, { completionCriteria: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
