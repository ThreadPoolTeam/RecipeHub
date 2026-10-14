'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FlaskConical, Plus, Pencil, Check, X } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Ingredient } from '@/lib/demo/types';
import { Button, TextInput, Select, Alert } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';
import { Dialog } from '@/components/workspace/dialog';
const INGREDIENT_GROUPS = ['Trà', 'Sữa & Kem', 'Siro & Đường', 'Topping', 'Khác'];
const UNIT_OPTIONS = ['g', 'ml', 'shot', 'muỗng', 'gói', 'quả', 'lon', 'hộp'];

interface IngredientFormData {
  code: string;
  name: string;
  group: string;
  defaultUnit: string;
  isActive: boolean;
  costPerUnit: number;
  supplierNotes: string;
}

const initialFormData: IngredientFormData = {
  code: '',
  name: '',
  group: 'Trà',
  defaultUnit: 'g',
  isActive: true,
  costPerUnit: 0,
  supplierNotes: '',
};

export default function RndIngredientsPage() {
  const { session, repo, dataVersion, touch } = useDemo();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [formData, setFormData] = useState<IngredientFormData>(initialFormData);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success/Error notification
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Load ingredients
  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const data = await repo.getIngredients();
      setIngredients(data);
    } catch (err: unknown) {
      const e = err as Error;
      setAlertNotice({ type: 'error', message: e.message || 'Lỗi tải nguyên liệu' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, [repo, dataVersion]);

  // Client-side filtering
  const filteredIngredients = useMemo(() => {
    return ingredients.filter((item) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matches =
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          (item.supplierNotes && item.supplierNotes.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Group filter
      if (groupFilter !== 'all' && item.group !== groupFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'active' && !item.isActive) return false;
      if (statusFilter === 'inactive' && item.isActive) return false;

      return true;
    });
  }, [ingredients, searchQuery, groupFilter, statusFilter]);

  // Pagination calculation
  const totalItems = filteredIngredients.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIngredients.slice(start, start + pageSize);
  }, [filteredIngredients, currentPage, pageSize]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingIngredient(null);
    setFormData(initialFormData);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setFormData({
      code: ingredient.code,
      name: ingredient.name,
      group: ingredient.group || 'Khác',
      defaultUnit: ingredient.defaultUnit || 'ml',
      isActive: ingredient.isActive,
      costPerUnit: ingredient.costPerUnit || 0,
      supplierNotes: ingredient.supplierNotes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSave = async () => {
    if (!session) return;
    setFormError(null);

    // Validation
    const cleanCode = formData.code.trim().toUpperCase();
    const cleanName = formData.name.trim();

    if (!cleanCode) {
      setFormError('Vui lòng nhập mã nguyên liệu (vd: ING-TRA-01).');
      return;
    }
    if (!cleanName) {
      setFormError('Vui lòng nhập tên nguyên liệu.');
      return;
    }

    // Code uniqueness check
    const isCodeDuplicate = ingredients.some((ing) => {
      if (editingIngredient && ing.id === editingIngredient.id) return false;
      return ing.code.toUpperCase() === cleanCode;
    });

    if (isCodeDuplicate) {
      setFormError(`Mã nguyên liệu "${cleanCode}" đã tồn tại trên hệ thống. Vui lòng chọn mã khác.`);
      return;
    }

    try {
      setFormSubmitting(true);
      if (editingIngredient) {
        await repo.updateIngredient(session, editingIngredient.id, {
          code: cleanCode,
          name: cleanName,
          group: formData.group,
          defaultUnit: formData.defaultUnit,
          isActive: formData.isActive,
          costPerUnit: Number(formData.costPerUnit) || 0,
          supplierNotes: formData.supplierNotes.trim(),
        });
        setAlertNotice({ type: 'success', message: `Đã cập nhật nguyên liệu: ${cleanName}` });
      } else {
        await repo.createIngredient(session, {
          code: cleanCode,
          name: cleanName,
          group: formData.group,
          defaultUnit: formData.defaultUnit,
          isActive: formData.isActive,
          costPerUnit: Number(formData.costPerUnit) || 0,
          supplierNotes: formData.supplierNotes.trim(),
        });
        setAlertNotice({ type: 'success', message: `Đã thêm nguyên liệu mới: ${cleanName}` });
      }

      touch();
      setIsModalOpen(false);
      await fetchIngredients();
    } catch (err: unknown) {
      const e = err as Error;
      setFormError(e.message || 'Lỗi khi lưu nguyên liệu.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Quick Toggle Active/Inactive
  const handleToggleActive = async (ingredient: Ingredient) => {
    if (!session) return;
    try {
      const updatedState = !ingredient.isActive;
      await repo.updateIngredient(session, ingredient.id, {
        isActive: updatedState,
      });
      touch();
      setAlertNotice({
        type: 'success',
        message: `${updatedState ? 'Đã kích hoạt' : 'Đã tạm ngưng'} nguyên liệu "${ingredient.name}"`,
      });
      await fetchIngredients();
    } catch (err: unknown) {
      const e = err as Error;
      setAlertNotice({ type: 'error', message: e.message || 'Không thể đổi trạng thái' });
    }
  };

  const columns = [
    {
      header: 'Mã & Tên Nguyên Liệu',
      render: (item: Ingredient) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#F5F2EB] text-[#B47820] border border-[#E2DDD2]">
              {item.code}
            </span>
            <span className="font-semibold text-[#1C1917] text-sm">{item.name}</span>
          </div>
          {item.supplierNotes && (
            <p className="text-xs text-[#78716C] mt-0.5 line-clamp-1 italic">
              NCC: {item.supplierNotes}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Nhóm',
      render: (item: Ingredient) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F5F2EB] text-[#78716C] border border-[#E2DDD2]">
          {item.group}
        </span>
      ),
    },
    {
      header: 'Đơn Vị Chuẩn',
      render: (item: Ingredient) => (
        <span className="font-mono text-xs text-[#78716C]">{item.defaultUnit}</span>
      ),
    },
    {
      header: 'Giá tham khảo',
      render: (item: Ingredient) => (
        <span className="text-xs text-[#1C1917]">
          {item.costPerUnit ? `${item.costPerUnit.toLocaleString('vi-VN')} đ` : '—'}
        </span>
      ),
    },
    {
      header: 'Trạng Thái',
      render: (item: Ingredient) => (
        <button
          onClick={() => handleToggleActive(item)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition ${
            item.isActive
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200'
          }`}
          title="Bấm để bật/tắt hoạt động"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.isActive ? 'bg-emerald-500' : 'bg-zinc-400'
            }`}
          />
          {item.isActive ? 'Đang dùng' : 'Tạm khóa'}
        </button>
      ),
    },
    {
      header: 'Thao Tác',
      className: 'text-right',
      render: (item: Ingredient) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenEdit(item)}
          >
            Sửa
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2DDD2] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1917] flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#B47820]" /> Kho Nguyên Liệu R&amp;D
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-0.5">
            Định nghĩa danh mục nguyên liệu tiêu chuẩn, đơn vị đo và giá tham khảo.
          </p>
        </div>
        <div>
          <Button variant="gold" size="sm" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1" /> Thêm nguyên liệu
          </Button>
        </div>
      </div>

      {alertNotice && (
        <Alert
          type={alertNotice.type}
          message={alertNotice.message}
          onClose={() => setAlertNotice(null)}
        />
      )}

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-[#E2DDD2] p-3 rounded-lg shadow-xs">
        <div className="md:col-span-2">
          <TextInput
            placeholder="Tìm theo mã hoặc tên nguyên liệu..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div>
          <Select
            value={groupFilter}
            onChange={(e) => {
              setGroupFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'Tất cả phân nhóm' },
              ...INGREDIENT_GROUPS.map((g) => ({ value: g, label: g })),
            ]}
          />
        </div>

        <div>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'active', label: 'Đang sử dụng' },
              { value: 'inactive', label: 'Đã tạm khóa' },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={pagedItems}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        emptyTitle="Chưa tìm thấy nguyên liệu"
        emptyMessage="Không có nguyên liệu nào khớp với điều kiện tìm kiếm hoặc phân nhóm hiện tại."
        emptyAction={
          <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(''); setGroupFilter('all'); setStatusFilter('all'); }}>
            Xóa bộ lọc
          </Button>
        }
        pagination={{
          page: currentPage,
          totalPages,
          total: totalItems,
          onPageChange: setCurrentPage,
        }}
      />

      {/* Create / Edit Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => {
          if (!formSubmitting) setIsModalOpen(false);
        }}
        title={editingIngredient ? `Chỉnh Sửa: ${editingIngredient.name}` : 'Thêm Nguyên Liệu Tiêu Chuẩn'}
        description="Mã nguyên liệu là duy nhất, dùng để liên kết tự động trong các bản thảo công thức R&D."
        confirmLabel={editingIngredient ? 'Cập Nhật' : 'Tạo Mới'}
        confirmVariant="gold"
        isConfirming={formSubmitting}
        onConfirm={handleSave}
      >
        <div className="space-y-4 py-2">
          {formError && <Alert type="error" message={formError} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput
              label="Mã Nguyên Liệu *"
              placeholder="VD: ING-TRA-01"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              helper="Mã viết hoa, không trùng lặp"
            />

            <TextInput
              label="Tên Nguyên Liệu *"
              placeholder="VD: Trà Ô Long Rang Thượng Hạng"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Nhóm Nguyên Liệu *"
              value={formData.group}
              onChange={(e) => setFormData({ ...formData, group: e.target.value })}
              options={INGREDIENT_GROUPS.map((g) => ({ value: g, label: g }))}
            />

            <Select
              label="Đơn Vị Tính Chuẩn *"
              value={formData.defaultUnit}
              onChange={(e) => setFormData({ ...formData, defaultUnit: e.target.value })}
              options={UNIT_OPTIONS.map((u) => ({ value: u, label: u }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextInput
              label="Giá Đơn Vị Dự Kiến (VNĐ)"
              type="number"
              placeholder="0"
              value={formData.costPerUnit || ''}
              onChange={(e) => setFormData({ ...formData, costPerUnit: Number(e.target.value) || 0 })}
              helper="Ước tính giá vốn nguyên liệu"
            />

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-800 text-[#C9A84C] focus:ring-[#C9A84C] w-4 h-4"
                />
                <span>Kích hoạt sử dụng trong công thức</span>
              </label>
            </div>
          </div>

          <div>
            <TextInput
              label="Ghi Chú Nhà Cung Cấp / Bảo Quản"
              placeholder="VD: Công ty TNHH Trà Việt - bảo quản nơi khô ráo, kín khí..."
              value={formData.supplierNotes}
              onChange={(e) => setFormData({ ...formData, supplierNotes: e.target.value })}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
