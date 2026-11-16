'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDemo } from '@/lib/demo/provider';
import type { RecipeVersion } from '@/lib/demo/types';
import type { GroupedRecipe } from './pdf-document-workspace';

const PAGE_SIZE = 10;
const INITIAL_PAGES = 2;
const SEARCH_DEBOUNCE_MS = 300;

interface InitialItem { recipeId: string; recipeVersionId: string }

function buildGroup(
  recipeId: string,
  meta: { code: string; name: string; creatorEmail?: string },
  allVersions: RecipeVersion[],
  initial: InitialItem[],
): GroupedRecipe | null {
  const published = allVersions
    .filter((v) => v.status === 'Published')
    .sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
  if (!published.length) return null;
  const initMatch = initial.find(
    (init) => init.recipeId === recipeId || published.some((v) => (v.versionId || v.id) === init.recipeVersionId),
  );
  const preferred = initMatch
    ? published.find((v) => (v.versionId || v.id) === initMatch.recipeVersionId) ?? published[0]
    : published[0];
  return {
    recipeId,
    recipeCode: meta.code,
    recipeName: meta.name,
    creatorEmail: meta.creatorEmail,
    versions: published,
    selectedVersionId: preferred.versionId || preferred.id,
  };
}

/**
 * Danh mục công thức đã phát hành cho trình xuất PDF.
 * Tìm kiếm chạy ở server; cuộn tới cuối danh sách thì tải thêm 10 món (lần đầu 20 món).
 */
export function usePublishedRecipeCatalog(initialItems: InitialItem[]) {
  const { session, repo } = useDemo();
  const [recipes, setRecipes] = useState<GroupedRecipe[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const nextPageRef = useRef(1);
  const busyRef = useRef(false);
  const generationRef = useRef(0);
  const initialRef = useRef(initialItems);
  initialRef.current = initialItems;

  const fetchPages = useCallback(async (pages: number, search: string, generation: number) => {
    if (!session) return;
    for (let i = 0; i < pages; i++) {
      const page = nextPageRef.current;
      const result = await repo.getRecipes(session, { page, pageSize: PAGE_SIZE, query: search, status: 'Published' });
      if (generation !== generationRef.current) return;
      const groups = (await Promise.all(result.items.map(async (r) => {
        try {
          const versions = await repo.getRecipeVersions(session, r.id);
          return buildGroup(r.id, { code: r.code, name: r.name, creatorEmail: r.creatorEmail }, versions, initialRef.current);
        } catch { return null; }
      }))).filter((g): g is GroupedRecipe => g !== null);
      if (generation !== generationRef.current) return;
      setRecipes((prev) => {
        const seen = new Set(prev.map((g) => g.recipeId));
        return [...prev, ...groups.filter((g) => !seen.has(g.recipeId))];
      });
      setTotal(result.total);
      nextPageRef.current = page + 1;
      const more = page < result.totalPages;
      setHasMore(more);
      if (!more) return;
    }
  }, [session, repo]);

  // Nạp lại từ đầu khi đổi từ khóa (debounce) hoặc phiên đăng nhập.
  useEffect(() => {
    if (!session) return;
    const generation = ++generationRef.current;
    const timer = window.setTimeout(async () => {
      nextPageRef.current = 1;
      busyRef.current = true;
      setLoading(true);
      setError(null);
      setRecipes([]);
      try {
        await fetchPages(INITIAL_PAGES, query.trim(), generation);
        // Món được chọn sẵn qua URL có thể nằm ngoài 20 món đầu: nạp riêng để vẫn chọn được.
        if (generation === generationRef.current && !query.trim() && initialRef.current.length) {
          const pinned = await Promise.all(initialRef.current.map(async (init) => {
            try {
              const versions = await repo.getRecipeVersions(session, init.recipeId);
              const first = versions[0];
              return first ? buildGroup(init.recipeId, { code: first.code, name: first.name, creatorEmail: first.creatorEmail }, versions, initialRef.current) : null;
            } catch { return null; }
          }));
          if (generation === generationRef.current) {
            setRecipes((prev) => {
              const seen = new Set(prev.map((g) => g.recipeId));
              return [...prev, ...pinned.filter((g): g is GroupedRecipe => g !== null && !seen.has(g.recipeId))];
            });
          }
        }
      } catch (err) {
        if (generation === generationRef.current) setError(err instanceof Error ? err.message : 'Không thể nạp danh mục công thức');
      } finally {
        if (generation === generationRef.current) { setLoading(false); busyRef.current = false; }
      }
    }, query ? SEARCH_DEBOUNCE_MS : 0);
    return () => window.clearTimeout(timer);
  }, [session, repo, query, fetchPages]);

  const loadMore = useCallback(async () => {
    if (busyRef.current || !hasMore) return;
    busyRef.current = true;
    setLoadingMore(true);
    const generation = generationRef.current;
    try {
      await fetchPages(1, query.trim(), generation);
    } catch (err) {
      if (generation === generationRef.current) setError(err instanceof Error ? err.message : 'Không thể tải thêm công thức');
    } finally {
      if (generation === generationRef.current) setLoadingMore(false);
      busyRef.current = false;
    }
  }, [fetchPages, hasMore, query]);

  return { recipes, setRecipes, query, setQuery, loading, loadingMore, hasMore, total, error, loadMore };
}
