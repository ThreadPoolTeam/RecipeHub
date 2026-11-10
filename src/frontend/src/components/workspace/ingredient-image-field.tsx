'use client';

import { useState } from 'react';
import { Button } from '@/components/workspace/fields';
import { Dialog } from '@/components/workspace/dialog';
import { IngredientThumb } from '@/components/workspace/ingredient-thumb';
import { MediaLibrary } from '@/components/workspace/media-library';
import type { MediaAsset } from '@/lib/demo/types';
import { panelTitleClass } from './page-header';

type Props = {
  imageAssetId: string | null;
  imageUrl?: string;
  group: string;
  name: string;
  disabled?: boolean;
  onChange: (id: string | null) => void;
  addPreview: (id: string, url: string) => void;
};

export function IngredientImageField({ imageAssetId, imageUrl, group, name, disabled, onChange, addPreview }: Props) {
  const [open, setOpen] = useState(false);
  const handleSelect = (asset: MediaAsset) => {
    if (asset.mimeType && !asset.mimeType.startsWith('image/')) return;
    const url = asset.blob?.size ? URL.createObjectURL(asset.blob) : asset.deliveryUrl;
    if (url) addPreview(asset.id, url);
    onChange(asset.id);
    setOpen(false);
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h2 className={panelTitleClass}><span className="mr-3 text-primary">03</span>Ảnh nguyên liệu</h2>
      <div className="flex flex-wrap items-center gap-4">
        <IngredientThumb imageUrl={imageUrl} group={group} name={name} size="lg" />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={disabled} onClick={() => setOpen(true)}>Chọn từ thư viện</Button>
          {imageAssetId && <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange(null)}>Gỡ ảnh</Button>}
        </div>
      </div>
      <Dialog isOpen={open} onClose={() => setOpen(false)} title="Chọn ảnh nguyên liệu" description="Chọn ảnh từ thư viện." maxWidth="4xl">
        <MediaLibrary mode="picker" selectedMediaId={imageAssetId ?? undefined} onSelect={handleSelect} />
      </Dialog>
    </section>
  );
}
