'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Coffee, History, FileDown } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion, RecipeStatus } from '@/lib/demo/types';
import { Button, Select, SearchInput } from '@/components/workspace/fields';
import { StatusBadge } from '@/components/workspace/status-badge';
import { Pagination } from '@/components/workspace/pagination';
import { PageHeader } from '@/components/workspace/page-header';
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
  const [, setIsLoadingDrawerVersions] = useState(false);
  const router = useRouter();
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
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


  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Thư viện" title="Công thức đồ uống" description="Quản lý vòng đời công thức: Nháp, Chờ duyệt, Đã duyệt, Lưu trữ." actions={
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

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
              let coverUrl: string | null = null;
              if (item.primaryMediaAssetId) {
                coverUrl = mediaMap[item.primaryMediaAssetId] || null;
                if (!coverUrl && typeof window !== 'undefined') coverUrl = localStorage.getItem(`recipehub_media_url_${item.primaryMediaAssetId}`) || null;
              }
              if (!coverUrl) {
                const localDrafts = getStoredAiDrafts(item.versionId || item.id, 'final_product');
                if (localDrafts.length > 0) coverUrl = localDrafts[0].previewUrl;
              }
              const versions = recipeVersionsGroup[item.recipeId || item.code] || [item];
              const olderCount = Math.max(item.versionNumber ? item.versionNumber - 1 : 0, versions.length - 1);
              const vId = item.versionId || item.id;
              return (
                <article key={item.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
                  <div className="relative aspect-[4/3] bg-muted">
                    {coverUrl ? <img src={coverUrl} alt={item.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; const icon = e.currentTarget.parentElement?.querySelector('.fallback-coffee'); if (icon) (icon as HTMLElement).style.display = 'block'; }} /> : null}
                    <Coffee className={`fallback-coffee absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-muted-foreground ${coverUrl ? 'hidden' : 'block'}`} />
                    <input type="checkbox" aria-label={`Chọn ${item.name}`} checked={selectedRecipeIds.includes(vId)} onChange={() => setSelectedRecipeIds((prev) => prev.includes(vId) ? prev.filter((id) => id !== vId) : [...prev, vId])} className="absolute left-4 top-4 h-4 w-4 accent-primary" />
                  </div>
                  <div className="space-y-2 p-5">
                    <p className="text-xs text-muted-foreground">{item.code} · {item.versionLabel}</p>
                    <h2 className="font-display text-lg font-semibold"><Link href={`/rnd/recipes/${item.id}`} className="hover:text-primary">{item.name}</Link></h2>
                    <div className="flex flex-wrap items-center gap-2"><StatusBadge status={item.status} /><span className="text-xs text-muted-foreground">{item.creatorEmail ? item.creatorEmail.split('@')[0] : '—'} · {new Date(item.updatedAt).toLocaleDateString('vi-VN')}</span></div>
                    <p className="text-xs text-muted-foreground">{item.ingredients?.length || '—'} nguyên liệu · {item.steps?.length || '—'} bước</p>
                    {item.description && <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs font-semibold text-primary">
                      <button type="button" onClick={() => handleOpenHistoryDrawer(item)} className="inline-flex items-center gap-1 hover:underline"><History className="h-3 w-3" />Lịch sử phiên bản{olderCount > 0 ? ` (+${olderCount})` : ''}</button>
                      <Link href={`/rnd/recipes/${item.id}`} className="hover:underline">Xem</Link>
                      <Link href={`/rnd/recipes/${item.id}/edit`} className="hover:underline">Sửa</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          <p className="text-xs text-muted-foreground">Tổng cộng {totalItems} công thức</p>
        </>
      )}

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
