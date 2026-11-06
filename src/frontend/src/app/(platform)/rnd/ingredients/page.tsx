'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FlaskConical, Plus, Pencil } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Ingredient } from '@/lib/demo/types';
import { Button, Select, Alert, SearchInput } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';
import { IngredientCategoryPanel, IngredientCategoryEditing } from '@/components/workspace/ingredient-category-panel';
import { CatalogPageHeader, CatalogTabs, CodeChip, StateToggle, editIconButtonClass } from '@/components/workspace/catalog-ui';
import { CatalogItem } from '@/lib/api/backend-repository';

type IngredientTab = 'ingredients' | 'categories';

export default function RndIngredientsPage() {
  const { session, repo, dataVersion, touch } = useDemo();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<IngredientTab>('ingredients');
  const [categoryEditing, setCategoryEditing] = useState<IngredientCategoryEditing>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const ingredientGroups = useMemo(
    () => categories.filter((item) => item.state === 'active').map((item) => item.name),
    [categories]
  );

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
      const isAbort = e && (e.name === 'AbortError' || e.message?.includes('abort'));
      if (!isAbort) {
        setAlertNotice({ type: 'error', message: e.message || 'Lỗi tải nguyên liệu' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, [repo, dataVersion]);

  const reloadCategories = async () => {
    setCategories(await repo.getIngredientCategories());
  };

  useEffect(() => {
    let isMounted = true;
    setCategoriesLoading(true);
    repo.getIngredientCategories()
      .then((items) => {
        if (!isMounted) return;
        setCategories(items);
      })
      .catch((error: unknown) => {
        if (isMounted) {
          const isAbort = error instanceof Error && (error.name === 'AbortError' || error.message?.includes('abort'));
          if (!isAbort) {
            setAlertNotice({ type: 'error', message: error instanceof Error ? error.message : 'Không thể tải phân nhóm nguyên liệu.' });
          }
        }
      })
      .finally(() => {
        if (isMounted) setCategoriesLoading(false);
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
          (item.note && item.note.toLowerCase().includes(q));
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
      setTogglingId(ingredient.id);
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
    } finally {
      setTogglingId(null);
    }
  };

  const columns = [
    {
      header: 'Mã & Tên Nguyên Liệu',
      render: (item: Ingredient) => (
        <div>
          <div className="flex items-center gap-2">
            <CodeChip>{item.code}</CodeChip>
            <Link
              href={`/rnd/ingredients/${item.id}/edit`}
              className="font-semibold text-[#1A1917] hover:text-[#B47820] text-sm text-left transition truncate"
            >
              {item.name}
            </Link>
          </div>
          {item.note && (
            <p className="text-xs text-[#706E68] mt-0.5 line-clamp-1 italic">
              Ghi chú: {item.note}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Loại',
      render: (item: Ingredient) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F5F0E8] text-[#706E68] border border-[#E8E2D9]">
          {item.group}
        </span>
      ),
    },
    {
      header: 'Đơn Vị Định Mức',
      render: (item: Ingredient) => (
        <span className="font-mono text-xs text-[#706E68]">{item.defaultUnit}</span>
      ),
    },
    {
      header: 'Trạng Thái',
      render: (item: Ingredient) => (
        <StateToggle
          active={item.isActive}
          disabled={togglingId === item.id}
          onToggle={() => handleToggleActive(item)}
          subject={`nguyên liệu "${item.name}"`}
        />
      ),
    },
    {
      header: 'Thao Tác',
      className: 'text-right',
      render: (item: Ingredient) => (
        <div className="flex items-center justify-end">
          <Link
            href={`/rnd/ingredients/${item.id}/edit`}
            className={editIconButtonClass}
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
      <CatalogPageHeader
        icon={FlaskConical}
        title={<>Kho Nguyên Liệu R&amp;D</>}
        description="Quản lý nguyên liệu và loại nguyên liệu dùng để xây dựng công thức."
        actions={
          activeTab === 'ingredients' ? (
            <Link href="/rnd/ingredients/new">
              <Button variant="gold" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Thêm nguyên liệu
              </Button>
            </Link>
          ) : (
            <Button variant="gold" size="sm" onClick={() => setCategoryEditing({ item: null })}>
              <Plus className="w-4 h-4 mr-1" /> Thêm loại nguyên liệu
            </Button>
          )
        }
      />

      {alertNotice && (
        <Alert
          type={alertNotice.type}
          message={alertNotice.message}
          onClose={() => setAlertNotice(null)}
        />
      )}

      <CatalogTabs
        label="Kho nguyên liệu"
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: 'ingredients', label: 'Nguyên liệu', count: ingredients.length },
          { key: 'categories', label: 'Loại nguyên liệu', count: categories.length },
        ]}
      />

      {activeTab === 'categories' ? (
        <IngredientCategoryPanel
          categories={categories}
          ingredients={ingredients}
          isLoading={categoriesLoading}
          editing={categoryEditing}
          onEditingChange={setCategoryEditing}
          onChanged={reloadCategories}
          onNotice={setAlertNotice}
        />
      ) : (
      <>
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
              { value: 'all', label: 'Tất cả loại' },
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
              { value: 'active', label: 'Đang dùng' },
              { value: 'inactive', label: 'Tạm khóa' },
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
        emptyMessage="Không có nguyên liệu nào khớp với từ khóa, loại hoặc trạng thái đang lọc."
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
      </>
      )}
    </div>
  );
}
