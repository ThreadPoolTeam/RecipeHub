'use client';

import { Apple, Candy, Coffee, Leaf, Milk, Package, Sparkles } from 'lucide-react';
import { useState } from 'react';

const groups = {
  'trà': [Leaf, 'bg-success-soft text-success'],
  tea: [Leaf, 'bg-success-soft text-success'],
  'sữa & kem': [Milk, 'bg-info-soft text-info'],
  dairy: [Milk, 'bg-info-soft text-info'],
  'cà phê': [Coffee, 'bg-secondary text-foreground'],
  coffee: [Coffee, 'bg-secondary text-foreground'],
  'trái cây': [Apple, 'bg-success-soft text-success'],
  fruit: [Apple, 'bg-success-soft text-success'],
  'siro & đường': [Candy, 'bg-primary-soft text-primary'],
  sweetener: [Candy, 'bg-primary-soft text-primary'],
  topping: [Sparkles, 'bg-info-soft text-info'],
} as const;

const sizes = {
  sm: 'h-12 w-12',
  md: 'h-20 w-20',
  lg: 'h-40 w-40',
};

export function IngredientThumb({ imageUrl, group, name, size = 'md' }: {
  imageUrl?: string;
  group: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const [Icon, color] = groups[group.trim().toLocaleLowerCase('vi') as keyof typeof groups] ?? [Package, 'bg-secondary text-muted-foreground'];
  return (
    <div className={`${sizes[size]} ${color} flex shrink-0 items-center justify-center overflow-hidden rounded-lg`}>
      {imageUrl && imageUrl !== failedUrl ? (
        // Images can be blob URLs or external media delivery URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" onError={() => setFailedUrl(imageUrl)} />
      ) : <Icon aria-hidden="true" size={size === 'lg' ? 48 : size === 'md' ? 28 : 20} strokeWidth={1.5} />}
    </div>
  );
}
