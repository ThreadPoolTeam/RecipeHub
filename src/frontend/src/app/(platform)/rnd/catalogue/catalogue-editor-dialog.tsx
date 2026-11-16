'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Dialog } from '@/components/workspace/dialog';
import { Select, TextArea, TextInput } from '@/components/workspace/fields';
import { Switch } from '@/components/workspace/switch';
import type { CatalogItem, UnitItem } from '@/lib/api/backend-repository';

export type CatalogueEditor =
  | { kind: 'unit-category'; item: CatalogItem | null }
  | { kind: 'unit'; item: UnitItem | null };

export interface CatalogueEditorDialogProps {
  editor: CatalogueEditor | null;
  setEditor: Dispatch<SetStateAction<CatalogueEditor | null>>;
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
  unitCategoryId: string;
  changeUnitCategory: (categoryId: string) => void;
  unitCategories: CatalogItem[];
  unitIsBase: boolean;
  setUnitIsBase: Dispatch<SetStateAction<boolean>>;
  unitFactorToBase: number;
  setUnitFactorToBase: Dispatch<SetStateAction<number>>;
  unitDecimalPlaces: number;
  setUnitDecimalPlaces: Dispatch<SetStateAction<number>>;
  formError: string | null;
  save: () => Promise<void>;
  submitting: boolean;
  selectedCategoryBase: UnitItem | undefined;
  unitCodePreview: string;
  baseCodePreview: string;
}

function formatConversionFactor(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('vi-VN')
    : value.toLocaleString('vi-VN', { maximumFractionDigits: 8 });
}

export function CatalogueEditorDialog({
  editor, setEditor, code, setCode, name, setName, description, setDescription,
  unitCategoryId, changeUnitCategory, unitCategories, unitIsBase, setUnitIsBase,
  unitFactorToBase, setUnitFactorToBase, unitDecimalPlaces, setUnitDecimalPlaces,
  formError, save, submitting, selectedCategoryBase, unitCodePreview, baseCodePreview,
}: CatalogueEditorDialogProps) {
  return (
    <Dialog
      isOpen={editor !== null}
      onClose={() => setEditor(null)}
      title={`${editor?.item ? 'Chỉnh sửa' : 'Thêm'} ${editor?.kind === 'unit' ? 'đơn vị đo' : 'đại lượng đo'}`}
      description={
        editor?.kind === 'unit'
          ? 'Chọn đại lượng mà đơn vị này đo, rồi khai báo cách quy đổi về đơn vị gốc.'
          : 'Đại lượng gom các đơn vị cùng loại, ví dụ: Khối lượng, Thể tích, Số lượng.'
      }
      confirmLabel={editor?.kind === 'unit' ? 'Lưu đơn vị' : 'Lưu đại lượng'}
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
            placeholder={editor?.kind === 'unit' ? 'VD: ML' : 'VD: VOLUME'}
          />
          <TextInput
            label="Tên"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={editor?.kind === 'unit' ? 'VD: Mililit' : 'VD: Thể tích'}
          />
        </div>

        {editor?.kind === 'unit' ? (
          <>
            <Select
              label="Thuộc đại lượng"
              required
              value={unitCategoryId}
              onChange={(event) => changeUnitCategory(event.target.value)}
              options={unitCategories
                .filter((item) => item.state === 'active' || item.id === unitCategoryId)
                .map((item) => ({ label: item.name, value: item.id }))}
            />
            <fieldset className="space-y-3 rounded-lg border border-border bg-secondary p-4">
              <legend className="px-1 text-sm font-semibold text-foreground">Quy đổi</legend>
              <div className="flex items-center justify-between gap-4">
                <span>
                  <span className="block text-sm font-semibold text-foreground">Là đơn vị gốc</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {selectedCategoryBase
                      ? `Đại lượng này đã có đơn vị gốc: ${selectedCategoryBase.code} · ${selectedCategoryBase.name}.`
                      : 'Mỗi đại lượng chỉ có một đơn vị gốc.'}
                  </span>
                </span>
                <Switch
                  aria-label="Là đơn vị gốc"
                  checked={unitIsBase}
                  disabled={Boolean(selectedCategoryBase)}
                  onChange={(event) => {
                    setUnitIsBase(event.target.checked);
                    if (event.target.checked) setUnitFactorToBase(1);
                  }}
                />
              </div>

              <div className={`grid grid-cols-1 gap-3 items-end ${unitIsBase ? '' : 'sm:grid-cols-2'}`}>
                {!unitIsBase && (
                  <TextInput
                    label={`1 ${unitCodePreview} bằng bao nhiêu ${baseCodePreview}?`}
                    required
                    type="number"
                    min="0.00000001"
                    step="any"
                    value={unitFactorToBase}
                    onChange={(event) => setUnitFactorToBase(Number(event.target.value))}
                  />
                )}
                <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
                  <div className="text-xs text-muted-foreground">Xem trước</div>
                  <div className="mt-1 text-sm font-bold text-foreground tabular-nums">
                    1 {unitCodePreview} = {formatConversionFactor(unitIsBase ? 1 : unitFactorToBase)} {baseCodePreview}
                  </div>
                </div>
              </div>
            </fieldset>
            <TextInput
              label="Số chữ số lẻ khi hiển thị"
              required
              type="number"
              min="0"
              max="6"
              value={unitDecimalPlaces}
              onChange={(event) => setUnitDecimalPlaces(Number(event.target.value))}
            />
          </>
        ) : (
          <TextArea
            label="Mô tả"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="VD: Đo theo khối lượng, đơn vị gốc là gram"
          />
        )}
      </div>
    </Dialog>
  );
}
