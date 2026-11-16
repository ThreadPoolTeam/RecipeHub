'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Select, TextInput } from '@/components/workspace/fields';
import { Dialog } from '@/components/workspace/dialog';
import { useDemo } from '@/lib/demo/provider';
import type { CatalogItem, UnitItem } from '@/lib/api/backend-repository';

export interface AiDraftCreateIngredientDialogProps {
  defaultName: string;
  onClose: () => void;
  onCreated: (name: string) => void;
}

const LOAD_FAILED_MESSAGE = 'Không tải được nhóm và đơn vị. Vui lòng đóng cửa sổ rồi thử lại.';
const CREATE_FAILED_MESSAGE = 'Chưa tạo được nguyên liệu. Vui lòng thử lại.';

export function AiDraftCreateIngredientDialog({
  defaultName,
  onClose,
  onCreated,
}: AiDraftCreateIngredientDialogProps) {
  const { session, repo, touch } = useDemo();
  const [name, setName] = useState(defaultName);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([repo.getIngredientCategories(), repo.getUnits()])
      .then(([categoryItems, unitItems]) => {
        if (cancelled) return;
        const activeCategories = categoryItems.filter((item) => item.state === 'active');
        const activeUnits = unitItems.filter((item) => item.state === 'active');
        setCategories(activeCategories);
        setUnits(activeUnits);
        setCategoryId(activeCategories[0]?.id ?? '');
        setUnitId((activeUnits.find((item) => item.isBase) ?? activeUnits[0])?.id ?? '');
      })
      .catch(() => {
        if (!cancelled) setError(LOAD_FAILED_MESSAGE);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const categoryOptions = useMemo(
    () => categories.map((item) => ({ value: item.id, label: item.name })),
    [categories]
  );
  const unitOptions = useMemo(
    () => units.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })),
    [units]
  );

  const handleConfirm = async () => {
    if (!session || loading || submitting) return;
    const cleanName = name.trim();
    const category = categories.find((item) => item.id === categoryId);
    const unit = units.find((item) => item.id === unitId);
    if (!cleanName) {
      setError('Nhập tên nguyên liệu.');
      return;
    }
    if (!category || !unit) {
      setError('Chưa có nhóm hoặc đơn vị đang hoạt động. Hãy tạo trong trang Đơn vị & Phân nhóm trước.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const code = await repo.generateIngredientCode(session, category.id);
      await repo.createIngredient(session, {
        code,
        name: cleanName,
        group: category.name,
        defaultUnit: unit.code,
        isActive: true,
        costPerUnit: 0,
        categoryId: category.id,
        defaultUnitId: unit.id,
      });
      touch();
      onCreated(cleanName);
    } catch (caught: unknown) {
      setError(caught instanceof Error && caught.message ? caught.message : CREATE_FAILED_MESSAGE);
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Tạo nguyên liệu mới"
      description="Mã nguyên liệu được hệ thống tự sinh. Bạn chỉ cần kiểm tên, nhóm và đơn vị."
      confirmLabel="Tạo nguyên liệu"
      cancelLabel="Đóng"
      isConfirming={submitting || loading}
      onConfirm={() => {
        void handleConfirm();
      }}
      maxWidth="md"
    >
      <div className="space-y-4">
        <TextInput
          label="Tên nguyên liệu"
          required
          value={name}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          disabled={submitting}
        />
        <Select
          label="Nhóm"
          required
          value={categoryId}
          options={categoryOptions}
          onChange={(event) => setCategoryId(event.target.value)}
          disabled={loading || submitting}
        />
        <Select
          label="Đơn vị mặc định"
          required
          value={unitId}
          options={unitOptions}
          onChange={(event) => setUnitId(event.target.value)}
          disabled={loading || submitting}
        />
        {error && <Alert type="error" title="Chưa tạo được nguyên liệu" message={error} />}
      </div>
    </Dialog>
  );
}
