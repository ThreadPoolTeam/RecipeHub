'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FlaskConical, Plus } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Ingredient } from '@/lib/demo/types';
import { Button, Alert } from '@/components/workspace/fields';
import { IngredientCategoryPanel, IngredientCategoryEditing } from '@/components/workspace/ingredient-category-panel';
import { CatalogPageHeader, CatalogTabs } from '@/components/workspace/catalog-ui';
import { useToast } from '@/components/workspace/toast';
import { CatalogItem } from '@/lib/api/backend-repository';
import { useMediaPreviews } from '@/components/workspace/use-media-previews';
import { IngredientCard } from './ingredient-card';
import { IngredientFilterBar } from './ingredient-filter-bar';

type IngredientTab = 'ingredients' | 'categories';

export default function RndIngredientsPage() {
  const { session, repo, dataVersion, touch } = useDemo();
  const { toast } = useToast();
  const { previews } = useMediaPreviews();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<IngredientTab>('ingredients');
  const [categoryEditing, setCategoryEditing] = useState<IngredientCategoryEditing>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const ingredientGroups = useMemo(() => categories.filter((item) => item.state === 'active').map((item) => item.name), [categories]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const data = await repo.getIngredients();
      setIngredients(data);
    } catch (err: unknown) {
      const e = err as Error;
      const isAbort = e && (e.name === 'AbortError' || e.message?.includes('abort'));
      if (!isAbort) setLoadError(e.message || 'Lỗi tải nguyên liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIngredients(); }, [repo, dataVersion]);

  const reloadCategories = async () => { setCategories(await repo.getIngredientCategories()); };

  useEffect(() => {
    let isMounted = true;
    setCategoriesLoading(true);
    repo.getIngredientCategories()
      .then((items) => { if (isMounted) setCategories(items); })
      .catch((error: unknown) => {
        if (isMounted) {
          const isAbort = error instanceof Error && (error.name === 'AbortError' || error.message?.includes('abort'));
          if (!isAbort) setLoadError(error instanceof Error ? error.message : 'Không thể tải phân nhóm nguyên liệu.');
        }
      })
      .finally(() => { if (isMounted) setCategoriesLoading(false); });
    return () => { isMounted = false; };
  }, [repo]);

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matches = item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || (item.note && item.note.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (groupFilter !== 'all' && item.group !== groupFilter) return false;
      if (statusFilter === 'active' && !item.isActive) return false;
      if (statusFilter === 'inactive' && item.isActive) return false;

      return true;
    });
  }, [ingredients, searchQuery, groupFilter, statusFilter]);

  const totalItems = filteredIngredients.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIngredients.slice(start, start + pageSize);
  }, [filteredIngredients, currentPage, pageSize]);

  const handleToggleActive = async (ingredient: Ingredient) => {
    if (!session) return;
    try {
      setTogglingId(ingredient.id);
      const updatedState = !ingredient.isActive;
      await repo.updateIngredient(session, ingredient.id, { isActive: updatedState });
      touch();
      toast({ type: 'success', title: updatedState ? 'Đã kích hoạt nguyên liệu' : 'Đã tạm ngưng nguyên liệu', description: ingredient.name });
      await fetchIngredients();
    } catch (err: unknown) {
      const e = err as Error;
      toast({ type: 'error', title: 'Không thể đổi trạng thái', description: e.message || 'Vui lòng thử lại.' });
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

      {loadError && <Alert type="error" message={loadError} onClose={() => setLoadError(null)} />}

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
          onNotice={(notice) => toast({ type: notice.type, title: notice.message })}
        />
      ) : (
      <>
      <IngredientFilterBar
        search={searchQuery}
        group={groupFilter}
        status={statusFilter}
        groups={ingredientGroups}
        onSearch={(value) => { setSearchQuery(value); setCurrentPage(1); }}
        onGroup={(value) => { setGroupFilter(value); setCurrentPage(1); }}
        onStatus={(value) => { setStatusFilter(value); setCurrentPage(1); }}
      />

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">Đang tải nguyên liệu...</div>
      ) : pagedItems.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-12 text-center">
          <p className="font-medium">Chưa tìm thấy nguyên liệu</p>
          <p className="text-sm text-muted-foreground">Không có nguyên liệu nào khớp với từ khóa, loại hoặc trạng thái đang lọc.</p>
          <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(''); setGroupFilter('all'); setStatusFilter('all'); setCurrentPage(1); }}>Xóa bộ lọc</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {pagedItems.map((item) => (
              <IngredientCard key={item.id} item={item} imageUrl={item.imageAssetId ? previews[item.imageAssetId] : undefined} toggling={togglingId === item.id} onToggle={() => handleToggleActive(item)} />
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
