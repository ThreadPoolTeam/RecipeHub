'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, FileDown } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion, RecipeStatus } from '@/lib/demo/types';
import { Button } from '@/components/workspace/fields';
import { Pagination } from '@/components/workspace/pagination';
import { PageHeader } from '@/components/workspace/page-header';
import { getStoredAiDrafts } from '@/lib/ai-draft-storage';
import { RecipeFilterBar, type RecipeStatusFilter } from './recipe-filter-bar';
import { RecipeCard } from './recipe-card';

function RecipeListContent() {
  const { session, repo, dataVersion } = useDemo();
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get('status') as RecipeStatus | null;

  const [recipes, setRecipes] = useState<RecipeVersion[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecipeStatusFilter>(
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

  // Status counts for the segmented filter
  const statusCounts = useMemo(() => {
    const counts: Record<RecipeStatusFilter, number> = {
      all: distinctRecipes.length,
      Draft: 0,
      Published: 0,
      Archived: 0,
    };
    distinctRecipes.forEach((recipe) => {
      counts[recipe.status] += 1;
    });
    return counts;
  }, [distinctRecipes]);

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

  const resolveCoverUrl = (item: RecipeVersion) => {
    let coverUrl: string | null = null;
    if (item.primaryMediaAssetId) {
      coverUrl = mediaMap[item.primaryMediaAssetId] || null;
      if (!coverUrl && typeof window !== 'undefined') coverUrl = localStorage.getItem(`recipehub_media_url_${item.primaryMediaAssetId}`) || null;
    }
    if (!coverUrl) {
      const localDrafts = getStoredAiDrafts(item.versionId || item.id, 'final_product');
      if (localDrafts.length > 0) coverUrl = localDrafts[0].previewUrl;
    }
    return coverUrl;
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Thư viện" title="Công thức đồ uống" description="Tìm công thức và xem các phiên bản đang có." actions={
        <div className="flex flex-wrap items-center gap-2">
          {selectedRecipeIds.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (selectedRecipeIds.length === 1) {
                  const match = recipes.find(
                    (r) => (r.versionId || r.id) === selectedRecipeIds[0]
                  );
                  if (match) {
                    router.push(
                      `/rnd/documents/new?recipeId=${match.recipeId || match.id}&versionId=${selectedRecipeIds[0]}`
                    );
                    return;
                  }
                }
                router.push(`/rnd/documents/new?recipes=${selectedRecipeIds.join(',')}`);
              }}
              title="Chuyển sang không gian xuất bản tài liệu PDF"
            >
              <FileDown className="w-4 h-4 mr-1" /> Xuất PDF bộ ({selectedRecipeIds.length})
            </Button>
          )}
          <Link href="/rnd/recipes/new">
            <Button variant="gold" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Tạo công thức mới
            </Button>
          </Link>
        </div>
      } />

      <RecipeFilterBar
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setPage(1);
        }}
        onSearchClear={() => {
          setSearchQuery('');
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        statusCounts={statusCounts}
        creatorFilter={creatorFilter}
        onCreatorChange={(value) => {
          setCreatorFilter(value);
          setPage(1);
        }}
        creatorOptions={creatorOptions}
      />

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">Đang tải dữ liệu công thức...</div>
      ) : paginatedData.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-8 text-center">
          <p className="font-semibold">Không tìm thấy công thức</p>
          <p className="text-sm text-muted-foreground">Không có công thức nào khớp với các tiêu chí tìm kiếm hoặc trạng thái bạn chọn.</p>
          <div className="flex justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setCreatorFilter('all'); }}>Đặt lại bộ lọc</Button>
            <Link href="/rnd/recipes/new" className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">+ Tạo Mới Ngay</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedData.map((item) => {
              const vId = item.versionId || item.id;
              return (
                <RecipeCard
                  key={item.id}
                  item={item}
                  coverUrl={resolveCoverUrl(item)}
                  selectionId={vId}
                  selected={selectedRecipeIds.includes(vId)}
                  onToggleSelected={(selectionId) => setSelectedRecipeIds((prev) => prev.includes(selectionId) ? prev.filter((id) => id !== selectionId) : [...prev, selectionId])}
                />
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          <p className="text-xs text-muted-foreground">Tổng cộng {totalItems} công thức</p>
        </>
      )}
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
