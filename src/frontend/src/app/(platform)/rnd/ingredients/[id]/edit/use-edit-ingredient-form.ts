'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDemo } from '@/lib/demo/provider';
import type { CatalogItem, UnitItem } from '@/lib/api/backend-repository';
import { useToast } from '@/components/workspace/toast';
import type { Ingredient } from '@/lib/demo/types';

export function useEditIngredientForm() {
  const router = useRouter();
  const params = useParams();
  const ingredientId = params.id as string;
  const { session, repo, touch } = useDemo();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);

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
  const [isActive, setIsActive] = useState(true);
  const [note, setNote] = useState('');
  const [imageAssetId, setImageAssetId] = useState<string | null>(null);

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
          setImageAssetId(found.imageAssetId ?? null);
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
        imageAssetId,
      });

      touch();
      toast({ type: 'success', title: 'Đã cập nhật nguyên liệu', description: cleanName });
      router.push('/rnd/ingredients');
    } catch (err: unknown) {
      const e = err as Error;
      toast({
        type: 'error',
        title: 'Không thể cập nhật nguyên liệu',
        description: e.message || 'Vui lòng thử lại.',
      });
      setSubmitting(false);
    }
  };

  return { session, code, setCode, generatingCode, setGeneratedCode, name, setName, categories, unitCategories, units, categoryId, unitCategoryId, defaultUnitId, setDefaultUnitId, isActive, setIsActive, note, setNote, submitting, error, setError, canGenerateCode, handleCategoryChange, handleUnitCategoryChange, handleGenerateCode, handleSubmit, imageAssetId, setImageAssetId, loading, ingredient };
}
