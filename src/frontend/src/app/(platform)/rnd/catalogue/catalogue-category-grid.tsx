'use client';

import { cardTitleClass } from '@/components/workspace/page-header';
import { interactiveCardClass, stretchedButtonClass } from '@/components/workspace/interactive-card';
import type { CatalogItem, UnitItem } from '@/lib/api/backend-repository';

export type CatalogueGroup = {
  category: CatalogItem;
  units: UnitItem[];
  baseUnit?: UnitItem;
  totalUnits: number;
};

type Props = {
  groups: CatalogueGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function CatalogueCategoryGrid({ groups, selectedId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
      {groups.map(({ category, baseUnit, totalUnits }) => (
        <article key={category.id} className={`${interactiveCardClass} p-4 ${selectedId === category.id ? 'border-primary bg-accent ring-1 ring-primary' : ''}`}>
          <div className="flex items-start justify-between gap-2">
            <h2 className={cardTitleClass}>
              <button type="button" aria-pressed={selectedId === category.id} className={stretchedButtonClass} onClick={() => onSelect(category.id)}>
                {category.name}
              </button>
            </h2>
            <span className={`shrink-0 rounded-md px-2 py-1 text-xs ${category.state === 'active' ? 'bg-success-soft text-success' : 'bg-secondary text-muted-foreground'}`}>
              {category.state === 'active' ? 'Đang dùng' : 'Tạm khóa'}
            </span>
          </div>
          {category.code && <p className="mt-1 text-xs text-muted-foreground">Mã {category.code}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            Đơn vị gốc: {baseUnit?.code ?? 'Chưa có'} · {totalUnits} đơn vị
          </p>
          {category.description && <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>}
        </article>
      ))}
    </div>
  );
}
