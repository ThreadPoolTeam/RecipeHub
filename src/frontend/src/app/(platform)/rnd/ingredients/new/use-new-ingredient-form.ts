'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDemo } from '@/lib/demo/provider';
import type { CatalogItem, UnitItem } from '@/lib/api/backend-repository';
import { useToast } from '@/components/workspace/toast';

export function useNewIngredientForm() {
  const router = useRouter();
  const { session, repo, touch } = useDemo();
  const { toast } = useToast();

  const [code, setCode] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
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
  const [imageAssetId, setImageAssetId] = useState<string | null>(null);

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
    try {
      const nextCode = await repo.generateIngredientCode(session, categoryId);
      setCode(nextCode);
      setGeneratedCode({ code: nextCode, categoryId });
      touch();
    } catch (error: unknown) {
      toast({ type: 'error', title: 'Không thể tạo mã nguyên liệu', description: error instanceof Error ? error.message : 'Vui lòng thử lại.' });
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
      setError('Nhóm nguyên liệu không còn tồn tại trong danh mục đang hoạt động.');
      return;
    }
    const selectedUnit = units.find((item) => item.id === defaultUnitId);
    if (!selectedUnit) {
      setError('Đơn vị không còn tồn tại trong danh mục đang hoạt động.');
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
        imageAssetId,
      });

      touch();
      toast({ type: 'success', title: 'Đã thêm nguyên liệu', description: cleanName });
      router.push('/rnd/ingredients');
    } catch (err: unknown) {
      const e = err as Error;
      toast({
        type: 'error',
        title: 'Không thể lưu nguyên liệu',
        description: e.message || 'Vui lòng thử lại.',
      });
      setSubmitting(false);
    }
  };

  return { session, code, setCode, generatingCode, setGeneratedCode, name, setName, categories, unitCategories, units, categoryId, unitCategoryId, defaultUnitId, setDefaultUnitId, isActive, setIsActive, note, setNote, submitting, error, setError, canGenerateCode, handleCategoryChange, handleUnitCategoryChange, handleGenerateCode, handleSubmit, imageAssetId, setImageAssetId, catalogueLoading };
}
