'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FlaskConical, Save } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Button, TextInput, Select, Alert } from '@/components/workspace/fields';
import { CatalogItem, UnitItem } from '@/lib/api/backend-repository';

export default function NewIngredientPage() {
  const router = useRouter();
  const { session, repo, touch } = useDemo();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [defaultUnitId, setDefaultUnitId] = useState('');
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setCatalogueLoading(true);
    Promise.all([repo.getIngredientCategories(), repo.getUnits()])
      .then(([categoryItems, unitItems]) => {
        if (!isMounted) return;
        const activeCategories = categoryItems.filter((item) => item.state === 'active');
        const activeUnits = unitItems.filter((item) => item.state === 'active');
        setCategories(activeCategories);
        setUnits(activeUnits);
        setCategoryId(activeCategories[0]?.id ?? '');
        setDefaultUnitId(activeUnits[0]?.id ?? '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
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
      setError('Chưa có nhóm nguyên liệu đang hoạt động. Hãy tạo nhóm trong trang Admin trước.');
      return;
    }
    if (!defaultUnitId) {
      setError('Chưa có đơn vị đang hoạt động. Hãy tạo đơn vị trong trang Admin trước.');
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
              Thêm Nguyên Liệu Tiêu Chuẩn
            </h1>
            <p className="text-xs sm:text-sm text-[#706E68]">
              Định nghĩa nguyên liệu mới vào danh mục phục vụ nghiên cứu và phát triển công thức.
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
            Mã định danh và các thông số đo lường quy chuẩn của nguyên liệu.
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
            options={categories.map((item) => ({ value: item.id, label: item.name }))}
            disabled={catalogueLoading || categories.length === 0}
            helper={categories.length === 0 && !catalogueLoading ? 'Hãy tạo nhóm nguyên liệu trong trang Admin.' : undefined}
          />

          <Select
            label="Đơn Vị Tính Tiêu Chuẩn *"
            value={defaultUnitId}
            onChange={(e) => setDefaultUnitId(e.target.value)}
            options={units.map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` }))}
            disabled={catalogueLoading || units.length === 0}
            helper={units.length === 0 && !catalogueLoading ? 'Hãy tạo đơn vị trong trang Admin.' : undefined}
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
                Kích hoạt sử dụng ngay
              </span>
              <p className="text-xs text-[#706E68]">
                Nguyên liệu sẽ hiển thị trong danh mục lựa chọn khi xây dựng công thức mới.
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
            disabled={submitting || catalogueLoading || categories.length === 0 || units.length === 0}
          >
            <Save className="w-4 h-4 mr-1.5" />
            {submitting ? 'Đang lưu...' : 'Lưu Nguyên Liệu'}
          </Button>
        </div>
      </form>
    </div>
  );
}
