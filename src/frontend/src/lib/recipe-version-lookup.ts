import type { SessionInfo, RecipeVersion } from '@/lib/demo/types';

interface RecipeReader {
  getRecipes(actor: SessionInfo, filter?: { page?: number; pageSize?: number; status?: 'Published' }): Promise<{ items: RecipeVersion[]; totalPages: number }>;
  getRecipeVersions(actor: SessionInfo, recipeId: string): Promise<RecipeVersion[]>;
}

const cache = new Map<string, string>();

/**
 * Tìm mã công thức (recipeId) từ mã phiên bản công thức. Bài kiểm tra chỉ lưu mã phiên bản,
 * trong khi trang xem công thức đi theo mã công thức.
 */
export async function findRecipeIdByVersionId(repo: RecipeReader, actor: SessionInfo, versionId: string): Promise<string | null> {
  const cached = cache.get(versionId);
  if (cached) return cached;
  const recipes: RecipeVersion[] = [];
  for (let page = 1; ; page++) {
    const result = await repo.getRecipes(actor, { page, pageSize: 100, status: 'Published' });
    recipes.push(...result.items);
    const hit = result.items.find((item) => item.versionId === versionId);
    if (hit) { cache.set(versionId, hit.id); return hit.id; }
    if (page >= result.totalPages || !result.items.length) break;
  }
  for (let index = 0; index < recipes.length; index += 6) {
    const found = await Promise.all(recipes.slice(index, index + 6).map(async (recipe) => {
      const versions = await repo.getRecipeVersions(actor, recipe.id).catch(() => [] as RecipeVersion[]);
      return versions.some((version) => (version.versionId || version.id) === versionId) ? recipe.id : null;
    }));
    const hit = found.find((id) => id !== null);
    if (hit) { cache.set(versionId, hit); return hit; }
  }
  return null;
}
