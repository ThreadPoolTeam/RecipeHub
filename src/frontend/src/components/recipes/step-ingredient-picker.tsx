'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { Ingredient, RecipeIngredient } from '@/lib/demo/types';
import { parseStepLinks } from '@/lib/recipe-step-links';

type Props = {
  ingredients: RecipeIngredient[];
  availableIngredients: Ingredient[];
  step: number;
  onChange: (index: number, selected: boolean) => void;
};

const normalize = (text: string) => text.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

export function StepIngredientPicker({ ingredients, availableIngredients, step, onChange }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rows = ingredients.map((item, index) => {
    const name = availableIngredients.find((ingredient) => ingredient.id === item.ingredientId)?.name || 'Nguyên liệu chưa cập nhật';
    return { index, name, selected: parseStepLinks(item.stageNote).includes(step) };
  });
  const duplicateNames = new Set(rows.filter((row, index) => rows.some((other, otherIndex) => otherIndex !== index && other.name === row.name)).map((row) => row.name));
  const selected = rows.filter((row) => row.selected);
  const matches = rows.filter((row) => normalize(`${row.name} ${ingredients[row.index].notes || ''}`).includes(normalize(query.trim())));
  const visible = query.trim() ? matches : matches.slice(0, 5);
  const activeIndex = Math.min(active, visible.length - 1);

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const toggle = (index: number, isSelected: boolean) => {
    onChange(index, !isSelected);
    setQuery('');
    setActive(0);
  };

  return <div ref={root} className="relative space-y-1" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label htmlFor={id} className="block text-xs font-medium">Nguyên liệu dùng ở bước này</label>
    <div className="flex min-h-10 flex-wrap items-center gap-1 rounded-md bg-secondary p-2 transition-colors focus-within:bg-accent">
      {selected.map((row) => <span key={row.index} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
        {row.name}{duplicateNames.has(row.name) && <span className="text-muted-foreground">· {ingredients[row.index].quantity} {ingredients[row.index].unit}</span>}
        <button type="button" aria-label={`Bỏ ${row.name}${duplicateNames.has(row.name) ? ` ${ingredients[row.index].quantity} ${ingredients[row.index].unit}` : ''}`} onClick={() => onChange(row.index, false)} className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">×</button>
      </span>)}
      <input id={id} role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
        aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${visible[activeIndex].index}` : undefined}
        value={query} placeholder="Tìm nguyên liệu" className="min-w-32 flex-1 !border-0 bg-transparent text-sm ![box-shadow:none] ![outline:0] focus:![box-shadow:none] focus:![outline:0] focus-visible:![outline:0]"
        onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { setOpen(false); return; }
          if (event.key === 'Backspace' && !query && selected.length) { onChange(selected[selected.length - 1].index, false); return; }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true);
            setActive((current) => visible.length ? (current + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length : 0);
          } else if (event.key === 'Enter' && open && activeIndex >= 0) {
            event.preventDefault(); toggle(visible[activeIndex].index, visible[activeIndex].selected);
          }
        }} />
    </div>
    {open && <div className="absolute z-20 mt-1 w-full rounded-md bg-popover p-1 shadow-lift">
      <div id={`${id}-list`} role="listbox" aria-multiselectable="true" aria-label={`Nguyên liệu cho bước ${step}`} className="max-h-60 overflow-y-auto">
        {visible.map((row, index) => <div id={`${id}-option-${row.index}`} key={row.index} role="option" aria-selected={row.selected}
          onMouseDown={(event) => event.preventDefault()} onClick={() => toggle(row.index, row.selected)}
          onMouseMove={() => setActive(index)} className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm ${row.selected ? `bg-primary text-primary-foreground ${index === activeIndex ? 'brightness-90' : ''}` : index === activeIndex ? 'bg-accent' : ''}`}>
          <span className="min-w-0 flex-1">{row.name}{duplicateNames.has(row.name) && <span className={`ml-1 text-xs ${row.selected ? "opacity-80" : "text-muted-foreground"}`}>· {ingredients[row.index].quantity} {ingredients[row.index].unit}</span>}</span>
          {row.selected && <Check aria-hidden="true" size={16} strokeWidth={1.5} className="shrink-0" />}
        </div>)}
      </div>
      {!rows.length ? <p className="px-3 py-2 text-sm text-muted-foreground">Thêm nguyên liệu ở mục 02 trước</p> : !matches.length ? <p className="px-3 py-2 text-sm text-muted-foreground">Không thấy nguyên liệu nào khớp...</p> : !query.trim() && matches.length > 5 ? <p className="px-3 py-2 text-xs text-muted-foreground">Còn {matches.length - 5} nguyên liệu nữa. Gõ để tìm</p> : null}
    </div>}
  </div>;
}
