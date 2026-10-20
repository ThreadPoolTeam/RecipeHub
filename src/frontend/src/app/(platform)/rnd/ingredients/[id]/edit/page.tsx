'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FlaskConical, Save, Loader2 } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Ingredient } from '@/lib/demo/types';
import { Button, TextInput, Select, Alert } from '@/components/workspace/fields';
import { CatalogItem, UnitItem } from '@/lib/api/backend-repository';

export default function EditIngredientPage() {
  const router = useRouter();
  const params = useParams();
  const ingredientId = params.id as string;
  const { session, repo, touch } = useDemo();

  const [loading, setLoading] = useState(true);
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [categoryId, setCategoryId] = useState('');
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
        const [list, categoryItems, unitItems] = await Promise.all([
          repo.getIngredients(),
          repo.getIngredientCategories(),
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
          setUnits(unitItems);
          setCode(found.code);
          setName(found.name);
          setCategoryId(found.categoryId ?? '');
          setDefaultUnitId(found.defaultUnitId ?? '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !ingredient) return;
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
      <div className="flex flex-col items-center justify-center py-20 text-[#706E68]">
        <Loader2 className="w-8 h-8 animate-spin text-[#B47820] mb-3" />
        <p className="text-sm">Đang tải thông tin nguyên liệu...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Back button & Page title */}
      <div>
        <Link
          href="/rnd/ingredients"
          className="inline-flex items-center text-xs font-medium text-[#706E68] hover:text-[#1A1917] mb-2 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Quay lại Kho Nguyên Liệu
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F5F0E8] border border-[#E8E2D9] flex items-center justify-center text-[#B47820] shadow-2xs">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1A1917]">
              Chỉnh Sửa Nguyên Liệu
            </h1>
            <p className="text-xs sm:text-sm text-[#706E68]">
              Cập nhật thông số tiêu chuẩn cho mã nguyên liệu: <span className="font-mono text-[#B47820] font-semibold">{ingredient?.code}</span>
            </p>
          </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E8E2D9] rounded-2xl p-6 shadow-xs space-y-6"
      >
        <div className="border-b border-[#E8E2D9] pb-4">
          <h2 className="text-base font-semibold text-[#1A1917]">Thông Tin Cơ Bản</h2>
          <p className="text-xs text-[#706E68] mt-0.5">
            Thay đổi mã định danh, tên và đơn vị đo chuẩn của nguyên liệu.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput
            label="Mã Nguyên Liệu *"
            placeholder="VD: ING-TRA-01"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            helper="Mã viết hoa, không trùng lặp"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Nhóm Phân Loại *"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categories
              .filter((item) => item.state === 'active' || item.id === categoryId)
              .map((item) => ({
                value: item.id,
                label: item.state === 'active' ? item.name : `${item.name} (đã ngừng dùng)`,
              }))}
          />

          <Select
            label="Đơn Vị Tính Tiêu Chuẩn *"
            value={defaultUnitId}
            onChange={(e) => setDefaultUnitId(e.target.value)}
            options={units
              .filter((item) => item.state === 'active' || item.id === defaultUnitId)
              .map((item) => ({
                value: item.id,
                label: `${item.code} — ${item.name}${item.state === 'active' ? '' : ' (đã ngừng dùng)'}`,
              }))}
          />
        </div>

        <div className="border-t border-[#E8E2D9] pt-4 space-y-4">
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
              className="rounded border-[#E8E2D9] bg-white text-[#B47820] focus:ring-[#B47820] w-4 h-4 cursor-pointer"
            />
            <div>
              <span className="text-sm font-medium text-[#1A1917]">
                Đang kích hoạt sử dụng
              </span>
              <p className="text-xs text-[#706E68]">
                Bật/tắt trạng thái sử dụng nguyên liệu trong việc tạo và điều chỉnh công thức.
              </p>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-[#E8E2D9] pt-5 flex items-center justify-end gap-3">
          <Link href="/rnd/ingredients">
            <Button variant="secondary" type="button" disabled={submitting}>
              Hủy Bỏ
            </Button>
          </Link>
          <Button
            variant="gold"
            type="submit"
            disabled={submitting || categories.length === 0 || units.length === 0}
          >
            <Save className="w-4 h-4 mr-1.5" />
            {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </Button>
        </div>
      </form>
    </div>
  );
}
