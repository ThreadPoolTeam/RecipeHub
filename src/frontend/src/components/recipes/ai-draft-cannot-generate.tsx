'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, PencilLine, RefreshCw } from 'lucide-react';
import { Alert, Button, SearchInput, Select } from '@/components/workspace/fields';
import { Switch } from '@/components/workspace/switch';
import { cardTitleClass, sectionTitleClass } from '@/components/workspace/page-header';
import { useToast } from '@/components/workspace/toast';
import { describeCannotGenerateCode, type AiDraftCannotGenerate } from '@/lib/api/recipe-ai-draft';
import type { Ingredient } from '@/lib/demo/types';
import { useDemo } from '@/lib/demo/provider';

export interface AiDraftCannotGenerateProps {
  result: AiDraftCannotGenerate;
  retrying: boolean;
  retryError: string | null;
  onEditRequest: () => void;
  onRetry: () => void;
}

type StateFilter = 'all' | 'inactive' | 'active';

const STATE_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'inactive', label: 'Đang tắt' },
  { value: 'active', label: 'Đang bật' },
];

const TOGGLE_FAILED_MESSAGE =
  'Không đổi được trạng thái. Thử ở tab Nguyên liệu hoặc nhờ Admin.';

export function AiDraftCannotGenerateView({
  result,
  retrying,
  retryError,
  onEditRequest,
  onRetry,
}: AiDraftCannotGenerateProps) {
  const { session, repo, currentUser, touch } = useDemo();
  const { toast } = useToast();
  const isRnd = currentUser?.role === 'rnd';

  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    repo
      .getIngredients()
      .then((list) => {
        if (cancelled) return;
        setItems(list);
        setLoadError(null);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Không tải được kho nguyên liệu. Vui lòng thử lại.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repo, reloadKey]);

  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (stateFilter === 'active' && !item.isActive) return false;
      if (stateFilter === 'inactive' && item.isActive) return false;
      if (!keyword) return true;
      return (
        item.name.toLowerCase().includes(keyword) ||
        item.group.toLowerCase().includes(keyword)
      );
    });
    return [...filtered].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? 1 : -1;
      return a.name.localeCompare(b.name, 'vi');
    });
  }, [items, search, stateFilter]);

  const handleToggle = async (item: Ingredient) => {
    if (!session || !isRnd || pendingId !== null) return;
    const nextActive = !item.isActive;
    setPendingId(item.id);
    setToggleError(null);
    try {
      await repo.updateIngredient(session, item.id, { isActive: nextActive });
      const refreshed = await repo.getIngredients();
      const confirmed = refreshed.find((entry) => entry.id === item.id);
      if (!confirmed || confirmed.isActive !== nextActive) {
        setToggleError(TOGGLE_FAILED_MESSAGE);
        return;
      }
      setItems(refreshed);
      touch();
      if (nextActive) setActivated(true);
      toast({
        type: 'success',
        title: nextActive ? 'Đã bật nguyên liệu' : 'Đã tắt nguyên liệu',
        description: confirmed.name,
      });
    } catch {
      setToggleError(TOGGLE_FAILED_MESSAGE);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section
      aria-labelledby="ai-draft-cannot-generate-title"
      className="space-y-5 rounded-lg border border-border bg-card p-6 shadow-soft"
    >
      <div>
        <h2 id="ai-draft-cannot-generate-title" className={sectionTitleClass}>
          AI chưa tạo được công thức này
        </h2>
        <p className="mt-2 text-body text-muted-foreground">
          {describeCannotGenerateCode(result.errorCode)}
        </p>
      </div>

      {result.missingRequirements.length > 0 && (
        <div className="space-y-2">
          <h3 className={cardTitleClass}>Phần còn thiếu</h3>
          <ul className="list-disc space-y-1 pl-5 text-body text-foreground">
            {result.missingRequirements.map((requirement, index) => (
              <li key={`${requirement}-${index}`}>{requirement}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-body-sm text-muted-foreground">
        AI không tự thay nguyên liệu. Bạn bật nguyên liệu đang ngừng dùng rồi bấm Thử lại để AI chạy lại
        với danh mục mới.
      </p>

      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
            placeholder="Tìm theo tên hoặc nhóm"
            className="w-full sm:w-72"
          />
          <Select
            aria-label="Lọc trạng thái nguyên liệu"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value as StateFilter)}
            options={STATE_FILTER_OPTIONS}
            className="w-full sm:w-44"
          />
        </div>

        {loadError && (
          <div className="space-y-2">
            <Alert type="error" title="Chưa tải được kho nguyên liệu" message={loadError} />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLoading(true);
                  setReloadKey((current) => current + 1);
                }}
              >
                Tải lại
              </Button>
            </div>
          </div>
        )}

        {toggleError && <Alert type="error" title="Chưa đổi được trạng thái" message={toggleError} />}

        <div className="overflow-hidden rounded-lg border border-border">
          {loading ? (
            <p className="px-4 py-6 text-body-sm text-muted-foreground">Đang tải kho nguyên liệu...</p>
          ) : visibleItems.length === 0 ? (
            <p className="px-4 py-6 text-body-sm text-muted-foreground">
              Không có nguyên liệu nào khớp bộ lọc hiện tại.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visibleItems.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="text-body font-medium text-foreground">{item.name}</p>
                    <p className="text-body-sm text-muted-foreground">
                      {item.group || 'Chưa phân nhóm'}
                      {item.isActive ? '' : ' · Đang ngừng sử dụng'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm text-muted-foreground">
                      {item.isActive ? 'Đang dùng' : 'Đang tắt'}
                    </span>
                    <Switch
                      checked={item.isActive}
                      disabled={!isRnd || pendingId !== null}
                      onChange={() => {
                        void handleToggle(item);
                      }}
                      aria-label={`${item.isActive ? 'Tắt' : 'Bật'} ${item.name}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!isRnd && (
          <p className="text-body-sm text-muted-foreground">
            Chỉ chuyên viên R&D đổi được trạng thái nguyên liệu.
          </p>
        )}

        <p className="text-body-sm text-muted-foreground">
          Không thấy nguyên liệu cần dùng? Thêm ở tab Nguyên liệu &amp; Tư liệu rồi quay lại bấm Thử lại.
        </p>
      </div>

      {retryError && <Alert type="error" title="Chưa gửi lại được yêu cầu" message={retryError} />}

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm text-muted-foreground">
          {activated
            ? 'Kho đã được cập nhật. Bấm Thử lại để AI chạy lại với danh mục mới.'
            : 'Bật một nguyên liệu đang tắt để mở nút Thử lại.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/rnd/recipes">
            <Button type="button" variant="secondary">
              <ArrowLeft className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              Danh sách công thức
            </Button>
          </Link>
          <Button type="button" variant="secondary" onClick={onEditRequest}>
            <PencilLine className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
            Sửa yêu cầu
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onRetry}
            disabled={!activated || retrying}
            isLoading={retrying}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
            Thử lại
          </Button>
        </div>
      </div>
    </section>
  );
}
