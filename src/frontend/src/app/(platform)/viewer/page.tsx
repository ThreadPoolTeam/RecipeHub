'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Search, Coffee, ArrowRight, Shield } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion } from '@/lib/demo/types';
import { TextInput, Alert, SearchInput } from '@/components/workspace/fields';
import { StatusBadge } from '@/components/workspace/status-badge';
export default function ViewerPage() {
  const { session, currentUser, repo, dataVersion } = useDemo();
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

    // repo.getRecipes automatically restricts viewer accounts to Approved recipes in currentUser.allowedRecipeIds
    repo
      .getRecipes(session, {
        query: searchQuery.trim(),
        pageSize: 100, // Show all granted recipes on dashboard
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Barista / Quầy Bar
            </span>
            <span className="text-xs text-[#706E68]">
              Được cấp quyền:{' '}
              <strong className="text-[#1A1917]">
                {currentUser?.allowedRecipeIds?.length || 0} công thức
              </strong>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1917] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#B47820]" /> Tra Cứu Quy Trình Pha Chế (SOP)
          </h1>
          <p className="text-xs sm:text-sm text-[#706E68] mt-0.5">
            Tra cứu nhanh thành phần, thao tác quầy bar và tài liệu kỹ thuật chuẩn.
          </p>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <Alert variant="error">
          <p className="text-sm">{errorMsg}</p>
        </Alert>
      )}

      {/* Search Input */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-3 shadow-xs">
        <div className="max-w-md">
          <SearchInput
            placeholder="Tìm theo mã công thức (REC-...) hoặc tên món..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            className="w-full"
          />
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-6 h-6 border-2 border-[#B47820] border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs text-[#706E68]">Đang tải danh sách công thức được cấp quyền...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E8E2D9] rounded-xl p-10 text-center max-w-xl mx-auto my-6 shadow-xs">
          <Coffee className="w-10 h-10 mx-auto mb-3 text-[#8C887F]" />
          <h3 className="text-sm font-semibold text-[#1A1917] mb-1">
            Không tìm thấy công thức khả dụng
          </h3>
          <p className="text-xs text-[#706E68] leading-relaxed max-w-md mx-auto">
            {searchQuery.trim()
              ? `Không tìm thấy công thức nào phù hợp với từ khóa "${searchQuery.trim()}".`
              : 'Chưa có công thức nào được cấp quyền xem cho tài khoản của bạn. Vui lòng liên hệ Quản trị viên để được phân quyền.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/viewer/recipes/${recipe.id}`}
              className="group block bg-white hover:bg-[#FAF9F5] border border-[#E8E2D9] hover:border-[#C9A84C] rounded-xl p-4 transition shadow-xs hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#F5F0E8] border border-[#E8E2D9] text-[#B47820]">
                  {recipe.code}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#F5F0E8] text-[#706E68] font-mono border border-[#E8E2D9]">
                    {recipe.versionLabel}
                  </span>
                  <StatusBadge status={recipe.status} />
                </div>
              </div>

              <h3 className="font-bold text-[#1A1917] group-hover:text-[#B47820] text-sm sm:text-base transition mb-1 line-clamp-1">
                {recipe.name}
              </h3>

              {recipe.description && (
                <p className="text-xs text-[#706E68] line-clamp-2 mb-3 leading-relaxed">
                  {recipe.description}
                </p>
              )}

              <div className="pt-2.5 border-t border-[#E8E2D9] grid grid-cols-3 gap-2 text-center text-xs text-[#706E68]">
                <div className="bg-[#FAF9F5] rounded p-1.5 border border-[#E8E2D9]">
                  <span className="block text-[10px] uppercase tracking-wider text-[#8C887F]">
                    Định lượng
                  </span>
                  <span className="font-semibold text-[#1A1917] line-clamp-1">
                    {recipe.targetYield} {recipe.yieldUnit}
                  </span>
                </div>
                <div className="bg-[#FAF9F5] rounded p-1.5 border border-[#E8E2D9]">
                  <span className="block text-[10px] uppercase tracking-wider text-[#8C887F]">
                    Nguyên liệu
                  </span>
                  <span className="font-semibold text-[#1A1917]">
                    {recipe.ingredients.length} loại
                  </span>
                </div>
                <div className="bg-[#FAF9F5] rounded p-1.5 border border-[#E8E2D9]">
                  <span className="block text-[10px] uppercase tracking-wider text-[#8C887F]">
                    Thao tác
                  </span>
                  <span className="font-semibold text-[#1A1917]">
                    {recipe.steps.length} bước
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-[#B47820] font-medium pt-1">
                <span>Xem chuẩn SOP</span>
                <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
