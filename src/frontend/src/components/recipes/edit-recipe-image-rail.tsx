import { Camera, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/workspace/fields';

type Props = { imageUrl?: string; hasImage: boolean; onPick: () => void; onAi: () => void; onRemove: () => void; version: string; ingredientCount: number; stepCount: number };
export function EditRecipeImageRail({ imageUrl, hasImage, onPick, onAi, onRemove, version, ingredientCount, stepCount }: Props) {
  return <aside className="space-y-3 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
    <h2 className="text-sm font-semibold">Ảnh thành phẩm</h2>
    <div className="flex aspect-square max-w-52 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-muted-foreground">
      {imageUrl ? <img src={imageUrl} alt="Ảnh bìa thành phẩm" className="h-full w-full object-cover" /> : <div className="text-center text-xs"><Camera className="mx-auto mb-2 h-6 w-6" strokeWidth={1.5} />Chưa có ảnh</div>}
    </div>
    <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
      <Button type="button" variant="secondary" size="sm" onClick={onPick}><Camera className="mr-1 h-4 w-4" strokeWidth={1.5} />Chọn từ thư viện</Button>
      <Button type="button" variant="ghost" size="sm" onClick={onAi}><Sparkles className="mr-1 h-4 w-4" strokeWidth={1.5} />Tạo bằng AI</Button>
      {hasImage && <Button type="button" variant="ghost" size="sm" onClick={onRemove}><Trash2 className="mr-1 h-4 w-4" strokeWidth={1.5} />Gỡ ảnh</Button>}
    </div>
    <div className="border-t border-border pt-4 text-xs text-muted-foreground"><p className="font-medium text-foreground">{version}</p><p className="mt-1">{ingredientCount} nguyên liệu · {stepCount} bước</p></div>
  </aside>;
}
