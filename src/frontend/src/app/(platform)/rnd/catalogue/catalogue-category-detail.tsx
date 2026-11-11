'use client';

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

export function CatalogueCategoryDetail({ group, togglingId, onToggle, onEditCategory, onEditUnit, onAddUnit }: Props) {
  const { category, units, baseUnit, totalUnits } = group;

  return (
    <section aria-labelledby={`unit-category-${category.id}`} className="rounded-lg border border-border bg-card p-5 shadow-soft">
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
          <div className="flex flex-wrap gap-2">
            {units.map((unit) => (
              <div key={unit.id} className={`rounded-lg border px-4 py-3 text-center ${unit.isBase ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground'}`}>
                <p className="text-lg font-medium">{unit.code}</p>
                <p className="text-xs">{unit.name}{unit.isBase && ' · Cơ sở'}</p>
              </div>
            ))}
          </div>
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
