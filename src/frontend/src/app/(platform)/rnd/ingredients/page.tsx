'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FlaskConical, Plus, Pencil } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Ingredient } from '@/lib/demo/types';
import { Button, Select, Alert, SearchInput } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';

export default function RndIngredientsPage() {
  const { session, repo, dataVersion, touch } = useDemo();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientGroups, setIngredientGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

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

  useEffect(() => {
    let isMounted = true;
    repo.getIngredientCategories()
      .then((categories) => {
        if (!isMounted) return;
        setIngredientGroups(categories.filter((item) => item.state === 'active').map((item) => item.name));
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setAlertNotice({ type: 'error', message: error instanceof Error ? error.message : 'Không thể tải phân nhóm nguyên liệu.' });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [repo]);

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
            <Link
              href={`/rnd/ingredients/${item.id}/edit`}
              className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#F5F0E8] text-[#B47820] border border-[#E8E2D9] hover:bg-[#EAE3D6] transition"
              title="Xem & chỉnh sửa nguyên liệu"
            >
              {item.code}
            </Link>
            <Link
              href={`/rnd/ingredients/${item.id}/edit`}
              className="font-semibold text-[#1A1917] hover:text-[#B47820] text-sm text-left transition truncate"
            >
              {item.name}
            </Link>
          </div>
          {item.supplierNotes && (
            <p className="text-xs text-[#706E68] mt-0.5 line-clamp-1 italic">
              NCC: {item.supplierNotes}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Nhóm',
      render: (item: Ingredient) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F5F0E8] text-[#706E68] border border-[#E8E2D9]">
          {item.group}
        </span>
      ),
    },
    {
      header: 'Đơn Vị Chuẩn',
      render: (item: Ingredient) => (
        <span className="font-mono text-xs text-[#706E68]">{item.defaultUnit}</span>
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
        <div className="flex items-center justify-end">
          <Link
            href={`/rnd/ingredients/${item.id}/edit`}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#706E68] hover:text-[#B47820] hover:bg-[#F5F0E8] border border-transparent hover:border-[#E8E2D9] transition"
            title="Chỉnh sửa nguyên liệu"
            aria-label="Chỉnh sửa nguyên liệu"
          >
            <Pencil className="w-4 h-4" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E2D9] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1917] flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#B47820]" /> Kho Nguyên Liệu R&amp;D
          </h1>
          <p className="text-xs sm:text-sm text-[#706E68] mt-0.5">
            Định nghĩa danh mục nguyên liệu tiêu chuẩn và đơn vị đo phục vụ xây dựng công thức.
          </p>
        </div>
        <div>
          <Link href="/rnd/ingredients/new">
            <Button variant="gold" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Thêm nguyên liệu
            </Button>
          </Link>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-[#E8E2D9] p-3 rounded-2xl shadow-xs">
        <div className="md:col-span-2">
          <SearchInput
            placeholder="Tìm theo mã hoặc tên nguyên liệu..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            onClear={() => {
              setSearchQuery('');
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
              ...ingredientGroups.map((g) => ({ value: g, label: g })),
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
    </div>
  );
}
