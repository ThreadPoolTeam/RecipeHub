'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookOpen, Plus, Eye, Pencil, RotateCcw, Coffee } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion, RecipeStatus } from '@/lib/demo/types';
import { Button, TextInput, Select, SearchInput } from '@/components/workspace/fields';
import { StatusBadge } from '@/components/workspace/status-badge';
import { DataTable } from '@/components/workspace/data-table';

function RecipeListContent() {
  const { session, repo, dataVersion } = useDemo();
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get('status') as RecipeStatus | null;

  const [recipes, setRecipes] = useState<RecipeVersion[]>([]);
  const [loading, setLoading] = useState(true);

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

    repo
      .getRecipes(session, {
        page: 1,
        pageSize: 500, // Load all recipes for responsive client-side filtering and creator extraction
      })
      .then((res) => {
        if (!isMounted) return;
        setRecipes(res.items);
      })
      .catch(() => {})
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

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
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
  }, [recipes, searchQuery, statusFilter, creatorFilter]);

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
      render: (item: RecipeVersion) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#F5F0E8] border border-[#E8E2D9] flex items-center justify-center shrink-0 text-[#C9A84C]">
            <Coffee className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#F5F0E8] text-[#B47820] border border-[#E8E2D9]">
                {item.code}
              </span>
              <span className="text-[#8C887F] font-mono text-xs">[{item.versionLabel}]</span>
              <Link
                href={`/rnd/recipes/${item.id}`}
                className="font-semibold text-sm text-[#1A1917] hover:text-[#B47820] transition truncate"
              >
                {item.name}
              </Link>
            </div>
            {item.description && (
              <p className="text-xs text-[#706E68] mt-0.5 line-clamp-1 max-w-sm">{item.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Trạng thái',
      render: (item: RecipeVersion) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Định lượng & Quy trình',
      render: (item: RecipeVersion) => (
        <div className="text-xs text-[#706E68] space-y-0.5">
          <div>
            <span className="text-[#8C887F]">Nguyên liệu:</span>{' '}
            <span className="text-[#1A1917] font-medium">{item.ingredients.length}</span>
          </div>
          <div>
            <span className="text-[#8C887F]">SOP:</span>{' '}
            <span className="text-[#1A1917] font-medium">{item.steps.length} bước</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Người tạo',
      render: (item: RecipeVersion) => (
        <span className="text-xs text-[#706E68] font-mono" title={item.creatorEmail}>
          {item.creatorEmail.split('@')[0]}
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
        <div className="flex items-center justify-end gap-1.5">
          {item.status === 'Draft' && (
            <Link href={`/rnd/recipes/${item.id}/edit`}>
              <Button size="sm" variant="secondary">
                <Pencil className="w-3 h-3 mr-1" /> Sửa
              </Button>
            </Link>
          )}
          <Link href={`/rnd/recipes/${item.id}`}>
            <Button size="sm" variant="ghost">
              <Eye className="w-3.5 h-3.5 mr-1" /> Chi tiết
            </Button>
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
              { value: 'Draft', label: 'Bản Nháp (Draft)' },
              { value: 'PendingApproval', label: 'Chờ Duyệt (Pending)' },
              { value: 'Approved', label: 'Đã Duyệt (Approved)' },
              { value: 'Archived', label: 'Lưu Trữ (Archived)' },
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
