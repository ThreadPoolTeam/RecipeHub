'use client';

import Link from 'next/link';
import { Coffee } from 'lucide-react';
import type { RecipeVersion } from '@/lib/demo/types';
import { StatusBadge } from '@/components/workspace/status-badge';
import { interactiveCardClass, stretchedLinkClass } from '@/components/workspace/interactive-card';

interface RecipeCardProps {
  item: RecipeVersion;
  coverUrl: string | null;
  selectionId: string;
  selected: boolean;
  onToggleSelected: (selectionId: string) => void;
}

export function RecipeCard({ item, coverUrl, selectionId, selected, onToggleSelected }: RecipeCardProps) {
  return (
    <article className={`overflow-hidden ${interactiveCardClass}`}>
      <div className="relative aspect-[4/3] bg-muted">
        {coverUrl ? <img src={coverUrl} alt={item.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; const icon = e.currentTarget.parentElement?.querySelector('.fallback-coffee'); if (icon) (icon as HTMLElement).style.display = 'block'; }} /> : null}
        <Coffee className={`fallback-coffee absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-muted-foreground ${coverUrl ? 'hidden' : 'block'}`} />
        <input
          type="checkbox"
          aria-label={`Chọn ${item.name}`}
          checked={selected}
          onChange={() => onToggleSelected(selectionId)}
          className="absolute right-3 top-3 z-10 h-6 w-6 cursor-pointer accent-primary"
        />
      </div>
      <div className="space-y-2 p-5">
        <p className="text-xs text-muted-foreground">{item.code} · {item.versionLabel}</p>
        <h2 className="font-display text-lg font-medium">
          <Link
            href={`/rnd/recipes/${item.id}`}
            className={stretchedLinkClass}
          >
            {item.name}
          </Link>
        </h2>
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={item.status} /><span className="text-xs text-muted-foreground">{item.creatorEmail ? item.creatorEmail.split('@')[0] : 'Chưa cập nhật'} · {new Date(item.updatedAt).toLocaleDateString('vi-VN')}</span></div>
        <p className="text-xs text-muted-foreground">{item.ingredients?.length ?? 'Chưa cập nhật'} nguyên liệu · {item.steps?.length ?? 'Chưa cập nhật'} bước</p>
        {item.description && <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>}
      </div>
    </article>
  );
}
