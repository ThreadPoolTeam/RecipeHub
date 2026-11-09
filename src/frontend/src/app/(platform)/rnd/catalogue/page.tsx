'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Ruler } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Button, TextInput, Select, TextArea, Alert, SearchInput } from '@/components/workspace/fields';
import { Dialog } from '@/components/workspace/dialog';
import { Switch } from '@/components/workspace/switch';
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
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

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
        title={<>Đại lượng &amp; đơn vị đo</>}
        description="Định nghĩa đại lượng, đơn vị cơ sở và hệ số quy đổi dùng cho toàn bộ công thức."
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
        <div
          className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(200px,0.85fr)_minmax(0,1.9fr)_minmax(240px,0.95fr)] lg:gap-6"
          style={{ gridTemplateRows: `repeat(${groups.length + 1}, min-content)` }}
        >
          {groups.map(({ category, units, baseUnit, totalUnits }, index) => (
            <div key={`${searchQuery}-${statusFilter}-${category.id}`} className="contents">
              <input
                className="peer sr-only"
                type="radio"
                name="catalogue-category"
                id={`category-select-${category.id}`}
                checked={groups.some((group) => group.category.id === selectedCategoryId) ? category.id === selectedCategoryId : index === 0}
                onChange={() => setSelectedCategoryId(category.id)}
              />
              <label
                htmlFor={`category-select-${category.id}`}
                className="block cursor-pointer rounded-lg border border-border bg-card p-4 shadow-soft peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring lg:col-start-1"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-medium text-foreground">{category.name}</span>
                  <span className={`rounded-md px-2 py-1 text-xs ${category.state === 'active' ? 'bg-success-soft text-success' : 'bg-secondary text-muted-foreground'}`}>
                    {category.state === 'active' ? 'Đang dùng' : 'Tạm khóa'}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Đơn vị gốc: {baseUnit?.code ?? 'Chưa có'} · {totalUnits} đơn vị
                </span>
              </label>
              <section
                aria-labelledby={`unit-category-${category.id}`}
                className="hidden rounded-lg border border-border bg-card p-5 shadow-soft peer-checked:block lg:col-start-2 lg:row-span-full lg:row-start-1"
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 id={`unit-category-${category.id}`} className="font-display text-2xl font-medium text-foreground">{category.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Mã {category.code}{category.description && <> · {category.description}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StateToggle
                      active={category.state === 'active'}
                      disabled={togglingId === category.id}
                      onToggle={() => toggleState('unit-category', category)}
                      subject={`đại lượng "${category.name}"`}
                    />
                    <EditIconButton label="Chỉnh sửa đại lượng" onClick={() => openEditor({ kind: 'unit-category', item: category })} />
                  </div>
                </header>

                {units.length > 0 && (
                  <div className="mt-5 rounded-lg bg-secondary p-4">
                    <p className="mb-3 text-xs font-medium text-muted-foreground">Thang quy đổi</p>
                    <div className="flex flex-wrap gap-2">
                      {units.map((unit) => (
                        <div key={unit.id} className={`rounded-lg border px-4 py-3 text-center ${unit.isBase ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground'}`}>
                          <p className="text-lg font-medium">{unit.code}</p>
                          <p className="text-xs">{unit.name}{unit.isBase && ' · Cơ sở'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {units.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {totalUnits === 0 ? 'Chưa có đơn vị nào trong đại lượng này.' : 'Không có đơn vị nào khớp bộ lọc.'}
                  </p>
                ) : (
                  <div className="mt-5 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                      <thead className="border-b border-border bg-secondary text-xs text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">Đơn vị</th>
                          <th className="px-4 py-3 font-medium">Quy đổi về đơn vị gốc</th>
                          <th className="px-4 py-3 font-medium">Số lẻ</th>
                          <th className="px-4 py-3 font-medium">Trạng thái</th>
                          <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {units.map((unit) => (
                          <tr key={unit.id} className="hover:bg-accent">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <CodeChip>{unit.code}</CodeChip>
                                <span className="font-semibold text-foreground">{unit.name}</span>
                                {unit.isBase && <span className="rounded-md bg-info-soft px-2 py-1 text-xs text-info">Đơn vị gốc</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs tabular-nums">
                              {unit.isBase ? 'Chuẩn quy đổi' : baseUnit
                                ? `1 ${unit.code} = ${formatConversionFactor(unit.factorToBase)} ${baseUnit.code}`
                                : 'Chưa có đơn vị gốc'}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{unit.decimalPlaces} chữ số</td>
                            <td className="px-4 py-3">
                              <StateToggle
                                active={unit.state === 'active'}
                                disabled={togglingId === unit.id}
                                onToggle={() => toggleState('unit', unit)}
                                subject={`đơn vị "${unit.name}"`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end">
                                <EditIconButton label="Chỉnh sửa đơn vị" onClick={() => openEditor({ kind: 'unit', item: unit })} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {category.state === 'active' && (
                  <div className="mt-5">
                    <Button variant="secondary" size="sm" onClick={() => openEditor({ kind: 'unit', item: null }, category.id)}>
                      <Plus className="mr-1 h-4 w-4" strokeWidth={1.5} /> Thêm đơn vị {category.name.toLowerCase()}
                    </Button>
                  </div>
                )}
              </section>
            </div>
          ))}
          <div className="lg:col-start-1">
            <Button className="w-full" size="sm" onClick={() => openEditor({ kind: 'unit-category', item: null })}>
              <Plus className="mr-1 h-4 w-4" strokeWidth={1.5} /> Thêm đại lượng
            </Button>
          </div>
          <div className="lg:col-start-3 lg:row-span-full lg:row-start-1">
            <UnitConversionModal inline />
          </div>
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
                        ? `Đại lượng này đã có đơn vị gốc: ${selectedCategoryBase.code} — ${selectedCategoryBase.name}.`
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
    </div>
  );
}
