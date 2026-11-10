'use client';

import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button, TextInput, Select, Alert } from '@/components/workspace/fields';
import { CodeInput } from '@/components/workspace/code-input';
import { IngredientPreview } from '@/components/workspace/ingredient-preview';
import { IngredientImageField } from '@/components/workspace/ingredient-image-field';
import { useMediaPreviews } from '@/components/workspace/use-media-previews';
import { pageTitleClass, panelTitleClass } from '@/components/workspace/page-header';
import { useNewIngredientForm } from './use-new-ingredient-form';

export default function NewIngredientPage() {
  const { session, code, setCode, generatingCode, setGeneratedCode, name, setName, categories, unitCategories, units, categoryId, unitCategoryId, defaultUnitId, setDefaultUnitId, isActive, setIsActive, note, setNote, submitting, error, setError, canGenerateCode, handleCategoryChange, handleUnitCategoryChange, handleGenerateCode, handleSubmit, imageAssetId, setImageAssetId, catalogueLoading } = useNewIngredientForm();
  const { previews, addPreview } = useMediaPreviews();

  return (
    <div className="space-y-6 pb-12">
      {/* Back button & Page title */}
      <div>
        <Link
          href="/rnd/ingredients"
          className="mb-2 inline-flex items-center text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Quay lại Kho Nguyên Liệu
        </Link>
        <h1 className={pageTitleClass}>Thêm nguyên liệu</h1>
        <p className="mt-2 text-sm text-muted-foreground">Chuẩn hóa thông tin và đơn vị định mức trước khi đưa vào công thức.</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(240px,380px)_1fr]">
      <IngredientPreview code={code} name={name} category={categories.find((item) => item.id === categoryId)?.name} unit={units.find((item) => item.id === defaultUnitId)?.code} isActive={isActive} note={note} imageUrl={imageAssetId ? previews[imageAssetId] : undefined} />
      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className={panelTitleClass}><span className="mr-3 text-primary">01</span>Thông tin cơ bản</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CodeInput
            label="Mã Nguyên Liệu"
            placeholder="VD: ING-TRA-001"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setGeneratedCode(null);
            }}
            onGenerate={handleGenerateCode}
            generateLabel="Tạo mã nguyên liệu"
            generating={generatingCode}
            generateDisabled={!session || catalogueLoading || !canGenerateCode}
            disabled={submitting}
            helper={canGenerateCode
              ? 'Nhập mã riêng hoặc tạo mã theo nhóm đã chọn. Đổi nhóm sẽ xóa mã vừa tạo nếu chưa sửa tay.'
              : 'Chọn nhóm nguyên liệu đang hoạt động để tạo mã; vẫn có thể nhập mã riêng.'}
            required
          />

          <TextInput
            label="Tên Nguyên Liệu *"
            placeholder="VD: Trà Ô Long Rang Thượng Hạng"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Nhóm Phân Loại *"
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            options={categories.map((item) => ({ value: item.id, label: item.name }))}
            disabled={catalogueLoading || categories.length === 0 || generatingCode || submitting}
            helper={categories.length === 0 && !catalogueLoading ? 'Hãy tạo nhóm nguyên liệu trong trang Đơn vị & Phân nhóm (/rnd/catalogue).' : undefined}
          />

          <Select
            label="Đại Lượng Đo *"
            value={unitCategoryId}
            onChange={(e) => handleUnitCategoryChange(e.target.value)}
            options={unitCategories.map((item) => ({ value: item.id, label: item.name }))}
            disabled={catalogueLoading || unitCategories.length === 0}
            helper="Chọn đại lượng (VD: Khối lượng)"
          />

          <Select
            label="Đơn Vị Định Mức *"
            value={defaultUnitId}
            onChange={(e) => setDefaultUnitId(e.target.value)}
            options={units
              .filter((item) => item.categoryId === unitCategoryId)
              .map((item) => ({
                value: item.id,
                label: `${item.code} · ${item.name}${item.isBase ? ' (BASE)' : ''}`,
              }))}
            disabled={catalogueLoading || units.length === 0}
            helper={units.length === 0 && !catalogueLoading ? 'Hãy tạo đơn vị trong trang Đại lượng & Đơn vị đo (/rnd/catalogue).' : 'Tự động lấy đơn vị gốc (BASE)'}
          />
        </div>

        </section>
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className={panelTitleClass}><span className="mr-3 text-primary">02</span>Cảnh báo &amp; lưu ý</h2>
          <TextInput
            label="Ghi Chú Nhà Cung Cấp / Bảo Quản"
            placeholder="VD: Công ty TNHH Trà Việt - bảo quản nơi khô ráo, kín khí..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <label className="flex items-center gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-input bg-card text-primary focus:ring-ring"
            />
            <div>
              <span className="text-sm font-medium text-foreground">
                Kích hoạt sử dụng ngay
              </span>
              <p className="text-xs text-muted-foreground">
                Nguyên liệu sẽ hiển thị trong danh mục lựa chọn khi xây dựng công thức mới.
              </p>
            </div>
          </label>
        </section>
        <IngredientImageField imageAssetId={imageAssetId} imageUrl={imageAssetId ? previews[imageAssetId] : undefined}
          group={categories.find((item) => item.id === categoryId)?.name ?? ''} name={name}
          disabled={submitting} onChange={setImageAssetId} addPreview={addPreview} />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/rnd/ingredients">
            <Button variant="secondary" type="button" disabled={submitting}>
              Hủy Bỏ
            </Button>
          </Link>
          <Button
            variant="gold"
            type="submit"
            disabled={submitting || generatingCode || catalogueLoading || categories.length === 0 || units.length === 0}
          >
            <Save className="w-4 h-4 mr-1.5" />
            {submitting ? 'Đang lưu...' : 'Lưu Nguyên Liệu'}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
