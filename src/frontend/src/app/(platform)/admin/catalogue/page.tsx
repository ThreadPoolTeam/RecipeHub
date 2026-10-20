'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useDemo } from '@/lib/demo/provider';
import { Ingredient } from '@/lib/demo/types';
import { Button, TextInput, Select, TextArea, Alert, SearchInput } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';
import { Dialog } from '@/components/workspace/dialog';
import { CatalogItem, UnitItem } from '@/lib/api/backend-repository';

type CatalogueEditor =
  | { kind: 'ingredient-category'; item: CatalogItem | null }
  | { kind: 'unit-category'; item: CatalogItem | null }
  | { kind: 'unit'; item: UnitItem | null };

export default function AdminCataloguePage() {
  const { session, repo, dataVersion, touch } = useDemo();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [ingredientCategories, setIngredientCategories] = useState<CatalogItem[]>([]);
  const [unitCategories, setUnitCategories] = useState<CatalogItem[]>([]);
  const [unitItems, setUnitItems] = useState<UnitItem[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [catalogueEditor, setCatalogueEditor] = useState<CatalogueEditor | null>(null);
  const [catalogueCode, setCatalogueCode] = useState('');
  const [catalogueName, setCatalogueName] = useState('');
  const [catalogueDescription, setCatalogueDescription] = useState('');
  const [unitCategoryId, setUnitCategoryId] = useState('');
  const [unitIsBase, setUnitIsBase] = useState(false);
  const [unitFactor, setUnitFactor] = useState(1);
  const [unitOffset, setUnitOffset] = useState(0);
  const [unitDecimalPlaces, setUnitDecimalPlaces] = useState(2);
  const [catalogueSubmitting, setCatalogueSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newCost, setNewCost] = useState(0);
  const [newNotes, setNewNotes] = useState('');
  const [newIsActive, setNewIsActive] = useState(true);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit Modal
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [editName, setEditName] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editCost, setEditCost] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadIngredients = async () => {
    try {
      setLoading(true);
      const list = await repo.getIngredients('', 'all', false);
      setIngredients(list);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tải danh mục nguyên liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIngredients();
  }, [repo, dataVersion]);

  useEffect(() => {
    let isMounted = true;
    setReferenceLoading(true);
    Promise.all([repo.getIngredientCategories(), repo.getUnitCategories(), repo.getUnits()])
      .then(([categories, availableUnitCategories, availableUnits]) => {
        if (!isMounted) return;
        const activeGroups = categories.filter((item) => item.state === 'active').map((item) => item.name);
        const activeUnits = availableUnits.filter((item) => item.state === 'active').map((item) => item.code);
        setIngredientCategories(categories);
        setUnitCategories(availableUnitCategories);
        setUnitItems(availableUnits);
        setGroups(activeGroups);
        setUnits(activeUnits);
        setNewGroup((current) => current || activeGroups[0] || '');
        setNewUnit((current) => current || activeUnits[0] || '');
        setUnitCategoryId((current) =>
          current || availableUnitCategories.find((item) => item.state === 'active')?.id || ''
        );
      })
      .catch((error: unknown) => {
        if (isMounted) setErrorMsg(error instanceof Error ? error.message : 'Không thể tải catalog Recipe Service');
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
    setGroups(categories.filter((item) => item.state === 'active').map((item) => item.name));
    setUnits(availableUnits.filter((item) => item.state === 'active').map((item) => item.code));
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
      setUnitIsBase(editor.item?.isBase ?? false);
      setUnitFactor(editor.item?.factorToBase ?? 1);
      setUnitOffset(editor.item?.offsetToBase ?? 0);
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
          isBase: unitIsBase,
          factorToBase: unitFactor,
          offsetToBase: unitOffset,
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

  // Group & status metrics
  const stats = useMemo(() => {
    const total = ingredients.length;
    const active = ingredients.filter((i) => i.isActive).length;
    const inactive = total - active;
    const groupCount: Record<string, number> = {};
    for (const g of groups) groupCount[g] = 0;
    for (const item of ingredients) {
      groupCount[item.group] = (groupCount[item.group] || 0) + 1;
    }
    return { total, active, inactive, groupCount };
  }, [ingredients, groups]);

  // Filtered ingredients
  const filteredList = useMemo(() => {
    return ingredients.filter((ing) => {
      const matchGroup = selectedGroup === 'all' || ing.group === selectedGroup;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && ing.isActive) ||
        (statusFilter === 'inactive' && !ing.isActive);
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        ing.name.toLowerCase().includes(q) ||
        ing.code.toLowerCase().includes(q) ||
        (ing.supplierNotes && ing.supplierNotes.toLowerCase().includes(q));
      return matchGroup && matchStatus && matchSearch;
    });
  }, [ingredients, selectedGroup, statusFilter, searchTerm]);

  // Handle Create Ingredient
  const handleCreateIngredient = async () => {
    if (!session) return;
    if (!newCode.trim() || !newName.trim()) {
      setErrorMsg('Vui lòng điền mã nguyên liệu và tên nguyên liệu');
      return;
    }

    try {
      setCreateSubmitting(true);
      setErrorMsg(null);
      await repo.createIngredient(session, {
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        group: newGroup,
        defaultUnit: newUnit,
        costPerUnit: Number(newCost) || 0,
        supplierNotes: newNotes.trim(),
        isActive: newIsActive,
      });

      setSuccessMsg(`Đã tạo nguyên liệu mới thành công: [${newCode.toUpperCase()}] ${newName}`);
      setIsCreateOpen(false);
      setNewCode('');
      setNewName('');
      setNewGroup(groups[0] ?? '');
      setNewUnit(units[0] ?? '');
      setNewCost(0);
      setNewNotes('');
      setNewIsActive(true);
      touch();
      await loadIngredients();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tạo nguyên liệu');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit
  const openEditModal = (ing: Ingredient) => {
    setEditingIng(ing);
    setEditName(ing.name);
    setEditGroup(ing.group);
    setEditUnit(ing.defaultUnit);
    setEditCost(ing.costPerUnit || 0);
    setEditNotes(ing.supplierNotes || '');
    setEditIsActive(ing.isActive);
    setErrorMsg(null);
  };

  // Handle Edit Ingredient
  const handleEditIngredient = async () => {
    if (!session || !editingIng) return;
    if (!editName.trim()) {
      setErrorMsg('Tên nguyên liệu không được để trống');
      return;
    }

    try {
      setEditSubmitting(true);
      setErrorMsg(null);
      await repo.updateIngredient(session, editingIng.id, {
        name: editName.trim(),
        group: editGroup,
        defaultUnit: editUnit,
        costPerUnit: Number(editCost) || 0,
        supplierNotes: editNotes.trim(),
        isActive: editIsActive,
      });

      setSuccessMsg(`Đã cập nhật nguyên liệu [${editingIng.code}] thành công`);
      setEditingIng(null);
      touch();
      await loadIngredients();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi cập nhật nguyên liệu');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Toggle active quickly
  const handleToggleActive = async (ing: Ingredient) => {
    if (!session) return;
    try {
      setErrorMsg(null);
      await repo.updateIngredient(session, ing.id, {
        isActive: !ing.isActive,
      });
      setSuccessMsg(
        !ing.isActive
          ? `Đã kích hoạt nguyên liệu [${ing.code}]`
          : `Đã vô hiệu hóa nguyên liệu [${ing.code}]`
      );
      touch();
      await loadIngredients();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi đổi trạng thái');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1917]">Danh mục Đơn vị &amp; Nguyên liệu Toàn cục</h1>
          <p className="text-[#706E68] text-xs mt-1">
            Quy chuẩn danh mục nguyên vật liệu R&amp;D BeverageLab, quản lý đơn vị đo lường và định mức chi phí.
          </p>
        </div>
        <Button variant="gold" onClick={() => setIsCreateOpen(true)}>
          + Thêm nguyên liệu mới
        </Button>
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

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#F2F0EB]">Danh mục dùng trong công thức</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Tạo nhóm nguyên liệu và đơn vị trước khi thêm nguyên liệu hoặc công thức.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#F2F0EB]">Nhóm nguyên liệu</h3>
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
                      <div className="font-mono text-xs font-semibold">{item.code}</div>
                      <div className="text-xs text-[#78716C]">{item.name}</div>
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
              <h3 className="text-sm font-semibold text-[#F2F0EB]">Nhóm đơn vị</h3>
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
                      <div className="font-mono text-xs font-semibold">{item.code}</div>
                      <div className="text-xs text-[#78716C]">{item.name}</div>
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
              <h3 className="text-sm font-semibold text-[#F2F0EB]">Đơn vị đo</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Danh sách này dùng chung cho đơn vị chuẩn của nguyên liệu và đơn vị thành phẩm.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
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
              {
                header: 'Quy đổi',
                render: (item) => item.isBase ? 'Đơn vị gốc' : `× ${item.factorToBase}`,
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

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="bg-white border border-[#E8E2D9] rounded-lg p-3 shadow-xs">
          <div className="text-[11px] text-[#706E68] uppercase font-semibold">Tổng nguyên liệu</div>
          <div className="text-xl font-bold text-[#1A1917] mt-1">{stats.total}</div>
        </div>
        <div className="bg-white border border-[#E8E2D9] rounded-lg p-3 shadow-xs">
          <div className="text-[11px] text-[#706E68] uppercase font-semibold">Đang kích hoạt</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{stats.active}</div>
        </div>
        <div className="bg-white border border-[#E8E2D9] rounded-lg p-3 shadow-xs">
          <div className="text-[11px] text-[#706E68] uppercase font-semibold">Vô hiệu hóa</div>
          <div className="text-xl font-bold text-[#706E68] mt-1">{stats.inactive}</div>
        </div>
        {groups.map((g) => (
          <div key={g} className="bg-white border border-[#E8E2D9] rounded-lg p-3 shadow-xs">
            <div className="text-[11px] text-[#706E68] uppercase font-semibold truncate">{g}</div>
            <div className="text-xl font-bold text-[#B47820] mt-1">{stats.groupCount[g] || 0}</div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs">
        <div className="sm:col-span-2">
          <SearchInput
            placeholder="Tìm theo tên nguyên liệu, mã code hoặc ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
          />
        </div>
        <div>
          <Select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            options={[
              { label: 'Tất cả nhóm', value: 'all' },
              ...groups.map((g) => ({ label: `Nhóm: ${g}`, value: g })),
            ]}
          />
        </div>
        <div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            options={[
              { label: 'Tất cả trạng thái', value: 'all' },
              { label: 'Đang kích hoạt (Active)', value: 'active' },
              { label: 'Vô hiệu hóa (Inactive)', value: 'inactive' },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <DataTable<Ingredient>
        data={filteredList}
        keyExtractor={(i) => i.id}
        isLoading={loading}
        emptyTitle="Không có nguyên liệu phù hợp"
        emptyMessage="Hãy thử tìm từ khóa khác hoặc bấm '+ Thêm nguyên liệu mới' để mở rộng danh mục."
        columns={[
          {
            header: 'Mã & Tên nguyên liệu',
            render: (i) => (
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#B47820] bg-[#FAF9F5] px-1.5 py-0.5 rounded border border-[#B47820]/30">
                    {i.code}
                  </span>
                  <span className="font-semibold text-[#1A1917]">{i.name}</span>
                </div>
                {i.supplierNotes && (
                  <div className="text-[11px] text-[#706E68] mt-0.5 truncate max-w-md">
                    Ghi chú: {i.supplierNotes}
                  </div>
                )}
              </div>
            ),
          },
          {
            header: 'Nhóm (Group)',
            render: (i) => (
              <span className="inline-block px-2 py-0.5 rounded text-xs bg-[#FAF9F5] text-[#1A1917] border border-[#E8E2D9]">
                {i.group}
              </span>
            ),
          },
          {
            header: 'Đơn vị đo',
            render: (i) => (
              <span className="font-mono text-xs text-[#1A1917] font-semibold">{i.defaultUnit}</span>
            ),
          },
          {
            header: 'Đơn giá định mức',
            render: (i) => (
              <div className="font-mono text-xs text-[#1A1917]">
                {typeof i.costPerUnit === 'number' && i.costPerUnit > 0
                  ? `${i.costPerUnit.toLocaleString('vi-VN')} đ / ${i.defaultUnit}`
                  : '—'}
              </div>
            ),
          },
          {
            header: 'Trạng thái',
            render: (i) =>
              i.isActive ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Kích hoạt
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  Vô hiệu
                </span>
              ),
          },
          {
            header: 'Thao tác',
            className: 'text-right',
            render: (i) => (
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEditModal(i)}>
                  Chỉnh sửa
                </Button>
                <Button
                  size="sm"
                  variant={i.isActive ? 'ghost' : 'primary'}
                  onClick={() => handleToggleActive(i)}
                >
                  {i.isActive ? 'Tắt' : 'Bật'}
                </Button>
              </div>
            ),
          },
        ]}
      />

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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TextInput
                  label="Hệ số về đơn vị gốc"
                  required
                  type="number"
                  min="0.00000001"
                  step="any"
                  value={unitFactor}
                  onChange={(event) => setUnitFactor(Number(event.target.value))}
                />
                <TextInput
                  label="Độ lệch"
                  required
                  type="number"
                  step="any"
                  value={unitOffset}
                  onChange={(event) => setUnitOffset(Number(event.target.value))}
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
              </div>
              <label className="flex items-center gap-2 p-3 bg-[#FBF9F5] border border-[#E2DDD2] rounded-md">
                <input
                  type="checkbox"
                  checked={unitIsBase}
                  onChange={(event) => setUnitIsBase(event.target.checked)}
                />
                <span className="text-xs text-[#44403C]">Đây là đơn vị gốc của nhóm</span>
              </label>
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

      {/* Modal Thêm mới */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Thêm nguyên liệu mới vào danh mục"
        description="Đăng ký nguyên vật liệu quy chuẩn để đội ngũ R&D sử dụng trong công thức SOP."
        confirmLabel="Lưu nguyên liệu"
        confirmVariant="gold"
        onConfirm={handleCreateIngredient}
        isConfirming={createSubmitting}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput
              label="Mã nguyên liệu (Code)"
              required
              placeholder="VD: MAT-01"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              helper="Mã viết hoa, không trùng lặp"
            />
            <TextInput
              label="Tên nguyên liệu"
              required
              placeholder="VD: Bột Matcha Uji Cao Cấp"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Nhóm phân loại"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              options={groups.map((g) => ({ label: g, value: g }))}
            />
            <Select
              label="Đơn vị tính chuẩn"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              options={units.map((u) => ({ label: u, value: u }))}
            />
            <TextInput
              label="Đơn giá (VNĐ)"
              type="number"
              min="0"
              value={newCost}
              onChange={(e) => setNewCost(Number(e.target.value) || 0)}
              helper="Ước lượng giá vốn"
            />
          </div>

          <TextArea
            label="Ghi chú & Nhà cung cấp"
            placeholder="Nguồn gốc xuất xứ, điều kiện bảo quản mát 4-8°C..."
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            rows={2}
          />

          <label className="flex items-center gap-2 p-3 bg-[#FAF9F5] border border-[#E8E2D9] rounded cursor-pointer">
            <input
              type="checkbox"
              checked={newIsActive}
              onChange={(e) => setNewIsActive(e.target.checked)}
              className="w-4 h-4 accent-[#B47820]"
            />
            <span className="text-xs text-[#1A1917] font-medium">Kích hoạt sử dụng ngay trong R&amp;D Editor</span>
          </label>
        </div>
      </Dialog>

      {/* Modal Chỉnh sửa */}
      <Dialog
        isOpen={!!editingIng}
        onClose={() => setEditingIng(null)}
        title={`Chỉnh sửa nguyên liệu: [${editingIng?.code}]`}
        description="Cập nhật thông số nhóm, đơn vị đo, đơn giá và ghi chú định mức."
        confirmLabel="Cập nhật"
        confirmVariant="gold"
        onConfirm={handleEditIngredient}
        isConfirming={editSubmitting}
      >
        <div className="space-y-4">
          <TextInput
            label="Tên nguyên liệu"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Nhóm phân loại"
              value={editGroup}
              onChange={(e) => setEditGroup(e.target.value)}
              options={groups.map((g) => ({ label: g, value: g }))}
            />
            <Select
              label="Đơn vị tính chuẩn"
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
              options={units.map((u) => ({ label: u, value: u }))}
            />
            <TextInput
              label="Đơn giá (VNĐ)"
              type="number"
              min="0"
              value={editCost}
              onChange={(e) => setEditCost(Number(e.target.value) || 0)}
            />
          </div>

          <TextArea
            label="Ghi chú & Nhà cung cấp"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={2}
          />

          <label className="flex items-center gap-2 p-3 bg-[#FAF9F5] border border-[#E8E2D9] rounded cursor-pointer">
            <input
              type="checkbox"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              className="w-4 h-4 accent-[#B47820]"
            />
            <span className="text-xs text-[#1A1917] font-medium">Trạng thái kích hoạt (Active)</span>
          </label>
        </div>
      </Dialog>
    </div>
  );
}
