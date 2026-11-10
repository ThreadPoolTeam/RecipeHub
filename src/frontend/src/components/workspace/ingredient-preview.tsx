import React from 'react';
import { IngredientThumb } from './ingredient-thumb';
import { cardTitleClass } from './page-header';

export function IngredientPreview({ code, name, category, unit, isActive, note, warning, imageUrl }: {
  code: string;
  name: string;
  category?: string;
  unit?: string;
  isActive: boolean;
  note?: string;
  warning?: string;
  imageUrl?: string;
}) {
  return (
    <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-soft">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Xem trước thẻ nguyên liệu</p>
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-secondary"><IngredientThumb imageUrl={imageUrl} group={category ?? ''} name={name || 'Nguyên liệu mới'} size="lg" /></div>
      <p className="mt-4 text-xs text-muted-foreground">{code || 'Chưa có mã'} · {category || 'Chưa chọn loại'}</p>
      <h2 className={`${cardTitleClass} mt-2 text-foreground`}>{name || 'Nguyên liệu mới'}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={isActive ? 'rounded-md bg-success-soft px-2 py-1 text-success' : 'rounded-md bg-muted px-2 py-1 text-muted-foreground'}>{isActive ? 'Đang sử dụng' : 'Ngừng sử dụng'}</span>
        {unit && <span className="text-muted-foreground">Đơn vị mặc định: {unit}</span>}
      </div>
      {warning && <p className="mt-4 rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">{warning}</p>}
      {note && <p className="mt-4 text-sm text-muted-foreground">{note}</p>}
    </aside>
  );
}
