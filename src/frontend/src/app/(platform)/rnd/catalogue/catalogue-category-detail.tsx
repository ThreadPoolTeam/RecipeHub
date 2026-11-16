'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/workspace/fields';
import { CodeChip, EditIconButton, StateToggle } from '@/components/workspace/catalog-ui';
import { sectionTitleClass } from '@/components/workspace/page-header';
import type { CatalogItem, UnitItem } from '@/lib/api/backend-repository';
import type { CatalogueGroup } from './catalogue-category-grid';

type Props = {
  group: CatalogueGroup;
  togglingId: string | null;
  onToggle: (kind: 'unit-category' | 'unit', item: CatalogItem) => void;
  onEditCategory: (category: CatalogItem) => void;
  onEditUnit: (unit: UnitItem) => void;
  onAddUnit: (id: string) => void;
};

function formatConversionFactor(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('vi-VN')
    : value.toLocaleString('vi-VN', { maximumFractionDigits: 8 });
}

function UnitScale({ units }: { units: UnitItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const dragging = useRef(false);
  const [capacity, setCapacity] = useState(0);
  const [position, setPosition] = useState<number | null>(null);
  const canSort = units.every((unit) => unit.offsetToBase === 0 && Number.isFinite(unit.factorToBase) && unit.factorToBase > 0);
  const ordered = canSort ? [...units].sort((a, b) => b.factorToBase - a.factorToBase) : units;
  const baseIndex = ordered.findIndex((unit) => unit.isBase);
  const slots = Math.max(1, capacity);
  const max = Math.max(0, ordered.length - slots);
  const centeredBase = Math.max(0, Math.min(max, baseIndex - Math.floor(slots / 2)));
  const start = Math.max(0, Math.min(max, position ?? centeredBase));
  const scrollable = canSort && capacity > 0 && max > 0;
  const rangeText = `Đang xem đơn vị ${start + 1} đến ${Math.min(start + slots, ordered.length)} trên ${ordered.length}`;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setCapacity(Math.max(1, Math.floor((entry.contentRect.width + 8) / 70))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (sliderRef.current) sliderRef.current.value = String(start);
  }, [start, scrollable]);

  const preview = (value: number) => {
    const nearest = Math.max(0, Math.min(max, Math.round(value)));
    const text = `Đang xem đơn vị ${nearest + 1} đến ${Math.min(nearest + slots, ordered.length)} trên ${ordered.length}`;
    if (rowRef.current) rowRef.current.style.transform = `translateX(-${value * 70}px)`;
    sliderRef.current?.setAttribute('aria-valuetext', text);
    if (captionRef.current) captionRef.current.textContent = text;
  };

  const finishDrag = () => {
    if (!dragging.current || !sliderRef.current) return;
    dragging.current = false;
    const next = Math.round(Number(sliderRef.current.value));
    sliderRef.current.value = String(next);
    if (rowRef.current) rowRef.current.style.transitionDuration = '';
    preview(next);
    setPosition(next);
  };

  return (
    <div ref={containerRef} className="min-w-0">
      {canSort && <div className="mb-2 flex justify-between text-[11px] text-muted-foreground"><span>Lớn nhất</span><span>Nhỏ nhất</span></div>}
      <div className="overflow-hidden" style={scrollable ? { maxWidth: `${slots * 70 - 8}px` } : undefined}>
        <div ref={rowRef} className="flex gap-2 transition-transform duration-100 ease-out motion-reduce:transition-none" style={scrollable ? { transform: `translateX(-${start * 70}px)` } : undefined}>
          {ordered.map((unit) => (
            <div key={unit.id} title={`${unit.code} · ${unit.name}`} className={`flex h-[50px] min-w-0 flex-col justify-center rounded-md border px-1 ${canSort ? 'w-[62px] shrink-0' : 'w-[62px] shrink'} ${unit.isBase ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground'}`}>
              <p className="w-full truncate text-base font-semibold leading-5">{unit.code}</p>
              <p className={`w-full truncate text-[10px] leading-3 ${unit.isBase ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{unit.isBase ? 'Cơ sở' : unit.name}</p>
            </div>
          ))}
        </div>
      </div>
      {scrollable && (
        <>
          <div className="relative mt-4">
            <input
              ref={sliderRef} type="range" min={0} max={max} step="any" defaultValue={start}
              aria-label="Xem các đơn vị khác" aria-valuetext={rangeText}
              onPointerDown={() => {
                dragging.current = true;
                if (rowRef.current) rowRef.current.style.transitionDuration = '0ms';
              }}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onInput={(event) => {
                const value = Number(event.currentTarget.value);
                if (dragging.current) preview(value);
                else { const next = Math.round(value); event.currentTarget.value = String(next); preview(next); setPosition(next); }
              }}
              onKeyDown={(event) => {
                const delta = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1
                  : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1
                    : event.key === 'PageUp' ? slots : event.key === 'PageDown' ? -slots : 0;
                if (delta || event.key === 'Home' || event.key === 'End') {
                  event.preventDefault();
                  const next = event.key === 'Home' ? 0 : event.key === 'End' ? max : Math.max(0, Math.min(max, start + delta));
                  event.currentTarget.value = String(next);
                  preview(next);
                  setPosition(next);
                }
              }}
              className="block h-4 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-border [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
            />
            {baseIndex >= 0 && (
              <button type="button" onClick={() => setPosition(centeredBase)} style={{ left: `calc(8px + (100% - 16px) * ${baseIndex / (ordered.length - 1)})` }} className="absolute top-[18px] -translate-x-1/2 whitespace-nowrap px-1 pt-1 text-[10px] text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring before:absolute before:left-1/2 before:top-0 before:h-1 before:w-px before:bg-primary">
                Cơ sở
              </button>
            )}
          </div>
          <p ref={captionRef} className="mt-6 text-[11px] text-muted-foreground">{rangeText}</p>
        </>
      )}
    </div>
  );
}

export function CatalogueCategoryDetail({ group, togglingId, onToggle, onEditCategory, onEditUnit, onAddUnit }: Props) {
  const { category, units, baseUnit, totalUnits } = group;

  return (
    <section aria-labelledby={`unit-category-${category.id}`} className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-soft">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`unit-category-${category.id}`} className={sectionTitleClass}>{category.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Mã {category.code}{category.description && <> · {category.description}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StateToggle
            active={category.state === 'active'}
            disabled={togglingId === category.id}
            onToggle={() => onToggle('unit-category', category)}
            subject={`đại lượng "${category.name}"`}
          />
          <EditIconButton label="Chỉnh sửa đại lượng" onClick={() => onEditCategory(category)} />
        </div>
      </header>

      {units.length > 0 && (
        <div className="mt-5 rounded-lg bg-secondary p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Thang quy đổi</p>
          <UnitScale key={category.id} units={units} />
        </div>
      )}

      {units.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {totalUnits === 0 ? 'Chưa có đơn vị nào trong đại lượng này.' : 'Không có đơn vị nào khớp bộ lọc.'}
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="border-b border-border bg-secondary text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Đơn vị</th>
                <th className="px-4 py-3 font-medium">Quy đổi về đơn vị gốc</th>
                <th className="px-4 py-3 font-medium">Số lẻ</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((unit) => (
                <tr key={unit.id} className="hover:bg-accent">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CodeChip>{unit.code}</CodeChip>
                      <span className="font-semibold text-foreground">{unit.name}</span>
                      {unit.isBase && <span className="rounded-md bg-info-soft px-2 py-1 text-xs text-info">Đơn vị gốc</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums">
                    {unit.isBase ? 'Chuẩn quy đổi' : baseUnit
                      ? `1 ${unit.code} = ${formatConversionFactor(unit.factorToBase)} ${baseUnit.code}`
                      : 'Chưa có đơn vị gốc'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{unit.decimalPlaces} chữ số</td>
                  <td className="px-4 py-3">
                    <StateToggle
                      active={unit.state === 'active'}
                      disabled={togglingId === unit.id}
                      onToggle={() => onToggle('unit', unit)}
                      subject={`đơn vị "${unit.name}"`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <EditIconButton label="Chỉnh sửa đơn vị" onClick={() => onEditUnit(unit)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {category.state === 'active' && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={() => onAddUnit(category.id)}>
            <Plus className="mr-1 h-4 w-4" strokeWidth={1.5} /> Thêm đơn vị {category.name.toLowerCase()}
          </Button>
        </div>
      )}
    </section>
  );
}
