'use client';

import React, { useEffect, useState } from 'react';
import { useDemo } from '@/lib/demo/provider';
import { Ingredient } from '@/lib/demo/types';
import { CatalogItem } from '@/lib/api/backend-repository';
import { Button, TextInput, TextArea } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';
import { Dialog } from '@/components/workspace/dialog';
import { CodeChip, EditIconButton, StateToggle } from '@/components/workspace/catalog-ui';

type Notice = { type: 'success' | 'error'; message: string };
export type IngredientCategoryEditing = { item: CatalogItem | null } | null;

export function IngredientCategoryPanel({
  categories,
  ingredients,
  isLoading,
  editing,
  onEditingChange,
  onChanged,
  onNotice,
}: {
  categories: CatalogItem[];
  ingredients: Ingredient[];
  isLoading: boolean;
  editing: IngredientCategoryEditing;
  onEditingChange: (editing: IngredientCategoryEditing) => void;
  onChanged: () => Promise<void>;
  onNotice: (notice: Notice) => void;
}) {
  const { session, repo, touch } = useDemo();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    setCode(editing.item?.code ?? '');
    setName(editing.item?.name ?? '');
    setDescription(editing.item?.description ?? '');
    setFormError(null);
  }, [editing]);

  const countIngredients = (category: CatalogItem) =>
    ingredients.filter((ingredient) =>
      ingredient.categoryId ? ingredient.categoryId === category.id : ingredient.group === category.name
    ).length;

  const save = async () => {
    if (!session || !editing) return;
    if (!code.trim() || !name.trim()) {
      setFormError('Mã và tên loại nguyên liệu không được để trống.');
      return;
    }
    try {
      setSubmitting(true);
      setFormError(null);
      const data = { code: code.trim().toUpperCase(), name: name.trim(), description: description.trim() };
      if (editing.item) await repo.updateIngredientCategory(session, editing.item.id, data);
      else await repo.createIngredientCategory(session, data);
      await onChanged();
      touch();
      onNotice({ type: 'success', message: `Đã lưu loại nguyên liệu "${data.name}".` });
      onEditingChange(null);
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Không thể lưu loại nguyên liệu.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleState = async (item: CatalogItem) => {
    if (!session) return;
    const active = item.state === 'active';
    try {
      setTogglingId(item.id);
      if (active) await repo.deactivateIngredientCategory(session, item.id);
      else await repo.activateIngredientCategory(session, item.id);
      await onChanged();
      touch();
      onNotice({ type: 'success', message: `Đã ${active ? 'tạm khóa' : 'kích hoạt'} loại "${item.name}".` });
    } catch (error: unknown) {
      onNotice({ type: 'error', message: error instanceof Error ? error.message : 'Không thể đổi trạng thái loại nguyên liệu.' });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <>
      <DataTable<CatalogItem>
        data={categories}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyTitle="Chưa có loại nguyên liệu"
        emptyMessage="Tạo loại nguyên liệu (VD: Cà phê, Sữa, Siro) trước khi thêm nguyên liệu mới."
        emptyAction={
          <Button variant="gold" size="sm" onClick={() => onEditingChange({ item: null })}>
            Thêm loại nguyên liệu
          </Button>
        }
        columns={[
          {
            header: 'Mã & Tên Loại',
            render: (item) => (
              <div>
                <div className="flex items-center gap-2">
                  <CodeChip>{item.code}</CodeChip>
                  <span className="font-semibold text-foreground text-sm truncate">{item.name}</span>
                </div>
                {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>}
              </div>
            ),
          },
          {
            header: 'Số Nguyên Liệu',
            render: (item) => (
              <span className="text-sm text-muted-foreground tabular-nums">{countIngredients(item)} nguyên liệu</span>
            ),
          },
          {
            header: 'Trạng Thái',
            render: (item) => (
              <StateToggle
                active={item.state === 'active'}
                disabled={togglingId === item.id}
                onToggle={() => toggleState(item)}
                subject={`loại "${item.name}"`}
              />
            ),
          },
          {
            header: 'Thao Tác',
            className: 'text-right',
            render: (item) => (
              <div className="flex justify-end">
                <EditIconButton label="Chỉnh sửa loại nguyên liệu" onClick={() => onEditingChange({ item })} />
              </div>
            ),
          },
        ]}
      />

      <Dialog
        isOpen={editing !== null}
        onClose={() => onEditingChange(null)}
        title={`${editing?.item ? 'Chỉnh sửa' : 'Thêm'} loại nguyên liệu`}
        description="Loại dùng để nhóm các nguyên liệu cùng vai trò. Mã loại là tiền tố khi sinh mã nguyên liệu."
        confirmLabel="Lưu loại nguyên liệu"
        confirmVariant="gold"
        onConfirm={save}
        isConfirming={submitting}
      >
        <div className="space-y-4">
          {formError && (
            <p role="alert" className="rounded-lg border border-destructive-border bg-destructive-tint px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput
              label="Mã"
              required
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="VD: SYRUP"
            />
            <TextInput
              label="Tên"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="VD: Siro"
            />
          </div>
          <TextArea
            label="Mô tả"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="VD: Các loại siro tạo vị dùng cho đồ uống"
          />
        </div>
      </Dialog>
    </>
  );
}
