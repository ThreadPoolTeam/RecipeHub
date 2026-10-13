'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FlaskConical,
  Plus,
  BookOpen,
  Image as ImageIcon,
  ArrowRight,
  FileText,
  Coffee,
} from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion } from '@/lib/demo/types';
import { Button } from '@/components/workspace/fields';
import { StatusBadge } from '@/components/workspace/status-badge';
export default function RndDashboardPage() {
  const { session, repo, dataVersion } = useDemo();
  const [recipesCount, setRecipesCount] = useState<number>(0);
  const [ingredientsCount, setIngredientsCount] = useState<number>(0);
  const [mediaCount, setMediaCount] = useState<number>(0);
  const [draftRecipes, setDraftRecipes] = useState<RecipeVersion[]>([]);
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
      {/* Top Header & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2DDD2] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1917] flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-[#B47820]" /> Trung Tâm R&amp;D
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-0.5">
            Quản lý công thức, nguyên liệu và SOP pha chế đồ uống.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/rnd/recipes/new">
            <Button variant="gold" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Tạo công thức
            </Button>
          </Link>
          <Link href="/rnd/ingredients">
            <Button variant="secondary" size="sm">
              <FlaskConical className="w-4 h-4 mr-1 text-[#78716C]" /> Kho nguyên liệu
            </Button>
          </Link>
          <Link href="/rnd/media">
            <Button variant="secondary" size="sm">
              <ImageIcon className="w-4 h-4 mr-1 text-[#78716C]" /> Thư viện ảnh
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2DDD2] rounded-lg p-5 hover:border-[#C5BFB1] transition shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">Tổng công thức</span>
            <BookOpen className="w-5 h-5 text-[#B47820]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#1C1917]">
              {loading ? '...' : recipesCount}
            </span>
            <span className="text-xs text-[#78716C]">phiên bản trong kho</span>
          </div>
          <div className="mt-3">
            <Link href="/rnd/recipes" className="text-xs text-[#B47820] hover:underline flex items-center gap-1 font-medium">
              Danh sách công thức <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white border border-[#E2DDD2] rounded-lg p-5 hover:border-[#C5BFB1] transition shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">Nguyên liệu</span>
            <FlaskConical className="w-5 h-5 text-[#B47820]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#1C1917]">
              {loading ? '...' : ingredientsCount}
            </span>
            <span className="text-xs text-[#78716C]">mặt hàng khả dụng</span>
          </div>
          <div className="mt-3">
            <Link href="/rnd/ingredients" className="text-xs text-[#B47820] hover:underline flex items-center gap-1 font-medium">
              Danh mục nguyên liệu <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white border border-[#E2DDD2] rounded-lg p-5 hover:border-[#C5BFB1] transition shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">Tư liệu Media</span>
            <ImageIcon className="w-5 h-5 text-[#B47820]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#1C1917]">
              {loading ? '...' : mediaCount}
            </span>
            <span className="text-xs text-[#78716C]">ảnh SOP &amp; concept</span>
          </div>
          <div className="mt-3">
            <Link href="/rnd/media" className="text-xs text-[#B47820] hover:underline flex items-center gap-1 font-medium">
              Kho ảnh &amp; AI illustration <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
      {/* Recent Drafts Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#B47820]" /> Bản nháp đang phát triển
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Các công thức đang thử nghiệm, chưa gửi phê duyệt.
            </p>
          </div>
          <Link href="/rnd/recipes?status=Draft">
            <Button variant="ghost" size="sm" className="text-xs text-[#78716C] hover:text-[#1C1917]">
              Xem tất cả nháp <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="w-full bg-white border border-[#E2DDD2] rounded-lg p-8 text-center text-[#78716C] text-sm">
            Đang tải danh sách bản nháp...
          </div>
        ) : draftRecipes.length === 0 ? (
          <div className="w-full bg-white border border-[#E2DDD2] rounded-lg p-10 text-center text-[#78716C] space-y-2">
            <Coffee className="w-8 h-8 text-[#A8A29E] mx-auto" />
            <p className="text-sm font-semibold text-[#1C1917]">Không có bản nháp nào đang dở dang</p>
            <p className="text-xs text-[#78716C]">Mọi công thức đều đã được gửi phê duyệt hoặc lưu trữ.</p>
            <div className="pt-2">
              <Link href="/rnd/recipes/new">
                <Button variant="gold" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Bắt đầu công thức mới
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {draftRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-white border border-[#E2DDD2] rounded-lg p-4 hover:border-[#C5BFB1] transition flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#F5F2EB] text-[#B47820] border border-[#E2DDD2]">
                      {recipe.code}
                    </span>
                    <StatusBadge status={recipe.status} />
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-[#1C1917] line-clamp-1">{recipe.name}</h3>
                  <p className="text-xs text-[#78716C] mt-1 line-clamp-2">
                    {recipe.description || 'Chưa có mô tả chi tiết cho công thức này.'}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#78716C] border-t border-[#EFECE4] pt-2.5">
                    <div>
                      <span className="text-[#A8A29E]">Bản:</span>{' '}
                      <span className="font-medium text-[#1C1917]">{recipe.versionLabel}</span>
                    </div>
                    <div>
                      <span className="text-[#A8A29E]">Nguyên liệu:</span>{' '}
                      <span className="font-medium text-[#1C1917]">{recipe.ingredients.length}</span>
                    </div>
                    <div>
                      <span className="text-[#A8A29E]">Bước:</span>{' '}
                      <span className="font-medium text-[#1C1917]">{recipe.steps.length}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#EFECE4] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#A8A29E]">
                    {new Date(recipe.updatedAt).toLocaleDateString('vi-VN')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Link href={`/rnd/recipes/${recipe.id}/edit`}>
                      <Button variant="secondary" size="sm">
                        Sửa
                      </Button>
                    </Link>
                    <Link href={`/rnd/recipes/${recipe.id}`}>
                      <Button variant="gold" size="sm">
                        Chi tiết
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
