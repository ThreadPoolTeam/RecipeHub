'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookOpen, Plus, Pencil, Coffee, Download, Eye } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { MediaAsset, RecipeVersion, RecipeStatus } from '@/lib/demo/types';
import { Button, Select, SearchInput, Alert } from '@/components/workspace/fields';
import { StatusBadge } from '@/components/workspace/status-badge';
import { DataTable } from '@/components/workspace/data-table';
import { Dialog } from '@/components/workspace/dialog';
import {
  downloadPdfBlob,
  generateRecipeBookPdf,
  getRecipePdfMediaIds,
  RecipePdfEntry,
} from '@/lib/demo/pdf-export';

interface RecipeBookPreview {
  blob: Blob;
  objectUrl: string;
  selectionKey: string;
}

function toggleSelection(selectedIds: string[], recipeId: string, checked: boolean): string[] {
  if (checked) return Array.from(new Set([...selectedIds, recipeId]));
  return selectedIds.filter((id) => id !== recipeId);
}

function selectionFingerprint(selectedIds: string[]): string {
  return selectedIds.slice().sort().join('|');
}

function RecipeListContent() {
  const { session, repo, dataVersion, touch } = useDemo();
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get('status') as RecipeStatus | null;

  const [recipes, setRecipes] = useState<RecipeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [bookPreview, setBookPreview] = useState<RecipeBookPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCreatingPreview, setIsCreatingPreview] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

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
        pageSize: 100, // Load up to 100 recipes for responsive client-side filtering
      })
      .then((res) => {
        if (!isMounted) return;
        setRecipes(res.items);
      })
      .catch((err) => {
        console.error('Failed to load recipes:', err);
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

  useEffect(() => {
    return () => {
      if (bookPreview) URL.revokeObjectURL(bookPreview.objectUrl);
    };
  }, [bookPreview]);

  const selectedKey = selectionFingerprint(selectedRecipeIds);
  const hasCurrentPreview = bookPreview?.selectionKey === selectedKey;
  const visibleRecipeIds = paginatedData.map((recipe) => recipe.id);
  const isCurrentPageSelected = visibleRecipeIds.length > 0
    && visibleRecipeIds.every((id) => selectedRecipeIds.includes(id));

  const handleToggleCurrentPage = (checked: boolean): void => {
    if (checked) {
      setSelectedRecipeIds((current) => Array.from(new Set([...current, ...visibleRecipeIds])));
      return;
    }
    const visibleIds = new Set(visibleRecipeIds);
    setSelectedRecipeIds((current) => current.filter((id) => !visibleIds.has(id)));
  };

  const handleCreateBookPreview = async (): Promise<void> => {
    if (!session) {
      setPdfError('Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại trước khi xuất PDF.');
      return;
    }
    if (selectedRecipeIds.length === 0) {
      setPdfError('Hãy chọn ít nhất một công thức để tạo PDF.');
      return;
    }

    touch();
    setIsCreatingPreview(true);
    setPdfError(null);
    try {
      const selectedSet = new Set(selectedRecipeIds);
      const selectedRecipes = recipes.filter((recipe) => selectedSet.has(recipe.id));
      if (selectedRecipes.length !== selectedRecipeIds.length) {
        throw new Error('Một số công thức đã chọn không còn trong danh sách. Hãy tải lại trang và chọn lại.');
      }
      const mediaRequests = new Map<string, Promise<MediaAsset | null>>();
      const getMedia = (mediaId: string): Promise<MediaAsset | null> => {
        const existing = mediaRequests.get(mediaId);
        if (existing) return existing;
        const request = repo.getMediaById(mediaId);
        mediaRequests.set(mediaId, request);
        return request;
      };
      const [ingredients, entries] = await Promise.all([
        repo.getIngredients(),
        Promise.all(selectedRecipes.map(async (summary): Promise<RecipePdfEntry> => {
          const recipe = await repo.getRecipeVersion(session, summary.id);
          const draft = await repo.getDocumentDraft(recipe.id);
          const assets = await Promise.all(getRecipePdfMediaIds(recipe, draft).map(getMedia));
          return {
            recipe,
            draft,
            mediaAssets: assets.filter((asset): asset is MediaAsset => asset !== null),
          };
        })),
      ]);
      const blob = await generateRecipeBookPdf(entries, ingredients);
      setBookPreview({ blob, objectUrl: URL.createObjectURL(blob), selectionKey: selectedKey });
      setIsPreviewOpen(true);
    } catch (error: unknown) {
      setPdfError(error instanceof Error ? error.message : 'Không thể tạo bản xem trước bộ công thức.');
    } finally {
      setIsCreatingPreview(false);
    }
  };

  const handleDownloadBook = (): void => {
    if (!bookPreview || !hasCurrentPreview) {
      setPdfError('Danh sách công thức đã thay đổi. Hãy tạo lại bản xem trước trước khi tải PDF.');
      setIsPreviewOpen(false);
      return;
    }
    touch();
    const date = new Date().toISOString().slice(0, 10);
    downloadPdfBlob(bookPreview.blob, `BO_CONG_THUC_RECIPEHUB_${date}.pdf`);
  };

  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={isCurrentPageSelected}
          onChange={(event) => handleToggleCurrentPage(event.target.checked)}
          aria-label="Chọn tất cả công thức trên trang hiện tại"
          data-testid="recipe-select-page"
          className="h-4 w-4 cursor-pointer accent-[#B47820]"
        />
      ),
      className: 'w-12 text-center',
      render: (item: RecipeVersion) => (
        <input
          type="checkbox"
          checked={selectedRecipeIds.includes(item.id)}
          onChange={(event) => setSelectedRecipeIds((current) => toggleSelection(current, item.id, event.target.checked))}
          aria-label={`Chọn công thức ${item.code}`}
          data-testid={`recipe-select-${item.id}`}
          className="h-4 w-4 cursor-pointer accent-[#B47820]"
        />
      ),
    },
    {
      header: 'Mã & Tên công thức',
      render: (item: RecipeVersion) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#F5F0E8] border border-[#E8E2D9] flex items-center justify-center shrink-0 text-[#C9A84C]">
            <Coffee className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/rnd/recipes/${item.id}`}
                className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#F5F0E8] text-[#B47820] border border-[#E8E2D9] hover:bg-[#EAE3D6] transition"
                title="Xem chi tiết công thức"
              >
                {item.code}
              </Link>
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
        <div className="flex items-center justify-end">
          <Link
            href={`/rnd/recipes/${item.id}/edit`}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#706E68] hover:text-[#B47820] hover:bg-[#F5F0E8] border border-transparent hover:border-[#E8E2D9] transition"
            title="Chỉnh sửa công thức"
            aria-label="Chỉnh sửa công thức"
          >
            <Pencil className="w-4 h-4" />
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

      {pdfError && <Alert variant="error" title="Không thể xuất PDF">{pdfError}</Alert>}

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
              { value: 'Published', label: 'Đã Phát Hành (Published)' },
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

      {selectedRecipeIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D7C49E] bg-[#FFF9EC] px-4 py-3 shadow-xs">
          <div className="text-sm text-[#4B3520]">
            Đã chọn <strong>{selectedRecipeIds.length}</strong> công thức. Mỗi công thức sẽ nằm trên một trang riêng.
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRecipeIds([])}
            >
              Bỏ chọn
            </Button>
            <Button
              variant="gold"
              size="sm"
              isLoading={isCreatingPreview}
              onClick={handleCreateBookPreview}
              data-testid="recipe-bulk-pdf-preview"
            >
              <Eye className="mr-1.5 h-4 w-4" /> Xem trước bộ PDF
            </Button>
          </div>
        </div>
      )}

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

      <Dialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={`Xem trước bộ công thức (${selectedRecipeIds.length} trang)`}
        description="Mỗi công thức nằm trọn trên một trang A4 ngang. Trang của công thức chưa phát hành có watermark bản nháp."
        size="wide"
        onConfirm={handleDownloadBook}
        confirmLabel="Tải bộ công thức PDF"
        confirmTestId="recipe-bulk-pdf-download"
      >
        {bookPreview && (
          <iframe
            src={bookPreview.objectUrl}
            title="Xem trước bộ công thức PDF"
            data-testid="recipe-bulk-pdf-preview-frame"
            className="h-[68vh] w-full rounded-lg border border-[#E8E2D9] bg-[#F5F0E8]"
          />
        )}
        <div className="mt-3 flex items-center gap-2 text-xs text-[#706E68]">
          <Download className="h-3.5 w-3.5" /> Kiểm tra đủ số trang và nội dung trước khi tải file.
        </div>
      </Dialog>
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
