import Link from 'next/link';
import { IngredientThumb } from '@/components/workspace/ingredient-thumb';
import { cardActionClass, interactiveCardClass, stretchedLinkClass } from '@/components/workspace/interactive-card';
import { cardTitleClass } from '@/components/workspace/page-header';
import type { Ingredient } from '@/lib/demo/types';

export function IngredientCard({ item, imageUrl }: {
  item: Ingredient;
  imageUrl?: string;
}) {
  return (
    <article className={`${interactiveCardClass} flex flex-col gap-4 p-4`}>
      <div className="flex items-start gap-3">
        <IngredientThumb imageUrl={imageUrl} group={item.group} name={item.name} />
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground">{item.code} · {item.group}</p>
          <Link href={`/rnd/ingredients/${item.id}/edit`} className={`${stretchedLinkClass} ${cardTitleClass} text-foreground`}>
            {item.name}
          </Link>
          <p className="text-xs text-muted-foreground">Đơn vị mặc định: {item.defaultUnit}</p>
        </div>
      </div>
      <div className={`${cardActionClass} flex flex-wrap items-center gap-2 text-xs`}>
        <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-pill font-medium ${item.isActive ? 'bg-success-soft text-success' : 'bg-secondary text-muted-foreground'}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {item.isActive ? 'Đang dùng' : 'Tạm khóa'}
        </span>
        {item.warning && <span className="rounded-md bg-destructive-soft px-2 py-1 text-destructive">{item.warning}</span>}
      </div>
    </article>
  );
}
