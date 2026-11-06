'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Ruler } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Button, TextInput, Select, TextArea, Alert, SearchInput } from '@/components/workspace/fields';
import { Dialog } from '@/components/workspace/dialog';
import { DataTable } from '@/components/workspace/data-table';
import { UnitConversionModal } from '@/components/shared/UnitConversionModal';
import { CatalogPageHeader, CodeChip, EditIconButton, StateToggle } from '@/components/workspace/catalog-ui';
import { CatalogItem, UnitItem } from '@/lib/api/backend-repository';

type CatalogueEditor =
  | { kind: 'unit-category'; item: CatalogItem | null }
  | { kind: 'unit'; item: UnitItem | null };

type StatusFilter = 'all' | 'active' | 'inactive';

function formatConversionFactor(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString('vi-VN')
    : value.toLocaleString('vi-VN', { maximumFractionDigits: 8 });
}

export default function RndCataloguePage() {
  const { session, repo, dataVersion, touch } = useDemo();
  const [unitCategories, setUnitCategories] = useState<CatalogItem[]>([]);
  const [unitItems, setUnitItems] = useState<UnitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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
        setAlertNotice({ type: 'error', message: error instanceof Error ? error.message : 'Không thể tải danh mục đơn vị.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferenceData();
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
      setAlertNotice({
        type: 'success',
        message: `Đã lưu ${editor.kind === 'unit' ? 'đơn vị' : 'đại lượng'} "${catalogData.name}".`,
      });
      setEditor(null);
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Không thể lưu.');
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
      setAlertNotice({
        type: 'success',
        message: `Đã ${active ? 'tạm khóa' : 'kích hoạt'} ${kind === 'unit' ? 'đơn vị' : 'đại lượng'} "${item.name}".`,
      });
    } catch (error: unknown) {
      setAlertNotice({ type: 'error', message: error instanceof Error ? error.message : 'Không thể đổi trạng thái.' });
    } finally {
      setTogglingId(null);
    }
  };

  const filtersActive = searchQuery.trim() !== '' || statusFilter !== 'all';

  const groups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matchesStatus = (state: string) =>
      statusFilter === 'all' || (statusFilter === 'active' ? state === 'active' : state !== 'active');

    return unitCategories
      .map((category) => {
        const allUnits = unitItems.filter((unit) => unit.categoryId === category.id);
        const categoryMatchesQuery =
          !q || category.name.toLowerCase().includes(q) || category.code.toLowerCase().includes(q);
        const units = allUnits.filter(
          (unit) =>
            matchesStatus(unit.state) &&
            (categoryMatchesQuery || unit.name.toLowerCase().includes(q) || unit.code.toLowerCase().includes(q))
        );
        const visible =
          !filtersActive ||
          ((categoryMatchesQuery || units.length > 0) && (matchesStatus(category.state) || units.length > 0));
        return { category, units, baseUnit: allUnits.find((unit) => unit.isBase), totalUnits: allUnits.length, visible };
      })
      .filter((group) => group.visible);
  }, [unitCategories, unitItems, searchQuery, statusFilter, filtersActive]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  const editingUnitId = editor?.kind === 'unit' ? editor.item?.id : undefined;
  const selectedCategoryBase = unitItems.find(
    (item) => item.categoryId === unitCategoryId && item.isBase && item.id !== editingUnitId
  );
  const unitCodePreview = code.trim().toUpperCase() || 'KG';
  const baseCodePreview = unitIsBase ? unitCodePreview : selectedCategoryBase?.code ?? 'BASE';

  return (
    <div className="space-y-6">
      <CatalogPageHeader
        icon={Ruler}
        title={<>Đại Lượng &amp; Đơn Vị Đo</>}
        description="Mỗi đại lượng (Khối lượng, Thể tích…) gom các đơn vị cùng loại và có một đơn vị gốc để quy đổi."
        actions={
          <>
            <UnitConversionModal />
            <Button variant="gold" size="sm" onClick={() => openEditor({ kind: 'unit-category', item: null })}>
              <Plus className="w-4 h-4 mr-1" /> Thêm đại lượng
            </Button>
          </>
        }
      />

      {alertNotice && (
        <Alert type={alertNotice.type} message={alertNotice.message} onClose={() => setAlertNotice(null)} />
      )}

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-[#E8E2D9] p-3 rounded-2xl shadow-xs">
        <div className="md:col-span-3">
          <SearchInput
            placeholder="Tìm theo mã hoặc tên đại lượng, đơn vị..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
          />
        </div>
        <div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'active', label: 'Đang dùng' },
              { value: 'inactive', label: 'Tạm khóa' },
            ]}
          />
        </div>
      </div>

      {loading || groups.length === 0 ? (
        <DataTable<UnitItem>
          data={[]}
          columns={[]}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          emptyTitle={filtersActive ? 'Không tìm thấy kết quả' : 'Chưa có đại lượng đo'}
          emptyMessage={
            filtersActive
              ? 'Không có đại lượng hoặc đơn vị nào khớp với từ khóa và trạng thái đang lọc.'
              : 'Tạo đại lượng đầu tiên (VD: Khối lượng, Thể tích) rồi thêm đơn vị vào bên trong.'
          }
          emptyAction={
            filtersActive ? (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            ) : (
              <Button variant="gold" size="sm" onClick={() => openEditor({ kind: 'unit-category', item: null })}>
                Thêm đại lượng
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {groups.map(({ category, units, baseUnit, totalUnits }) => (
            <section
              key={category.id}
              aria-labelledby={`unit-category-${category.id}`}
              className="bg-white border border-[#E8E2D9] rounded-2xl shadow-xs overflow-hidden"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#FAF9F5] border-b border-[#E8E2D9]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CodeChip>{category.code}</CodeChip>
                    <h2 id={`unit-category-${category.id}`} className="text-base font-bold text-[#1A1917] truncate">
                      {category.name}
                    </h2>
                  </div>
                  <p className="text-xs text-[#706E68] mt-0.5">
                    {totalUnits} đơn vị · Đơn vị gốc:{' '}
                    {baseUnit ? (
                      <span className="font-mono font-semibold text-[#1A1917]">{baseUnit.code}</span>
                    ) : (
                      <span className="text-amber-700">chưa có</span>
                    )}
                    {category.description && <> · {category.description}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StateToggle
                    active={category.state === 'active'}
                    disabled={togglingId === category.id}
                    onToggle={() => toggleState('unit-category', category)}
                    subject={`đại lượng "${category.name}"`}
                  />
                  <EditIconButton
                    label="Chỉnh sửa đại lượng"
                    onClick={() => openEditor({ kind: 'unit-category', item: category })}
                  />
                </div>
              </header>

              {units.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[#706E68]">
                  {totalUnits === 0 ? 'Chưa có đơn vị nào trong đại lượng này.' : 'Không có đơn vị nào khớp bộ lọc.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse min-w-[640px]">
                    <thead>
                      <tr className="bg-[#F5F0E8] border-b border-[#E8E2D9] text-[#706E68] text-xs uppercase tracking-wider font-semibold">
                        <th className="px-4 py-2.5 font-semibold">Mã &amp; Tên Đơn Vị</th>
                        <th className="px-4 py-2.5 font-semibold">Quy Đổi Về Đơn Vị Gốc</th>
                        <th className="px-4 py-2.5 font-semibold">Số Lẻ</th>
                        <th className="px-4 py-2.5 font-semibold">Trạng Thái</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E2D9]">
                      {units.map((unit) => (
                        <tr key={unit.id} className="hover:bg-[#FAF9F5] transition-colors motion-reduce:transition-none">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <CodeChip>{unit.code}</CodeChip>
                              <span className="font-semibold text-[#1A1917]">{unit.name}</span>
                              {unit.isBase && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide bg-[#FFF8EC] text-[#9A6416] border border-[#E8D3B0]">
                                  Đơn vị gốc
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            {unit.isBase ? (
                              <span className="text-xs text-[#706E68]">Chuẩn quy đổi</span>
                            ) : baseUnit ? (
                              <span className="font-mono text-xs text-[#1A1917] tabular-nums">
                                1 {unit.code} = {formatConversionFactor(unit.factorToBase)} {baseUnit.code}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-700">Chưa có đơn vị gốc</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-[#706E68] tabular-nums">{unit.decimalPlaces} chữ số</td>
                          <td className="px-4 py-2.5">
                            <StateToggle
                              active={unit.state === 'active'}
                              disabled={togglingId === unit.id}
                              onToggle={() => toggleState('unit', unit)}
                              subject={`đơn vị "${unit.name}"`}
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex justify-end">
                              <EditIconButton
                                label="Chỉnh sửa đơn vị"
                                onClick={() => openEditor({ kind: 'unit', item: unit })}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {category.state === 'active' && (
                <div className="px-4 py-2 border-t border-[#E8E2D9]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditor({ kind: 'unit', item: null }, category.id)}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Thêm đơn vị {category.name.toLowerCase()}
                  </Button>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

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
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
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
              <fieldset className="rounded-xl border border-[#E8E2D9] bg-[#FAF9F5] p-4 space-y-3">
                <legend className="px-1 text-sm font-semibold text-[#1A1917]">Quy đổi</legend>
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <span>
                    <span className="block text-sm font-semibold text-[#1A1917]">Là đơn vị gốc</span>
                    <span className="block text-xs text-[#706E68] mt-0.5">
                      {selectedCategoryBase
                        ? `Đại lượng này đã có đơn vị gốc: ${selectedCategoryBase.code} — ${selectedCategoryBase.name}.`
                        : 'Mỗi đại lượng chỉ có một đơn vị gốc.'}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    className="toggle toggle-sm"
                    checked={unitIsBase}
                    disabled={Boolean(selectedCategoryBase)}
                    onChange={(event) => {
                      setUnitIsBase(event.target.checked);
                      if (event.target.checked) setUnitFactorToBase(1);
                    }}
                  />
                </label>

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
                  <div className="rounded-xl border border-[#E8E2D9] bg-white px-4 py-3 text-center">
                    <div className="text-[11px] uppercase tracking-wide text-[#706E68]">Xem trước</div>
                    <div className="mt-1 font-mono text-sm font-bold text-[#1A1917] tabular-nums">
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
    </div>
  );
}
