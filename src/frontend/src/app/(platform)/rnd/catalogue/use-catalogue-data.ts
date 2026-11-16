'use client';

import { useEffect, useState } from 'react';
import { useDemo } from '@/lib/demo/provider';
import { useToast } from '@/components/workspace/toast';
import type { CatalogItem, UnitItem } from '@/lib/api/backend-repository';
import type { CatalogueEditor } from './catalogue-editor-dialog';

export function useCatalogueData() {
  const { session, repo, dataVersion, touch } = useDemo();
  const { toast } = useToast();
  const [unitCategories, setUnitCategories] = useState<CatalogItem[]>([]);
  const [unitItems, setUnitItems] = useState<UnitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Editor dialog
  const [editor, setEditor] = useState<CatalogueEditor | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unitCategoryId, setUnitCategoryId] = useState('');
  const [unitDecimalPlaces, setUnitDecimalPlaces] = useState(2);
  const [unitIsBase, setUnitIsBase] = useState(false);
  const [unitFactorToBase, setUnitFactorToBase] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadReferenceData = async () => {
    try {
      setLoading(true);
      const [categories, units] = await Promise.all([repo.getUnitCategories(), repo.getUnits()]);
      setUnitCategories(categories);
      setUnitItems(units);
    } catch (error: unknown) {
      const isAbort = error instanceof Error && (error.name === 'AbortError' || error.message?.includes('abort'));
      if (!isAbort) {
        setLoadError(error instanceof Error ? error.message : 'Không thể tải danh mục đơn vị.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([repo.getUnitCategories(), repo.getUnits()])
      .then(([categories, units]) => {
        if (active) { setUnitCategories(categories); setUnitItems(units); }
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof Error && (error.name === 'AbortError' || error.message?.includes('abort')))) {
          setLoadError(error instanceof Error ? error.message : 'Không thể tải danh mục đơn vị.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [repo, dataVersion]);

  const categoryHasBase = (categoryId: string, excludeUnitId?: string) =>
    unitItems.some((item) => item.categoryId === categoryId && item.isBase && item.id !== excludeUnitId);

  const openEditor = (next: CatalogueEditor, presetCategoryId?: string) => {
    setEditor(next);
    setCode(next.item?.code ?? '');
    setName(next.item?.name ?? '');
    setDescription(next.item?.description ?? '');
    setFormError(null);
    if (next.kind === 'unit') {
      const categoryId =
        next.item?.categoryId ?? presetCategoryId ?? unitCategories.find((item) => item.state === 'active')?.id ?? '';
      setUnitCategoryId(categoryId);
      setUnitDecimalPlaces(next.item?.decimalPlaces ?? 2);
      setUnitIsBase(next.item?.isBase ?? !categoryHasBase(categoryId, next.item?.id));
      setUnitFactorToBase(next.item?.factorToBase ?? 1);
    }
  };

  const changeUnitCategory = (categoryId: string) => {
    setUnitCategoryId(categoryId);
    setUnitIsBase(!categoryHasBase(categoryId, editor?.item?.id));
    setUnitFactorToBase(1);
  };

  const save = async () => {
    if (!session || !editor) return;
    if (!code.trim() || !name.trim()) {
      setFormError('Mã và tên không được để trống.');
      return;
    }
    if (editor.kind === 'unit') {
      if (!unitCategoryId) {
        setFormError('Hãy chọn đại lượng đo trước.');
        return;
      }
      if (!unitIsBase && !(unitFactorToBase > 0)) {
        setFormError('Hệ số quy đổi phải lớn hơn 0.');
        return;
      }
      if (!Number.isInteger(unitDecimalPlaces) || unitDecimalPlaces < 0 || unitDecimalPlaces > 6) {
        setFormError('Số chữ số lẻ phải là số nguyên từ 0 đến 6.');
        return;
      }
      if (!unitIsBase && !categoryHasBase(unitCategoryId, editor.item?.id)) {
        setFormError('Đại lượng này chưa có đơn vị gốc. Hãy đánh dấu đơn vị này là đơn vị gốc.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const catalogData = { code: code.trim().toUpperCase(), name: name.trim(), description: description.trim() };
      if (editor.kind === 'unit-category') {
        if (editor.item) await repo.updateUnitCategory(session, editor.item.id, catalogData);
        else await repo.createUnitCategory(session, catalogData);
      } else {
        const unitData = {
          code: catalogData.code,
          name: catalogData.name,
          categoryId: unitCategoryId,
          decimalPlaces: unitDecimalPlaces,
        };
        const savedUnit = editor.item
          ? await repo.updateUnit(session, editor.item.id, unitData)
          : await repo.createUnit(session, unitData);
        await repo.updateUnitConversion(session, savedUnit.id, {
          isBase: unitIsBase,
          factorToBase: unitIsBase ? 1 : unitFactorToBase,
          offsetToBase: unitIsBase ? 0 : savedUnit.offsetToBase,
        });
      }
      await loadReferenceData();
      touch();
      toast({
        type: 'success',
        title: editor.kind === 'unit' ? 'Đã lưu đơn vị đo' : 'Đã lưu đại lượng đo',
        description: catalogData.name,
      });
      setEditor(null);
    } catch (error: unknown) {
      toast({
        type: 'error',
        title: 'Không thể lưu thay đổi',
        description: error instanceof Error ? error.message : 'Vui lòng kiểm tra thông tin và thử lại.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleState = async (kind: CatalogueEditor['kind'], item: CatalogItem) => {
    if (!session) return;
    const active = item.state === 'active';
    try {
      setTogglingId(item.id);
      if (kind === 'unit-category') {
        if (active) await repo.deactivateUnitCategory(session, item.id);
        else await repo.activateUnitCategory(session, item.id);
      } else {
        if (active) await repo.deactivateUnit(session, item.id);
        else await repo.activateUnit(session, item.id);
      }
      await loadReferenceData();
      touch();
      toast({
        type: 'success',
        title: active ? 'Đã tạm khóa' : 'Đã kích hoạt',
        description: `${kind === 'unit' ? 'Đơn vị' : 'Đại lượng'} ${item.name}`,
      });
    } catch (error: unknown) {
      toast({
        type: 'error',
        title: 'Không thể đổi trạng thái',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  return { unitCategories, unitItems, loading, loadError, setLoadError, togglingId, editor, setEditor, code, setCode, name, setName, description, setDescription, unitCategoryId, unitDecimalPlaces, setUnitDecimalPlaces, unitIsBase, setUnitIsBase, unitFactorToBase, setUnitFactorToBase, formError, submitting, openEditor, changeUnitCategory, save, toggleState };
}
