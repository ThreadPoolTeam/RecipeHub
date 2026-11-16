import { Dialog } from '@/components/workspace/dialog';
import { MediaLibrary } from '@/components/workspace/media-library';
import type { MediaAsset } from '@/lib/demo/types';

type Props = { isOpen: boolean; isPickingHeroCover: boolean; onClose: () => void; onSelect: (asset: MediaAsset) => void };
export function EditRecipeMediaDialog({ isOpen, isPickingHeroCover, onClose, onSelect }: Props) {
  return <Dialog isOpen={isOpen} onClose={onClose}
    title={isPickingHeroCover ? 'Chọn Ảnh Bìa Thành Phẩm Từ Thư Viện' : 'Chọn Ảnh Thao Tác Từ Kho Phương Tiện'}
    description="Chọn ảnh thực tế hoặc ảnh AI minh họa đã lưu trong thư viện.">
    <div className="max-h-[70vh] overflow-y-auto py-2"><MediaLibrary mode="picker" onSelect={onSelect} /></div>
  </Dialog>;
}
