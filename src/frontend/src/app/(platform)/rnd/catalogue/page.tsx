'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDemo } from '@/lib/demo/provider';
import { Button, TextInput, Select, TextArea, Alert } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';
import { Dialog } from '@/components/workspace/dialog';
import { CatalogItem, UnitItem } from '@/lib/api/backend-repository';
import { Package, FlaskConical } from 'lucide-react';

type CatalogueEditor =
  | { kind: 'ingredient-category'; item: CatalogItem | null }
  | { kind: 'unit-category'; item: CatalogItem | null }
  | { kind: 'unit'; item: UnitItem | null };

export default function RndCataloguePage() {
  const { session, repo, touch } = useDemo();
  const [ingredientCategories, setIngredientCategories] = useState<CatalogItem[]>([]);
  const [unitCategories, setUnitCategories] = useState<CatalogItem[]>([]);
  const [unitItems, setUnitItems] = useState<UnitItem[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [catalogueEditor, setCatalogueEditor] = useState<CatalogueEditor | null>(null);
  const [catalogueCode, setCatalogueCode] = useState('');
  const [catalogueName, setCatalogueName] = useState('');
  const [catalogueDescription, setCatalogueDescription] = useState('');
  const [unitCategoryId, setUnitCategoryId] = useState('');
  const [unitDecimalPlaces, setUnitDecimalPlaces] = useState(2);
  const [catalogueSubmitting, setCatalogueSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setReferenceLoading(true);
    Promise.all([repo.getIngredientCategories(), repo.getUnitCategories(), repo.getUnits()])
      .then(([categories, availableUnitCategories, availableUnits]) => {
        if (!isMounted) return;
        setIngredientCategories(categories);
        setUnitCategories(availableUnitCategories);
        setUnitItems(availableUnits);
        setUnitCategoryId((current) =>
          current || availableUnitCategories.find((item) => item.state === 'active')?.id || ''
        );
      })
      .catch((error: unknown) => {
        if (isMounted) setErrorMsg(error instanceof Error ? error.message : 'Không thể tải danh mục Recipe Service');
      })
      .finally(() => {
        if (isMounted) setReferenceLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [repo]);

  const reloadReferenceData = async () => {
    const [categories, availableUnitCategories, availableUnits] = await Promise.all([
      repo.getIngredientCategories(),
      repo.getUnitCategories(),
      repo.getUnits(),
    ]);
    setIngredientCategories(categories);
    setUnitCategories(availableUnitCategories);
    setUnitItems(availableUnits);
  };

  const openCatalogueEditor = (editor: CatalogueEditor) => {
    setCatalogueEditor(editor);
    setCatalogueCode(editor.item?.code ?? '');
    setCatalogueName(editor.item?.name ?? '');
    setCatalogueDescription(editor.item?.description ?? '');
    if (editor.kind === 'unit') {
      setUnitCategoryId(
        editor.item?.categoryId ?? unitCategories.find((item) => item.state === 'active')?.id ?? ''
      );
      setUnitDecimalPlaces(editor.item?.decimalPlaces ?? 2);
    }
    setErrorMsg(null);
  };

  const saveCatalogue = async () => {
    if (!session || !catalogueEditor) return;
    if (!catalogueCode.trim() || !catalogueName.trim()) {
      setErrorMsg('Mã và tên danh mục không được để trống');
      return;
    }
    if (catalogueEditor.kind === 'unit' && !unitCategoryId) {
      setErrorMsg('Hãy tạo và chọn nhóm đơn vị trước');
      return;
    }

    try {
      setCatalogueSubmitting(true);
      setErrorMsg(null);
      const catalogData = {
        code: catalogueCode.trim().toUpperCase(),
        name: catalogueName.trim(),
        description: catalogueDescription.trim(),
      };
      if (catalogueEditor.kind === 'ingredient-category') {
        if (catalogueEditor.item) {
          await repo.updateIngredientCategory(session, catalogueEditor.item.id, catalogData);
        } else {
          await repo.createIngredientCategory(session, catalogData);
        }
      } else if (catalogueEditor.kind === 'unit-category') {
        if (catalogueEditor.item) {
          await repo.updateUnitCategory(session, catalogueEditor.item.id, catalogData);
        } else {
          await repo.createUnitCategory(session, catalogData);
        }
      } else {
        const unitData = {
          code: catalogData.code,
          name: catalogData.name,
          categoryId: unitCategoryId,
          decimalPlaces: unitDecimalPlaces,
        };
        if (catalogueEditor.item) {
          await repo.updateUnit(session, catalogueEditor.item.id, unitData);
        } else {
          await repo.createUnit(session, unitData);
        }
      }
      await reloadReferenceData();
      setSuccessMsg(`Đã lưu ${catalogueName.trim()} thành công`);
      setCatalogueEditor(null);
      touch();
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể lưu danh mục');
    } finally {
      setCatalogueSubmitting(false);
    }
  };

  const toggleCatalogueState = async (
    kind: CatalogueEditor['kind'],
    item: CatalogItem
  ) => {
    if (!session) return;
    try {
      setErrorMsg(null);
      const active = item.state === 'active';
      if (kind === 'ingredient-category') {
        if (active) await repo.deactivateIngredientCategory(session, item.id);
        else await repo.activateIngredientCategory(session, item.id);
      } else if (kind === 'unit-category') {
        if (active) await repo.deactivateUnitCategory(session, item.id);
        else await repo.activateUnitCategory(session, item.id);
      } else {
        if (active) await repo.deactivateUnit(session, item.id);
        else await repo.activateUnit(session, item.id);
      }
      await reloadReferenceData();
      setSuccessMsg(`Đã ${active ? 'vô hiệu hóa' : 'kích hoạt'} ${item.name}`);
      touch();
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể đổi trạng thái danh mục');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1917] flex items-center gap-2.5">
            <Package className="w-6 h-6 text-[#B47820]" />
            Đơn Vị &amp; Phân Nhóm R&amp;D
          </h1>
          <p className="text-[#706E68] text-sm mt-1">
            Quy chuẩn nhóm nguyên liệu, nhóm đơn vị và đơn vị đo dùng chung cho toàn bộ công thức R&amp;D.
          </p>
        </div>
        <Link href="/rnd/ingredients">
          <Button variant="secondary" size="sm">
            <FlaskConical className="w-4 h-4 mr-1.5 text-[#B47820]" /> Mở Kho nguyên liệu
          </Button>
        </Link>
      </div>

      {errorMsg && (
        <Alert variant="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert variant="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-[#E8E2D9] rounded-xl p-4 shadow-xs">
          <div className="text-[11px] text-[#706E68] uppercase font-semibold">Nhóm nguyên liệu</div>
          <div className="text-xl font-bold text-[#1A1917] mt-1 font-mono tabular-nums">
            {ingredientCategories.filter((c) => c.state === 'active').length} / {ingredientCategories.length} đang dùng
          </div>
        </div>
        <div className="bg-white border border-[#E8E2D9] rounded-xl p-4 shadow-xs">
          <div className="text-[11px] text-[#706E68] uppercase font-semibold">Nhóm đơn vị</div>
          <div className="text-xl font-bold text-[#1A1917] mt-1 font-mono tabular-nums">
            {unitCategories.filter((c) => c.state === 'active').length} / {unitCategories.length} đang dùng
          </div>
        </div>
        <div className="bg-white border border-[#E8E2D9] rounded-xl p-4 shadow-xs">
          <div className="text-[11px] text-[#706E68] uppercase font-semibold">Đơn vị đo chuẩn</div>
          <div className="text-xl font-bold text-[#B47820] mt-1 font-mono tabular-nums">
            {unitItems.filter((u) => u.state === 'active').length} / {unitItems.length} đang dùng
          </div>
        </div>
      </div>

      <section className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#1A1917]">Nhóm nguyên liệu</h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => openCatalogueEditor({ kind: 'ingredient-category', item: null })}
              >
                + Thêm nhóm nguyên liệu
              </Button>
            </div>
            <DataTable<CatalogItem>
              data={ingredientCategories}
              keyExtractor={(item) => item.id}
              isLoading={referenceLoading}
              emptyTitle="Chưa có nhóm nguyên liệu"
              emptyMessage="Tạo nhóm đầu tiên để sử dụng khi thêm nguyên liệu."
              columns={[
                {
                  header: 'Mã & tên',
                  render: (item) => (
                    <div>
                      <div className="font-mono text-xs font-semibold text-[#B47820]">{item.code}</div>
                      <div className="text-xs text-[#1A1917] font-medium">{item.name}</div>
                    </div>
                  ),
                },
                {
                  header: 'Trạng thái',
                  render: (item) => (item.state === 'active' ? 'Đang dùng' : 'Đã tắt'),
                },
                {
                  header: 'Thao tác',
                  className: 'text-right',
                  render: (item) => (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openCatalogueEditor({ kind: 'ingredient-category', item })}
                      >
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleCatalogueState('ingredient-category', item)}
                      >
                        {item.state === 'active' ? 'Tắt' : 'Bật'}
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#1A1917]">Nhóm đơn vị</h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => openCatalogueEditor({ kind: 'unit-category', item: null })}
              >
                + Thêm nhóm đơn vị
              </Button>
            </div>
            <DataTable<CatalogItem>
              data={unitCategories}
              keyExtractor={(item) => item.id}
              isLoading={referenceLoading}
              emptyTitle="Chưa có nhóm đơn vị"
              emptyMessage="Ví dụ: Khối lượng, Thể tích, Số lượng."
              columns={[
                {
                  header: 'Mã & tên',
                  render: (item) => (
                    <div>
                      <div className="font-mono text-xs font-semibold text-[#B47820]">{item.code}</div>
                      <div className="text-xs text-[#1A1917] font-medium">{item.name}</div>
                    </div>
                  ),
                },
                {
                  header: 'Trạng thái',
                  render: (item) => (item.state === 'active' ? 'Đang dùng' : 'Đã tắt'),
                },
                {
                  header: 'Thao tác',
                  className: 'text-right',
                  render: (item) => (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openCatalogueEditor({ kind: 'unit-category', item })}
                      >
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleCatalogueState('unit-category', item)}
                      >
                        {item.state === 'active' ? 'Tắt' : 'Bật'}
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#1A1917]">Đơn vị đo</h2>
              <p className="text-xs text-[#706E68] mt-1">
                Danh sách này dùng chung cho đơn vị chuẩn của nguyên liệu và đơn vị thành phẩm.
              </p>
            </div>
            <Button
              size="sm"
              variant="gold"
              onClick={() =>
                openCatalogueEditor(
                  unitCategories.some((item) => item.state === 'active')
                    ? { kind: 'unit', item: null }
                    : { kind: 'unit-category', item: null }
                )
              }
            >
              {unitCategories.some((item) => item.state === 'active')
                ? '+ Thêm đơn vị'
                : '+ Tạo nhóm đơn vị trước'}
            </Button>
          </div>
          <DataTable<UnitItem>
            data={unitItems}
            keyExtractor={(item) => item.id}
            isLoading={referenceLoading}
            emptyTitle="Chưa có đơn vị đo"
            emptyMessage="Hãy tạo nhóm đơn vị trước, sau đó thêm g, kg, ml, lít hoặc phần."
            columns={[
              { header: 'Mã', accessor: 'code' },
              { header: 'Tên', accessor: 'name' },
              { header: 'Nhóm', accessor: 'categoryName' },
              { header: 'Số chữ số lẻ', accessor: 'decimalPlaces' },
              {
                header: 'Trạng thái',
                render: (item) => (item.state === 'active' ? 'Đang dùng' : 'Đã tắt'),
              },
              {
                header: 'Thao tác',
                className: 'text-right',
                render: (item) => (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openCatalogueEditor({ kind: 'unit', item })}
                    >
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleCatalogueState('unit', item)}
                    >
                      {item.state === 'active' ? 'Tắt' : 'Bật'}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </section>

      <Dialog
        isOpen={catalogueEditor !== null}
        onClose={() => setCatalogueEditor(null)}
        title={
          catalogueEditor?.kind === 'ingredient-category'
            ? `${catalogueEditor.item ? 'Chỉnh sửa' : 'Thêm'} nhóm nguyên liệu`
            : catalogueEditor?.kind === 'unit-category'
              ? `${catalogueEditor.item ? 'Chỉnh sửa' : 'Thêm'} nhóm đơn vị`
              : `${catalogueEditor?.item ? 'Chỉnh sửa' : 'Thêm'} đơn vị đo`
        }
        description={
          catalogueEditor?.kind === 'unit'
            ? 'Đơn vị này dùng được cho cả nguyên liệu và thành phẩm.'
            : 'Mã phải duy nhất và nên viết ngắn gọn.'
        }
        confirmLabel="Lưu danh mục"
        confirmVariant="gold"
        onConfirm={saveCatalogue}
        isConfirming={catalogueSubmitting}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput
              label="Mã"
              required
              value={catalogueCode}
              onChange={(event) => setCatalogueCode(event.target.value.toUpperCase())}
              placeholder={catalogueEditor?.kind === 'unit' ? 'VD: ML' : 'VD: VOLUME'}
            />
            <TextInput
              label="Tên"
              required
              value={catalogueName}
              onChange={(event) => setCatalogueName(event.target.value)}
              placeholder={catalogueEditor?.kind === 'unit' ? 'VD: Mililit' : 'VD: Thể tích'}
            />
          </div>

          {catalogueEditor?.kind === 'unit' ? (
            <>
              <Select
                label="Nhóm đơn vị"
                required
                value={unitCategoryId}
                onChange={(event) => setUnitCategoryId(event.target.value)}
                options={unitCategories
                  .filter((item) => item.state === 'active' || item.id === unitCategoryId)
                  .map((item) => ({ label: item.name, value: item.id }))}
              />
              <TextInput
                label="Số chữ số lẻ"
                required
                type="number"
                min="0"
                max="8"
                value={unitDecimalPlaces}
                onChange={(event) => setUnitDecimalPlaces(Number(event.target.value))}
              />
            </>
          ) : (
            <TextArea
              label="Mô tả"
              value={catalogueDescription}
              onChange={(event) => setCatalogueDescription(event.target.value)}
              rows={3}
            />
          )}
        </div>
      </Dialog>
    </div>
  );
}
