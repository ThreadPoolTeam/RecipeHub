'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckSquare, Search, FileText } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion, RecipeStatus } from '@/lib/demo/types';
import { StatusBadge } from '@/components/workspace/status-badge';
import { DataTable } from '@/components/workspace/data-table';
import { TextInput, Button, SearchInput } from '@/components/workspace/fields';

export default function ApprovalsPage() {
  const router = useRouter();
  const { session, repo, loading, dataVersion } = useDemo();
  const [recipes, setRecipes] = useState<RecipeVersion[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | RecipeStatus>('PendingApproval');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Access guard
  useEffect(() => {
    if (loading) return;
    if (!session || !session.canApprove) {
      router.replace('/forbidden');
    }
  }, [session, loading, router]);

  useEffect(() => {
    if (!session || !session.canApprove) return;
    let isMounted = true;
    setIsLoading(true);

    repo
      .getRecipes(session)
      .then((res) => {
        if (!isMounted) return;
        setRecipes(res.items);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session, repo, dataVersion]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [recipes, statusFilter, searchQuery]);

  const pendingCount = recipes.filter((r) => r.status === 'PendingApproval').length;
  const approvedCount = recipes.filter((r) => r.status === 'Approved').length;

  if (loading || (!session?.canApprove && isLoading)) {
    return (
      <div className="p-12 text-center text-zinc-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
        <p className="mt-3 text-xs">Đang kiểm tra quyền phê duyệt...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E2D9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#B47820]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#1A1917]">
              Hàng Chờ Phê Duyệt R&amp;D
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              {pendingCount} hồ sơ chờ duyệt
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#706E68] mt-1">
            Thẩm định cảm quan sensory, định lượng nguyên liệu và tiêu chuẩn SOP trước khi phát hành chính thức.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('PendingApproval')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition active:scale-[0.98] ${
              statusFilter === 'PendingApproval'
                ? 'bg-[#1A1917] text-white font-semibold shadow-xs'
                : 'bg-white text-[#706E68] border border-[#E8E2D9] hover:bg-[#FAF9F5]'
            }`}
          >
            Chờ duyệt ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('Approved')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition active:scale-[0.98] ${
              statusFilter === 'Approved'
                ? 'bg-[#1A1917] text-white font-semibold shadow-xs'
                : 'bg-white text-[#706E68] border border-[#E8E2D9] hover:bg-[#FAF9F5]'
            }`}
          >
            Đã phê duyệt
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition active:scale-[0.98] ${
              statusFilter === 'all'
                ? 'bg-[#1A1917] text-white font-semibold shadow-xs'
                : 'bg-white text-[#706E68] border border-[#E8E2D9] hover:bg-[#FAF9F5]'
            }`}
          >
            Tất cả ({recipes.length})
          </button>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <SearchInput
            placeholder="Tìm theo mã hoặc tên công thức..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
          />
        </div>
      </div>

      {/* Approvals Table */}
      <DataTable
        isLoading={isLoading}
        data={filteredRecipes}
        keyExtractor={(item) => item.id}
        emptyTitle={
          statusFilter === 'PendingApproval'
            ? 'Không có công thức chờ duyệt'
            : 'Không tìm thấy bản ghi'
        }
        emptyMessage={
          statusFilter === 'PendingApproval'
            ? 'Hiện tại không có hồ sơ nào đang chờ thẩm định.'
            : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
        }
        columns={[
          {
            header: 'Mã Công Thức',
            render: (r) => (
              <span className="font-mono font-bold text-[#B47820] text-xs">
                {r.code}
              </span>
            ),
          },
          {
            header: 'Tên Đồ Uống',
            render: (r) => (
              <div className="space-y-0.5">
                <Link
                  href={`/approvals/${r.id}`}
                  className="font-bold text-[#1A1917] hover:text-[#B47820] transition"
                >
                  {r.name}
                </Link>
                <div className="text-[11px] text-[#706E68]">
                  {r.targetYield} {r.yieldUnit} • {r.ingredients.length} nguyên liệu •{' '}
                  {r.steps.length} bước SOP
                </div>
              </div>
            ),
          },
          {
            header: 'Phiên Bản',
            render: (r) => (
              <span className="px-2 py-0.5 rounded bg-[#F5F0E8] text-[#706E68] border border-[#E8E2D9] text-xs font-mono">
                {r.versionLabel}
              </span>
            ),
          },
          {
            header: 'Trạng Thái',
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            header: 'Tác Giả & Thời Điểm',
            render: (r) => {
              const isOwn = r.creatorEmail === session?.email;
              return (
                <div className="space-y-0.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#1A1917]">{r.creatorEmail}</span>
                    {isOwn && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F0E8] text-[#B47820] border border-[#E8E2D9]">
                        Của bạn
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#706E68]">
                    {r.submittedAt
                      ? new Date(r.submittedAt).toLocaleString('vi-VN')
                      : new Date(r.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              );
            },
          },
          {
            header: 'Thao Tác',
            className: 'text-right',
            render: (r) => (
              <Link href={`/approvals/${r.id}`}>
                <Button variant="gold" size="sm" className="text-xs">
                  Thẩm Định &rarr;
                </Button>
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
