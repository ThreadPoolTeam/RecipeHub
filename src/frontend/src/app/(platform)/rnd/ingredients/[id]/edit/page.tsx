'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Ingredient } from '@/lib/demo/types';
import { Button, TextInput, Select, Alert } from '@/components/workspace/fields';
import { CodeInput } from '@/components/workspace/code-input';
import { CatalogItem, UnitItem } from '@/lib/api/backend-repository';
import { IngredientPreview } from '@/components/workspace/ingredient-preview';

export default function EditIngredientPage() {
  const router = useRouter();
  const params = useParams();
  const ingredientId = params.id as string;
  const { session, repo, touch } = useDemo();

  const [loading, setLoading] = useState(true);
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);

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
  const [isActive, setIsActive] = useState(true);
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadIngredient() {
      try {
        setLoading(true);
        const [list, categoryItems, unitCategoryItems, unitItems] = await Promise.all([
          repo.getIngredients(),
          repo.getIngredientCategories(),
          repo.getUnitCategories(),
          repo.getUnits(),
        ]);
        const found = list.find((item) => item.id === ingredientId);
        if (!found) {
          if (isMounted) setError('Không tìm thấy nguyên liệu yêu cầu.');
          return;
        }

        if (isMounted) {
          setIngredient(found);
          setCategories(categoryItems);
          setUnitCategories(unitCategoryItems);
          setUnits(unitItems);
          setCode(found.code);
          setGeneratedCode(null);
          setName(found.name);
          setCategoryId(found.categoryId ?? '');
          setDefaultUnitId(found.defaultUnitId ?? '');
          const currentUnit = unitItems.find((u) => u.id === found.defaultUnitId);
          setUnitCategoryId(currentUnit?.categoryId ?? unitCategoryItems[0]?.id ?? '');
          setIsActive(found.isActive);
          setNote(found.note || '');
        }
      } catch (err: unknown) {
        const e = err as Error;
        if (isMounted) setError(e.message || 'Lỗi khi tải thông tin nguyên liệu.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (ingredientId) {
      loadIngredient();
    }
    return () => {
      isMounted = false;
    };
  }, [ingredientId, repo]);

  const handleUnitCategoryChange = (nextUnitCatId: string) => {
    setUnitCategoryId(nextUnitCatId);
    const catUnits = units.filter((u) => u.categoryId === nextUnitCatId && (u.state === 'active' || u.id === defaultUnitId));
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
    if (!session || !ingredient || !canGenerateCode || generatingCode || submitting) return;
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
    if (!session || !ingredient || generatingCode || submitting) return;
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
    const selectedCategory = categories.find((item) => item.id === categoryId && item.state === 'active');
    if (!selectedCategory) {
      setError('Hãy chọn một nhóm nguyên liệu đang hoạt động.');
      return;
    }
    const selectedUnit = units.find((item) => item.id === defaultUnitId && item.state === 'active');
    if (!selectedUnit) {
      setError('Hãy chọn một đơn vị đang hoạt động.');
      return;
    }

    try {
      setSubmitting(true);
      const existing = await repo.getIngredients();
      const isDuplicate = existing.some(
        (item) => item.id !== ingredient.id && item.code.toUpperCase() === cleanCode
      );
      if (isDuplicate) {
        setError(`Mã nguyên liệu "${cleanCode}" đã trùng với nguyên liệu khác.`);
        setSubmitting(false);
        return;
      }

      await repo.updateIngredient(session, ingredient.id, {
        code: cleanCode,
        name: cleanName,
        group: selectedCategory.name,
        defaultUnit: selectedUnit.code,
        isActive,
        costPerUnit: ingredient.costPerUnit || 0,
        note: note.trim(),
        categoryId,
        defaultUnitId,
      });

      touch();
      router.push('/rnd/ingredients');
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Lỗi khi cập nhật nguyên liệu.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
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
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Sửa nguyên liệu</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cập nhật thông tin, đơn vị định mức và lưu ý của nguyên liệu.</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(240px,380px)_1fr]">
      <IngredientPreview code={code} name={name} category={categories.find((item) => item.id === categoryId)?.name} unit={units.find((item) => item.id === defaultUnitId)?.code} isActive={isActive} note={note} warning={ingredient?.warning} />
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
            generateDisabled={!session || !ingredient || !canGenerateCode}
            disabled={submitting}
            helper={canGenerateCode
              ? 'Nhập mã riêng hoặc tạo mã theo nhóm đã chọn. Đổi nhóm chỉ xóa mã vừa tạo, không xóa mã đã tải hoặc đã sửa tay.'
              : 'Chọn nhóm nguyên liệu đang hoạt động để tạo mã; mã hiện tại vẫn được giữ nguyên.'}
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
                label: `${item.code} — ${item.name}${item.isBase ? ' (BASE)' : ''}${item.state === 'active' ? '' : ' (đã ngừng dùng)'}`,
              }))}
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
                Đang kích hoạt sử dụng
              </span>
              <p className="text-xs text-muted-foreground">
                Bật/tắt trạng thái sử dụng nguyên liệu trong việc tạo và điều chỉnh công thức.
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
