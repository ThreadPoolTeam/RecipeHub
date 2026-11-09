'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FlaskConical, Plus, Pencil } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Ingredient } from '@/lib/demo/types';
import { Button, Select, Alert, SearchInput } from '@/components/workspace/fields';
import { IngredientCategoryPanel, IngredientCategoryEditing } from '@/components/workspace/ingredient-category-panel';
import { CatalogPageHeader, CatalogTabs, StateToggle, editIconButtonClass } from '@/components/workspace/catalog-ui';
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


  return (
    <div className="space-y-6">
      <CatalogPageHeader
        icon={FlaskConical}
        title={<>Nguyên liệu</>}
        description="Quản lý nguyên liệu, nhóm và đơn vị mặc định dùng trong công thức."
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">Đang tải nguyên liệu...</div>
      ) : pagedItems.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-12 text-center">
          <p className="font-medium">Chưa tìm thấy nguyên liệu</p>
          <p className="text-sm text-muted-foreground">Không có nguyên liệu nào khớp với từ khóa, loại hoặc trạng thái đang lọc.</p>
          <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(''); setGroupFilter('all'); setStatusFilter('all'); }}>Xóa bộ lọc</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {pagedItems.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                <div className="flex aspect-[4/3] items-center justify-center bg-muted text-sm text-muted-foreground">Không có ảnh xem trước</div>
                <div className="space-y-3 p-5">
                  <p className="text-xs text-muted-foreground">{item.code} · {item.group}</p>
                  <Link href={`/rnd/ingredients/${item.id}/edit`} className="block text-lg font-semibold text-foreground hover:text-primary">{item.name}</Link>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <StateToggle active={item.isActive} disabled={togglingId === item.id} onToggle={() => handleToggleActive(item)} subject={`nguyên liệu "${item.name}"`} />
                    <span>Đơn vị mặc định: {item.defaultUnit}</span>
                  </div>
                  {item.warning && <p className="rounded-md bg-destructive-soft px-2 py-1 text-xs text-destructive">{item.warning}</p>}
                  {item.note && <p className="line-clamp-2 text-xs text-muted-foreground">{item.note}</p>}
                  <Link href={`/rnd/ingredients/${item.id}/edit`} className={editIconButtonClass} title="Chỉnh sửa nguyên liệu" aria-label={`Chỉnh sửa nguyên liệu ${item.name}`}><Pencil className="h-4 w-4" /></Link>
                </div>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{totalItems} nguyên liệu · Trang {currentPage}/{totalPages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)}>Trước</Button>
              <Button variant="secondary" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Sau</Button>
            </div>
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}
