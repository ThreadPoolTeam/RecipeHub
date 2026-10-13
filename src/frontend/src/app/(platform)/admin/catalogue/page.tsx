'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useDemo } from '@/lib/demo/provider';
import { Ingredient } from '@/lib/demo/types';
import { Button, TextInput, Select, TextArea, Alert } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';
import { Dialog } from '@/components/workspace/dialog';

const GROUPS = ['Trà', 'Sữa & Kem', 'Siro & Đường', 'Topping', 'Khác'];
const UNITS = ['g', 'ml', 'shot', 'muỗng', 'gói'];

export default function AdminCataloguePage() {
  const { session, repo, dataVersion, touch } = useDemo();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
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
  const [newGroup, setNewGroup] = useState(GROUPS[0]);
  const [newUnit, setNewUnit] = useState(UNITS[0]);
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

  // Group & status metrics
  const stats = useMemo(() => {
    const total = ingredients.length;
    const active = ingredients.filter((i) => i.isActive).length;
    const inactive = total - active;
    const groupCount: Record<string, number> = {};
    for (const g of GROUPS) groupCount[g] = 0;
    for (const item of ingredients) {
      groupCount[item.group] = (groupCount[item.group] || 0) + 1;
    }
    return { total, active, inactive, groupCount };
  }, [ingredients]);

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
      setNewGroup(GROUPS[0]);
      setNewUnit(UNITS[0]);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-[#F2F0EB]">Danh mục Đơn vị & Nguyên liệu Toàn cục</h1>
          <p className="text-zinc-400 text-xs mt-1">
            Quy chuẩn danh mục nguyên vật liệu R&D BeverageLab, quản lý đơn vị đo lường và định mức chi phí.
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

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="bg-[#18181C] border border-zinc-800 rounded-lg p-3">
          <div className="text-[11px] text-zinc-400 uppercase font-semibold">Tổng nguyên liệu</div>
          <div className="text-xl font-bold text-[#F2F0EB] mt-1">{stats.total}</div>
        </div>
        <div className="bg-[#18181C] border border-zinc-800 rounded-lg p-3">
          <div className="text-[11px] text-zinc-400 uppercase font-semibold">Đang kích hoạt</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{stats.active}</div>
        </div>
        <div className="bg-[#18181C] border border-zinc-800 rounded-lg p-3">
          <div className="text-[11px] text-zinc-400 uppercase font-semibold">Vô hiệu hóa</div>
          <div className="text-xl font-bold text-zinc-500 mt-1">{stats.inactive}</div>
        </div>
        {GROUPS.map((g) => (
          <div key={g} className="bg-[#18181C] border border-zinc-800 rounded-lg p-3">
            <div className="text-[11px] text-zinc-400 uppercase font-semibold truncate">{g}</div>
            <div className="text-xl font-bold text-[#DEBF64] mt-1">{stats.groupCount[g] || 0}</div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 bg-[#18181C] border border-zinc-800 rounded-lg">
        <div className="sm:col-span-2">
          <TextInput
            placeholder="Tìm theo tên nguyên liệu, mã code hoặc ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <Select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            options={[
              { label: 'Tất cả nhóm', value: 'all' },
              ...GROUPS.map((g) => ({ label: `Nhóm: ${g}`, value: g })),
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
                  <span className="font-mono text-xs font-bold text-[#DEBF64] bg-[#2A2415] px-1.5 py-0.5 rounded border border-[#C9A84C]/30">
                    {i.code}
                  </span>
                  <span className="font-semibold text-zinc-100">{i.name}</span>
                </div>
                {i.supplierNotes && (
                  <div className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-md">
                    Ghi chú: {i.supplierNotes}
                  </div>
                )}
              </div>
            ),
          },
          {
            header: 'Nhóm (Group)',
            render: (i) => (
              <span className="inline-block px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-300 border border-zinc-700">
                {i.group}
              </span>
            ),
          },
          {
            header: 'Đơn vị đo',
            render: (i) => (
              <span className="font-mono text-xs text-zinc-300 font-semibold">{i.defaultUnit}</span>
            ),
          },
          {
            header: 'Đơn giá định mức',
            render: (i) => (
              <div className="font-mono text-xs text-zinc-300">
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
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Kích hoạt
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-zinc-900 text-zinc-500 border border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
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
              options={GROUPS.map((g) => ({ label: g, value: g }))}
            />
            <Select
              label="Đơn vị tính chuẩn"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              options={UNITS.map((u) => ({ label: u, value: u }))}
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

          <label className="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={newIsActive}
              onChange={(e) => setNewIsActive(e.target.checked)}
              className="w-4 h-4 accent-[#C9A84C]"
            />
            <span className="text-xs text-zinc-300 font-medium">Kích hoạt sử dụng ngay trong R&D Editor</span>
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
              options={GROUPS.map((g) => ({ label: g, value: g }))}
            />
            <Select
              label="Đơn vị tính chuẩn"
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
              options={UNITS.map((u) => ({ label: u, value: u }))}
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
            onChange={(e) => setNewNotes(e.target.value)}
            rows={2}
          />

          <label className="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              className="w-4 h-4 accent-[#C9A84C]"
            />
            <span className="text-xs text-zinc-300 font-medium">Trạng thái kích hoạt (Active)</span>
          </label>
        </div>
      </Dialog>
    </div>
  );
}
