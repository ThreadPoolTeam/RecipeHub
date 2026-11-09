'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Button, TextInput, Select, Alert } from '@/components/workspace/fields';
import { CodeInput } from '@/components/workspace/code-input';
import { CatalogItem, UnitItem } from '@/lib/api/backend-repository';
import { IngredientPreview } from '@/components/workspace/ingredient-preview';

export default function NewIngredientPage() {
  const router = useRouter();
  const { session, repo, touch } = useDemo();

  const [code, setCode] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<{ code: string; categoryId: string } | null>(null);
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [unitCategories, setUnitCategories] = useState<CatalogItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [unitCategoryId, setUnitCategoryId] = useState('');
  const [defaultUnitId, setDefaultUnitId] = useState('');
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setCatalogueLoading(true);
    Promise.all([repo.getIngredientCategories(), repo.getUnitCategories(), repo.getUnits()])
      .then(([categoryItems, unitCatItems, unitItems]) => {
        if (!isMounted) return;
        const activeCategories = categoryItems.filter((item) => item.state === 'active');
        const activeUnitCats = unitCatItems.filter((item) => item.state === 'active');
        const activeUnits = unitItems.filter((item) => item.state === 'active');
        setCategories(activeCategories);
        setUnitCategories(activeUnitCats);
        setUnits(activeUnits);
        setCategoryId(activeCategories[0]?.id ?? '');

        const firstUnitCatId = activeUnitCats[0]?.id ?? '';
        setUnitCategoryId(firstUnitCatId);
        const catUnits = activeUnits.filter((u) => u.categoryId === firstUnitCatId);
        const baseUnit = catUnits.find((u) => u.isBase) || catUnits[0];
        setDefaultUnitId(baseUnit?.id ?? '');
      })
      .catch((loadError: unknown) => {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh mục từ Recipe Service.');
      })
      .finally(() => {
        if (isMounted) setCatalogueLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [repo]);

  const handleUnitCategoryChange = (nextUnitCatId: string) => {
    setUnitCategoryId(nextUnitCatId);
    const catUnits = units.filter((u) => u.categoryId === nextUnitCatId && u.state === 'active');
    const baseUnit = catUnits.find((u) => u.isBase) || catUnits[0];
    setDefaultUnitId(baseUnit?.id ?? '');
  };

  const canGenerateCode = categories.some((item) => item.id === categoryId && item.state === 'active');

  const handleCategoryChange = (nextCategoryId: string) => {
    if (generatingCode || submitting || nextCategoryId === categoryId) return;
    if (generatedCode && code === generatedCode.code && nextCategoryId !== generatedCode.categoryId) {
      setCode('');
    }
    setGeneratedCode(null);
    setCategoryId(nextCategoryId);
  };

  const handleGenerateCode = async () => {
    if (!session || !canGenerateCode || generatingCode || submitting || catalogueLoading) return;
    setGeneratingCode(true);
    setCodeError(null);
    try {
      const nextCode = await repo.generateIngredientCode(session, categoryId);
      setCode(nextCode);
      setGeneratedCode({ code: nextCode, categoryId });
      touch();
    } catch (error: unknown) {
      setCodeError(error instanceof Error ? error.message : 'Không thể tạo mã nguyên liệu.');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || generatingCode || submitting) return;
    setError(null);

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanCode) {
      setError('Vui lòng nhập mã nguyên liệu (VD: ING-TRA-01).');
      return;
    }
    if (!cleanName) {
      setError('Vui lòng nhập tên nguyên liệu.');
      return;
    }
    if (!categoryId) {
      setError('Chưa có nhóm nguyên liệu đang hoạt động. Hãy tạo nhóm trong trang Đơn vị & Phân nhóm (/rnd/catalogue) trước.');
      return;
    }
    if (!defaultUnitId) {
      setError('Chưa có đơn vị đang hoạt động. Hãy tạo đơn vị trong trang Đơn vị & Phân nhóm (/rnd/catalogue) trước.');
      return;
    }
    const selectedCategory = categories.find((item) => item.id === categoryId);
    if (!selectedCategory) {
      setError(`Nhóm nguyên liệu '${categoryId}' không còn tồn tại trong danh mục đang hoạt động.`);
      return;
    }
    const selectedUnit = units.find((item) => item.id === defaultUnitId);
    if (!selectedUnit) {
      setError(`Đơn vị '${defaultUnitId}' không còn tồn tại trong danh mục đang hoạt động.`);
      return;
    }

    try {
      setSubmitting(true);
      const existing = await repo.getIngredients();
      const isDuplicate = existing.some(
        (item) => item.code.toUpperCase() === cleanCode
      );
      if (isDuplicate) {
        setError(`Mã nguyên liệu "${cleanCode}" đã tồn tại trên hệ thống. Vui lòng chọn mã khác.`);
        setSubmitting(false);
        return;
      }

      await repo.createIngredient(session, {
        code: cleanCode,
        name: cleanName,
        group: selectedCategory.name,
        defaultUnit: selectedUnit.code,
        isActive,
        costPerUnit: 0,
        note: note.trim(),
        categoryId,
        defaultUnitId,
      });

      touch();
      router.push('/rnd/ingredients');
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Lỗi khi lưu nguyên liệu mới.');
      setSubmitting(false);
    }
  };

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
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Thêm nguyên liệu</h1>
        <p className="mt-2 text-sm text-muted-foreground">Chuẩn hóa thông tin và đơn vị định mức trước khi đưa vào công thức.</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(240px,380px)_1fr]">
      <IngredientPreview code={code} name={name} category={categories.find((item) => item.id === categoryId)?.name} unit={units.find((item) => item.id === defaultUnitId)?.code} isActive={isActive} note={note} />
      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-foreground"><span className="mr-3 text-primary">01</span>Thông tin cơ bản</h2>

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
            error={codeError}
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
                label: `${item.code} — ${item.name}${item.isBase ? ' (BASE)' : ''}`,
              }))}
            disabled={catalogueLoading || units.length === 0}
            helper={units.length === 0 && !catalogueLoading ? 'Hãy tạo đơn vị trong trang Đại lượng & Đơn vị đo (/rnd/catalogue).' : 'Tự động lấy đơn vị gốc (BASE)'}
          />
        </div>

        </section>
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-foreground"><span className="mr-3 text-primary">02</span>Cảnh báo &amp; lưu ý</h2>
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
        <section className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-foreground"><span className="mr-3 text-primary">03</span>Ảnh nguyên liệu</h2>
          <p className="text-sm text-muted-foreground">Chưa hỗ trợ chọn ảnh nguyên liệu.</p>
        </section>

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
