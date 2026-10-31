'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookOpen, Plus, Pencil, RotateCcw, Coffee, History } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion, RecipeStatus } from '@/lib/demo/types';
import { Button, TextInput, Select, SearchInput } from '@/components/workspace/fields';
import { StatusBadge } from '@/components/workspace/status-badge';
import { DataTable } from '@/components/workspace/data-table';
import { VersionHistoryDrawer } from '@/components/workspace/version-history-drawer';
import { getStoredAiDrafts } from '@/lib/ai-draft-storage';

function RecipeListContent() {
  const { session, repo, dataVersion } = useDemo();
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get('status') as RecipeStatus | null;

  const [recipes, setRecipes] = useState<RecipeVersion[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Version History Drawer State
  const [selectedRecipeForHistory, setSelectedRecipeForHistory] = useState<RecipeVersion | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [drawerVersions, setDrawerVersions] = useState<RecipeVersion[]>([]);
  const [isLoadingDrawerVersions, setIsLoadingDrawerVersions] = useState(false);

  const handleOpenHistoryDrawer = async (item: RecipeVersion) => {
    setSelectedRecipeForHistory(item);
    setIsHistoryDrawerOpen(true);
    setDrawerVersions([item]);
    setIsLoadingDrawerVersions(true);
    try {
      const recipeKey = item.recipeId || item.id;
      const list = await repo.getRecipeVersions(session!, recipeKey);
      if (list.length > 0) {
        setDrawerVersions(list);
      }
    } catch (err) {
      console.error('Failed to load recipe versions:', err);
    } finally {
      setIsLoadingDrawerVersions(false);
    }
  };
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecipeStatus | 'all'>(
    initialStatusParam || 'all'
  );
  const [creatorFilter, setCreatorFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    if (!session) return;
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([
      repo.getRecipes(session, {
        page: 1,
        pageSize: 100, // Load up to 100 recipes for responsive client-side filtering
      }),
      repo.getMedia(),
    ])
      .then(([resResult, mediaResult]) => {
        if (!isMounted) return;
        if (resResult.status === 'fulfilled') {
          setRecipes(resResult.value.items);
        }

        const mDict: Record<string, string> = {};
        if (mediaResult.status === 'fulfilled') {
          mediaResult.value.forEach((m) => {
            if (m.blob && m.blob.size > 0) {
              mDict[m.id] = URL.createObjectURL(m.blob);
            } else if (m.deliveryUrl) {
              mDict[m.id] = m.deliveryUrl;
            }
          });
        }
        setMediaMap(mDict);
      })
      .catch((err) => {
        console.error('Failed to load recipes or media:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session, repo, dataVersion]);

  // Unique creators list
  const creatorOptions = useMemo(() => {
    const emails = Array.from(new Set(recipes.map((r) => r.creatorEmail))).filter(Boolean);
    return [
      { value: 'all', label: 'Tất cả người tạo' },
      ...emails.map((email) => ({ value: email, label: email })),
    ];
  }, [recipes]);

  // Group all versions by recipeId
  const recipeVersionsGroup = useMemo(() => {
    const map: Record<string, RecipeVersion[]> = {};
    recipes.forEach((r) => {
      const key = r.recipeId || r.code;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    Object.values(map).forEach((list) => {
      list.sort((a, b) => b.versionNumber - a.versionNumber);
    });
    return map;
  }, [recipes]);

  // Distinct recipes: take the latest version of each recipe identity
  const distinctRecipes = useMemo(() => {
    const seen = new Set<string>();
    const result: RecipeVersion[] = [];
    for (const r of recipes) {
      const key = r.recipeId || r.code;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(r);
    }
    return result;
  }, [recipes]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return distinctRecipes.filter((recipe) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matches =
          recipe.code.toLowerCase().includes(q) ||
          recipe.name.toLowerCase().includes(q) ||
          (recipe.description && recipe.description.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (statusFilter !== 'all' && recipe.status !== statusFilter) {
        return false;
      }

      if (creatorFilter !== 'all' && recipe.creatorEmail !== creatorFilter) {
        return false;
      }

      return true;
    });
  }, [distinctRecipes, searchQuery, statusFilter, creatorFilter]);
  // Pagination slices
  const totalItems = filteredRecipes.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecipes.slice(start, start + pageSize);
  }, [filteredRecipes, page, pageSize]);

  const columns = [
    {
      header: 'Mã & Tên công thức',
      render: (item: RecipeVersion) => {
        let coverUrl: string | null = null;
        if (item.primaryMediaAssetId) {
          coverUrl = mediaMap[item.primaryMediaAssetId] || null;
          if (!coverUrl && typeof window !== 'undefined') {
            coverUrl = localStorage.getItem(`recipehub_media_url_${item.primaryMediaAssetId}`) || null;
          }
          if (!coverUrl) {
            coverUrl = `/api/backend/api/v1/content/image-drafts/${item.primaryMediaAssetId}/image`;
          }
        }
        if (!coverUrl) {
          const versionId = item.versionId || item.id;
          const localDrafts = getStoredAiDrafts(versionId, 'final_product');
          if (localDrafts.length > 0) {
            coverUrl = localDrafts[0].previewUrl;
          }
        }

        const versionsOfThisRecipe = recipeVersionsGroup[item.recipeId || item.code] || [item];
        const hasOlderVersions = (item.versionNumber && item.versionNumber > 1) || versionsOfThisRecipe.length > 1;
        const olderCount = Math.max(
          item.versionNumber ? item.versionNumber - 1 : 0,
          versionsOfThisRecipe.length - 1
        );
        return (
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#F5F0E8] border border-[#E8E2D9] overflow-hidden flex items-center justify-center shrink-0 shadow-2xs relative">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const icon = e.currentTarget.parentElement?.querySelector('.fallback-coffee');
                    if (icon) (icon as HTMLElement).style.display = 'block';
                  }}
                />
              ) : null}
              <Coffee
                className={`w-6 h-6 text-[#B47820] fallback-coffee ${coverUrl ? 'hidden' : 'block'}`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/rnd/recipes/${item.id}`}
                  className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#F5F0E8] text-[#B47820] border border-[#E8E2D9] hover:bg-[#EAE3D6] transition"
                  title="Xem chi tiết công thức"
                >
                  {item.code}
                </Link>
                <span className="text-[#8C887F] font-mono text-xs">[{item.versionLabel}]</span>
                <Link
                  href={`/rnd/recipes/${item.id}`}
                  className="font-semibold text-sm text-[#1A1917] hover:text-[#B47820] transition truncate"
                >
                  {item.name}
                </Link>

                {hasOlderVersions && (
                  <button
                    type="button"
                    onClick={() => handleOpenHistoryDrawer(item)}
                    className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                    title="Xem lịch sử các phiên bản của công thức này"
                  >
                    <History className="w-2.5 h-2.5" /> +{olderCount} bản cũ
                  </button>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-[#706E68] mt-0.5 line-clamp-1 max-w-sm">{item.description}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Trạng thái',
      render: (item: RecipeVersion) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Định lượng & Quy trình',
      render: (item: RecipeVersion) => {
        const hasIngredients = item.ingredients && item.ingredients.length > 0;
        const hasSteps = item.steps && item.steps.length > 0;
        return (
          <div className="text-xs text-[#706E68] space-y-0.5">
            <div>
              <span className="text-[#8C887F]">Nguyên liệu:</span>{' '}
              <span className="text-[#1A1917] font-medium">{hasIngredients ? item.ingredients.length : '—'}</span>
            </div>
            <div>
              <span className="text-[#8C887F]">SOP:</span>{' '}
              <span className="text-[#1A1917] font-medium">{hasSteps ? `${item.steps.length} bước` : '—'}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Người tạo',
      render: (item: RecipeVersion) => (
        <span className="text-xs text-[#706E68] font-mono" title={item.creatorEmail || undefined}>
          {item.creatorEmail ? item.creatorEmail.split('@')[0] : '—'}
        </span>
      ),
    },
    {
      header: 'Cập nhật',
      render: (item: RecipeVersion) => (
        <span className="text-xs text-[#706E68]">
          {new Date(item.updatedAt).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      header: 'Thao tác',
      className: 'text-right',
      render: (item: RecipeVersion) => (
        <div className="flex items-center justify-end">
          <Link
            href={`/rnd/recipes/${item.id}/edit`}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#706E68] hover:text-[#B47820] hover:bg-[#F5F0E8] border border-transparent hover:border-[#E8E2D9] transition"
            title="Chỉnh sửa công thức"
            aria-label="Chỉnh sửa công thức"
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
            <BookOpen className="w-5 h-5 text-[#B47820]" /> Công Thức Đồ Uống
          </h1>
          <p className="text-xs sm:text-sm text-[#706E68] mt-0.5">
            Quản lý vòng đời công thức: Nháp, Chờ duyệt, Đã duyệt, Lưu trữ.
          </p>
        </div>
        <div>
          <Link href="/rnd/recipes/new">
            <Button variant="gold" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Tạo công thức mới
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-[#E8E2D9] p-3 rounded-2xl shadow-xs">
        <div className="md:col-span-2">
          <SearchInput
            placeholder="Tìm theo mã hoặc tên công thức..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            onClear={() => {
              setSearchQuery('');
              setPage(1);
            }}
          />
        </div>

        <div>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as RecipeStatus | 'all');
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'Draft', label: 'Bản nháp' },
              { value: 'Published', label: 'Đã phát hành' },
              { value: 'Archived', label: 'Lưu trữ' },
            ]}
          />
        </div>

        <div>
          <Select
            value={creatorFilter}
            onChange={(e) => {
              setCreatorFilter(e.target.value);
              setPage(1);
            }}
            options={creatorOptions}
          />
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={paginatedData}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        emptyTitle="Không tìm thấy công thức"
        emptyMessage="Không có công thức nào khớp với các tiêu chí tìm kiếm hoặc trạng thái bạn chọn."
        emptyAction={
          <div className="flex gap-2 justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setCreatorFilter('all');
              }}
            >
              Đặt lại bộ lọc
            </Button>
            <Link href="/rnd/recipes/new">
              <Button variant="gold" size="sm">
                + Tạo Mới Ngay
              </Button>
            </Link>
          </div>
        }
        pagination={{
          page,
          totalPages,
          total: totalItems,
          onPageChange: setPage,
        }}
      />

      {/* Version History Drawer */}
      <VersionHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => {
          setIsHistoryDrawerOpen(false);
          setSelectedRecipeForHistory(null);
        }}
        recipe={selectedRecipeForHistory}
        versions={drawerVersions}
        currentVersionId={selectedRecipeForHistory?.id}
      />
    </div>
  );
}

export default function RndRecipesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-zinc-400">
          Đang tải dữ liệu công thức...
        </div>
      }
    >
      <RecipeListContent />
    </Suspense>
  );
}
