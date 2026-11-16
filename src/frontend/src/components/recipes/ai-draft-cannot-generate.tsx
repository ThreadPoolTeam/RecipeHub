'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, PencilLine, Plus, Power, RefreshCw, Sparkles } from 'lucide-react';
import { Alert, Button } from '@/components/workspace/fields';
import { cardTitleClass, sectionTitleClass } from '@/components/workspace/page-header';
import { useToast } from '@/components/workspace/toast';
import { AiDraftCreateIngredientDialog } from '@/components/recipes/ai-draft-create-ingredient-dialog';
import { describeCannotGenerateCode, type AiDraftCannotGenerate } from '@/lib/api/recipe-ai-draft';
import type { Ingredient } from '@/lib/demo/types';
import { useDemo } from '@/lib/demo/provider';

export interface AiDraftCannotGenerateProps {
  result: AiDraftCannotGenerate;
  retrying: boolean;
  retryError: string | null;
  onEditRequest: () => void;
  onRetry: () => void;
  onOmit: (ingredientName: string) => void;
}

type RowState = 'activate' | 'create' | 'ready';

const ACTION_FAILED_MESSAGE =
  'Không đổi được trạng thái nguyên liệu. Thử ở tab Nguyên liệu hoặc nhờ Admin.';

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    const key = normalizeName(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

export function AiDraftCannotGenerateView({
  result,
  retrying,
  retryError,
  onEditRequest,
  onRetry,
  onOmit,
}: AiDraftCannotGenerateProps) {
  const { session, repo, currentUser, touch } = useDemo();
  const { toast } = useToast();
  const isRnd = currentUser?.role === 'rnd';

  const missingNames = useMemo(() => uniqueNames(result.missingIngredients), [result.missingIngredients]);
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(missingNames.length > 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creatingName, setCreatingName] = useState<string | null>(null);

  useEffect(() => {
    if (missingNames.length === 0) return;
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
  }, [repo, reloadKey, missingNames.length]);

  const rows = useMemo(() => {
    const byName = new Map<string, Ingredient[]>();
    for (const item of items) {
      const key = normalizeName(item.name);
      byName.set(key, [...(byName.get(key) ?? []), item]);
    }
    return missingNames.map((name) => {
      const matches = byName.get(normalizeName(name)) ?? [];
      const active = matches.find((item) => item.isActive);
      const inactive = matches.find((item) => !item.isActive);
      const state: RowState = active ? 'ready' : inactive ? 'activate' : 'create';
      return { name, state, inactive };
    });
  }, [items, missingNames]);

  const refresh = async (): Promise<Ingredient[]> => {
    const refreshed = await repo.getIngredients();
    setItems(refreshed);
    return refreshed;
  };

  const handleActivate = async (name: string, target: Ingredient) => {
    if (!session || !isRnd || pendingName !== null) return;
    setPendingName(name);
    setActionError(null);
    try {
      await repo.updateIngredient(session, target.id, { isActive: true });
      const refreshed = await refresh();
      const confirmed = refreshed.find((entry) => entry.id === target.id);
      if (!confirmed?.isActive) {
        setActionError(ACTION_FAILED_MESSAGE);
        return;
      }
      touch();
      toast({ type: 'success', title: 'Đã bật nguyên liệu', description: confirmed.name });
    } catch {
      setActionError(ACTION_FAILED_MESSAGE);
    } finally {
      setPendingName(null);
    }
  };

  const handleCreated = async (createdName: string) => {
    setCreatingName(null);
    setActionError(null);
    try {
      const refreshed = await refresh();
      const key = normalizeName(createdName);
      if (!refreshed.some((entry) => entry.isActive && normalizeName(entry.name) === key)) {
        setActionError('Chưa xác nhận được nguyên liệu mới trong kho. Vui lòng tải lại.');
        return;
      }
      toast({ type: 'success', title: 'Đã tạo nguyên liệu', description: createdName });
    } catch {
      setActionError('Đã tạo nhưng chưa tải lại được kho nguyên liệu. Vui lòng tải lại.');
    }
  };

  const hasRows = rows.length > 0;
  const allReady = hasRows && rows.every((row) => row.state === 'ready');
  const busy = pendingName !== null || retrying;

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

      {hasRows && (
        <div className="space-y-3 border-t border-border pt-5">
          <h3 className={cardTitleClass}>Nguyên liệu AI cần mà kho chưa dùng được</h3>

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

          {actionError && <Alert type="error" title="Chưa xử lý được nguyên liệu" message={actionError} />}

          <div className="overflow-hidden rounded-lg border border-border">
            {loading ? (
              <p className="px-4 py-6 text-body-sm text-muted-foreground">Đang đối chiếu kho nguyên liệu...</p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((row) => (
                  <li key={row.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <p className="min-w-0 text-body font-medium text-foreground">
                      {row.state === 'ready' && (
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={1.5} aria-hidden="true" />
                          {`"${row.name}" đã sẵn sàng trong kho`}
                        </span>
                      )}
                      {row.state === 'activate' && `Bật "${row.name}" không?`}
                      {row.state === 'create' && `Tạo "${row.name}" không?`}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {row.state === 'activate' && row.inactive && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={!isRnd || busy}
                          isLoading={pendingName === row.name}
                          onClick={() => {
                            if (row.inactive) void handleActivate(row.name, row.inactive);
                          }}
                        >
                          <Power className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                          Bật
                        </Button>
                      )}
                      {row.state === 'create' && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={!isRnd || busy}
                          onClick={() => setCreatingName(row.name)}
                        >
                          <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                          Tạo
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => onOmit(row.name)}
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                        {`Xem bản không có "${row.name}"`}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!isRnd && (
            <p className="text-body-sm text-muted-foreground">
              Chỉ chuyên viên R&D bật hoặc tạo được nguyên liệu.
            </p>
          )}
        </div>
      )}

      {retryError && <Alert type="error" title="Chưa gửi lại được yêu cầu" message={retryError} />}

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm text-muted-foreground">
          {!hasRows
            ? 'Hãy sửa yêu cầu rồi tạo lại.'
            : allReady
              ? 'Kho đã đủ nguyên liệu. Bấm Thử lại để AI chạy lại với danh mục mới.'
              : 'Bật hoặc tạo đủ nguyên liệu trên để mở nút Thử lại, hoặc xem bản không có nguyên liệu đó.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/rnd/recipes">
            <Button type="button" variant="secondary">
              <ArrowLeft className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              Danh sách công thức
            </Button>
          </Link>
          <Button type="button" variant="secondary" onClick={onEditRequest} disabled={retrying}>
            <PencilLine className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
            Sửa yêu cầu
          </Button>
          {hasRows && (
            <Button
              type="button"
              variant="primary"
              onClick={onRetry}
              disabled={!allReady || busy}
              isLoading={retrying}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              Thử lại
            </Button>
          )}
        </div>
      </div>

      {creatingName !== null && (
        <AiDraftCreateIngredientDialog
          defaultName={creatingName}
          onClose={() => setCreatingName(null)}
          onCreated={(name) => {
            void handleCreated(name);
          }}
        />
      )}
    </section>
  );
}
