'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Coffee } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion } from '@/lib/demo/types';
import { Alert, SearchInput } from '@/components/workspace/fields';
import { StatusBadge } from '@/components/workspace/status-badge';
export default function ViewerPage() {
  const { session, repo, dataVersion } = useDemo();
  const [recipes, setRecipes] = useState<RecipeVersion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    if (!session) {
      setLoading(false);
      return;
    }

    repo
      .getRecipes(session, {
        query: searchQuery.trim(),
        pageSize: 100,
      })
      .then((result) => {
        if (!isMounted) return;
        setRecipes(result.items);
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMsg(err.message || 'Không thể tải danh sách công thức');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session, repo, dataVersion, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <header className="rounded-lg border border-border bg-card p-6 shadow-soft sm:p-10">
        <p className="text-xs font-medium uppercase tracking-wider text-primary">Sổ tay cửa hàng</p>
        <h1 className="mt-3 font-display text-h2 font-medium text-foreground sm:text-h1">
          {session?.fullName ? `Hôm nay pha gì, ${session.fullName}?` : 'Hôm nay pha gì?'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Tra cứu công thức và quy trình pha chế đã phát hành.</p>
        <p className="mt-2 text-xs text-muted-foreground">Công thức khả dụng: <strong className="tabular-nums text-foreground">{recipes.length}</strong></p>
        <div className="mt-6 max-w-xl">
          <SearchInput
            aria-label="Tìm theo tên hoặc mã công thức"
            placeholder="Tìm theo tên hoặc mã công thức"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            className="w-full [&_input]:h-11"
          />
        </div>
      </header>

      {errorMsg && <Alert variant="error"><p className="text-sm">{errorMsg}</p></Alert>}

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground" role="status">
          Đang tải danh sách công thức đã phát hành...
        </div>
      ) : recipes.length === 0 ? (
        <div className="mx-auto max-w-xl rounded-lg border border-dashed border-border bg-card p-10 text-center shadow-soft">
          <Coffee className="mx-auto mb-3 h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
          <h2 className="font-display text-panel font-medium text-foreground">Không tìm thấy công thức khả dụng</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery.trim()
              ? `Không tìm thấy công thức nào phù hợp với từ khóa "${searchQuery.trim()}".`
              : 'Hiện chưa có công thức nào được phát hành trong hệ thống.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/viewer/recipes/${recipe.id}`}
              className="group block rounded-lg border border-border bg-card p-5 shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{recipe.code} · {recipe.versionLabel}</span>
                <StatusBadge status={recipe.status} />
              </div>
              <h2 className="mt-3 font-display text-card-title font-medium text-foreground group-hover:text-primary">{recipe.name}</h2>
              {recipe.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>}
              <p className="mt-4 text-xs text-muted-foreground">
                {recipe.ingredients.length} nguyên liệu · {recipe.steps.length} bước
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Định lượng: {recipe.targetYield !== null && recipe.yieldUnit
                  ? `${recipe.targetYield} ${recipe.yieldUnit}` : 'Chưa thiết lập'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
