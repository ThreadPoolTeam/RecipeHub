'use client';

import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button, TextInput, Select, Alert } from '@/components/workspace/fields';
import { CodeInput } from '@/components/workspace/code-input';
import { IngredientPreview } from '@/components/workspace/ingredient-preview';
import { IngredientImageField } from '@/components/workspace/ingredient-image-field';
import { useMediaPreviews } from '@/components/workspace/use-media-previews';
import { pageTitleClass, panelTitleClass } from '@/components/workspace/page-header';
import { useEditIngredientForm } from './use-edit-ingredient-form';

export default function EditIngredientPage() {
  const { session, code, setCode, generatingCode, setGeneratedCode, name, setName, categories, unitCategories, units, categoryId, unitCategoryId, defaultUnitId, setDefaultUnitId, isActive, setIsActive, note, setNote, submitting, error, setError, canGenerateCode, handleCategoryChange, handleUnitCategoryChange, handleGenerateCode, handleSubmit, imageAssetId, setImageAssetId, loading, ingredient } = useEditIngredientForm();
  const { previews, addPreview } = useMediaPreviews();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mb-3 h-8 w-8 motion-safe:animate-spin text-primary" />
        <p className="text-sm">Đang tải thông tin nguyên liệu...</p>
      </div>
    );
  }

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
        <h1 className={pageTitleClass}>Sửa nguyên liệu</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cập nhật thông tin, đơn vị định mức và lưu ý của nguyên liệu.</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(240px,380px)_1fr]">
      <IngredientPreview code={code} name={name} category={categories.find((item) => item.id === categoryId)?.name} unit={units.find((item) => item.id === defaultUnitId)?.code} isActive={isActive} note={note} warning={ingredient?.warning} imageUrl={imageAssetId ? previews[imageAssetId] : undefined} />
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
            generateDisabled={!session || !ingredient || !canGenerateCode}
            disabled={submitting}
            helper={canGenerateCode
              ? 'Nhập mã riêng hoặc tạo mã theo nhóm đã chọn. Đổi nhóm chỉ xóa mã vừa tạo, không xóa mã đã tải hoặc đã sửa tay.'
              : 'Chọn nhóm nguyên liệu đang hoạt động để tạo mã; mã hiện tại vẫn được giữ nguyên.'}
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
            disabled={generatingCode || submitting}
            options={categories
              .filter((item) => item.state === 'active' || item.id === categoryId)
              .map((item) => ({
                value: item.id,
                label: item.state === 'active' ? item.name : `${item.name} (đã ngừng dùng)`,
              }))}
          />

          <Select
            label="Đại Lượng Đo *"
            value={unitCategoryId}
            onChange={(e) => handleUnitCategoryChange(e.target.value)}
            options={unitCategories
              .filter((item) => item.state === 'active' || item.id === unitCategoryId)
              .map((item) => ({
                value: item.id,
                label: item.state === 'active' ? item.name : `${item.name} (đã ngừng dùng)`,
              }))}
          />

          <Select
            label="Đơn Vị Định Mức *"
            value={defaultUnitId}
            onChange={(e) => setDefaultUnitId(e.target.value)}
            options={units
              .filter((item) => item.categoryId === unitCategoryId && (item.state === 'active' || item.id === defaultUnitId))
              .map((item) => ({
                value: item.id,
                label: `${item.code} · ${item.name}${item.isBase ? ' (BASE)' : ''}${item.state === 'active' ? '' : ' (đã ngừng dùng)'}`,
              }))}
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
                Đang kích hoạt sử dụng
              </span>
              <p className="text-xs text-muted-foreground">
                Bật/tắt trạng thái sử dụng nguyên liệu trong việc tạo và điều chỉnh công thức.
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
            disabled={submitting || generatingCode || !ingredient || categories.length === 0 || units.length === 0}
          >
            <Save className="w-4 h-4 mr-1.5" />
            {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
