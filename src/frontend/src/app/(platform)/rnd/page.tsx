'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FlaskConical, Plus, BookOpen, Image as ImageIcon, ArrowRight, Coffee } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion } from '@/lib/demo/types';
import { StatusBadge } from '@/components/workspace/status-badge';
import { StatCard } from '@/components/workspace/stat-card';
export default function RndDashboardPage() {
  const { session, repo, dataVersion } = useDemo();
  const [recipesCount, setRecipesCount] = useState<number>(0);
  const [ingredientsCount, setIngredientsCount] = useState<number>(0);
  const [mediaCount, setMediaCount] = useState<number>(0);
  const [draftRecipes, setDraftRecipes] = useState<RecipeVersion[]>([]);
  const [publishedRecipes, setPublishedRecipes] = useState<RecipeVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let isMounted = true;

    Promise.all([
      repo.getRecipes(session, { page: 1, pageSize: 100 }),
      repo.getIngredients(),
      repo.getMedia(),
    ])
      .then(([recipesRes, ings, media]) => {
        if (!isMounted) return;
        setRecipesCount(recipesRes.total);
        setIngredientsCount(ings.length);
        setMediaCount(media.length);

        const drafts = recipesRes.items
          .filter((r) => r.status === 'Draft')
          .slice(0, 5);
        setDraftRecipes(drafts);
        setPublishedRecipes(recipesRes.items.filter((r) => r.status === 'Published').slice(0, 5));
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session, repo, dataVersion]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-ink text-ink-foreground">
        <img src="/landing/workspaces/barista-sop.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="relative space-y-4 px-6 py-12 md:px-12 md:py-16">
          <p className="text-xs uppercase tracking-wide">Không gian nghiên cứu &amp; phát triển</p>
          <h1 className="font-display text-4xl font-medium md:text-6xl">Beverage Lab.</h1>
          <p className="text-sm">Quản lý công thức, nguyên liệu và SOP pha chế đồ uống.</p>
          <div className="flex flex-wrap gap-3 pt-4">
            <Link href="/rnd/recipes/new" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" strokeWidth={1.5} />Tạo công thức</Link>
            <Link href="/rnd/ingredients" className="rounded-md border border-ink-foreground px-4 py-2 text-sm font-semibold">Kho nguyên liệu</Link>
            <Link href="/rnd/media" className="rounded-md border border-ink-foreground px-4 py-2 text-sm font-semibold">Thư viện ảnh</Link>
          </div>
        </div>
      </section>
      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard label="Công thức đồ uống" value={loading ? '...' : recipesCount} icon={<BookOpen className="h-5 w-5" strokeWidth={1.5} />} hint="Phiên bản trong kho">
          <Link href="/rnd/recipes" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">Danh sách công thức <ArrowRight className="h-3 w-3" strokeWidth={1.5} /></Link>
        </StatCard>
        <StatCard label="Nguyên liệu" value={loading ? '...' : ingredientsCount} icon={<FlaskConical className="h-5 w-5" strokeWidth={1.5} />} hint="Mặt hàng khả dụng">
          <Link href="/rnd/ingredients" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">Danh mục nguyên liệu <ArrowRight className="h-3 w-3" strokeWidth={1.5} /></Link>
        </StatCard>
        <StatCard label="Tư liệu hình ảnh" value={loading ? '...' : mediaCount} icon={<ImageIcon className="h-5 w-5" strokeWidth={1.5} />} hint="Ảnh SOP &amp; concept">
          <Link href="/rnd/media" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">Kho ảnh &amp; AI illustration <ArrowRight className="h-3 w-3" strokeWidth={1.5} /></Link>
        </StatCard>
      </div>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-h3 font-medium text-foreground">Đang phát triển</h2>
            <p className="text-sm text-muted-foreground">Các công thức đang được soạn thảo và thử nghiệm.</p>
          </div>
          <Link href="/rnd/recipes?status=Draft" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Xem tất cả nháp <ArrowRight className="h-4 w-4" strokeWidth={1.5} /></Link>
        </div>
        {loading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">Đang tải danh sách bản nháp...</div>
        ) : draftRecipes.length === 0 ? (
          <div className="space-y-2 rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">
            <Coffee className="mx-auto h-8 w-8" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-foreground">Không có bản nháp nào đang dở dang</p>
            <p className="text-xs">Không còn công thức nháp đang xử lý.</p>
            <Link href="/rnd/recipes/new" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"><Plus className="h-4 w-4" strokeWidth={1.5} />Bắt đầu công thức mới</Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {draftRecipes.map((recipe) => (
              <article key={recipe.id} className="flex flex-col justify-between rounded-lg border border-border bg-card p-5 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{recipe.code} · {recipe.versionLabel}</p>
                    <h3 className="mt-1 font-display text-lg font-medium text-foreground">{recipe.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{recipe.description || 'Chưa có mô tả chi tiết cho công thức này.'}</p>
                  </div>
                  <StatusBadge status={recipe.status} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>{recipe.ingredients.length} nguyên liệu · {recipe.steps.length} bước · {new Date(recipe.updatedAt).toLocaleDateString('vi-VN')}</span>
                  <div className="flex gap-3 text-primary">
                    <Link href={`/rnd/recipes/${recipe.id}/edit`} className="font-semibold hover:underline">Sửa</Link>
                    <Link href={`/rnd/recipes/${recipe.id}`} className="font-semibold hover:underline">Chi tiết</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-h3 font-medium text-foreground">Đã phát hành</h2>
            <p className="text-sm text-muted-foreground">Công thức đã sẵn sàng sử dụng.</p>
          </div>
          <Link href="/rnd/recipes?status=Published" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Xem công thức đã phát hành <ArrowRight className="h-4 w-4" strokeWidth={1.5} /></Link>
        </div>
        {!loading && publishedRecipes.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">Chưa có công thức đã phát hành.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publishedRecipes.map((recipe) => (
              <Link key={recipe.id} href={`/rnd/recipes/${recipe.id}`} className="space-y-2 rounded-lg border border-border bg-card p-5 shadow-soft hover:border-primary">
                <p className="text-xs text-muted-foreground">{recipe.code} · {recipe.versionLabel}</p>
                <h3 className="font-display text-lg font-medium text-foreground">{recipe.name}</h3>
                {recipe.description && <p className="line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>}
                <StatusBadge status={recipe.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
