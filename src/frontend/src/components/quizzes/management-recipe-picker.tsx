'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { formatVersionLabel, quizManagement, resolveRecipeVersion, type RecipeChoice } from '@/lib/api/quiz-management';
import { errorText, Message } from './management-shared';
import { Button, SearchInput } from '@/components/workspace/fields';
import { cardTitleClass } from '@/components/workspace/page-header';

interface ManagementRecipePickerProps {
  actor: string;
  value: string;
  onChange: (value: string, choice?: RecipeChoice) => void;
  disabled?: boolean;
}

export function ManagementRecipePicker({ actor, value, onChange, disabled }: ManagementRecipePickerProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [choices, setChoices] = useState<RecipeChoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [external, setExternal] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    if (disabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      quizManagement
        .recipes(actor, search.trim(), page, controller.signal)
        .then((data) => {
          setChoices((current) => (page === 1 ? data.items : [...current, ...data.items.filter((item) => !current.some((old) => old.id === item.id))]));
          setTotal(data.totalCount);
        })
        .catch((err: unknown) => {
          if (!controller.signal.aborted) setError(errorText(err));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [actor, search, page, disabled, retry]);

  const sentinelRef = useRef<HTMLLIElement | null>(null);
  const hasMore = choices.length < total;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading || error) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setPage((current) => current + 1);
    }, { rootMargin: '80px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, error, choices.length]);

  const selected = choices.find((item) => item.versionId === value);

  useEffect(() => {
    if (!value || selected) return;
    const controller = new AbortController();
    resolveRecipeVersion(actor, value, controller.signal)
      .then((info) => { if (info) setExternal({ id: value, label: `${info.code} · ${info.name} · ${formatVersionLabel(info.versionNumber)}` }); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [actor, value, selected]);

  const selectedLabel = selected
    ? `${selected.code} · ${selected.name} · ${formatVersionLabel(selected.versionNumber)}`
    : external?.id === value ? external.label : '';

  return (
    <div className="space-y-3" aria-busy={loading}>
      <SearchInput
        placeholder="Tìm công thức đã ban hành theo tên hoặc mã..."
        value={search}
        onChange={(event) => { setSearch(event.target.value); setPage(1); setChoices([]); setTotal(0); }}
        onClear={() => { setSearch(''); setPage(1); setChoices([]); setTotal(0); }}
        aria-label="Tìm công thức đã ban hành"
      />
      {selectedLabel && (
        <p className="text-xs text-muted-foreground">
          Đang chọn: <strong className="text-foreground">{selectedLabel}</strong>
        </p>
      )}
      {loading && choices.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-secondary p-6 text-center text-sm text-muted-foreground" role="status">Đang tải công thức...</p>
      ) : choices.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-secondary p-6 text-center text-sm text-muted-foreground">
          Không có công thức đã ban hành phù hợp. Hãy phát hành công thức trước khi tạo bộ đề.
        </p>
      ) : (
        <ul role="radiogroup" aria-label="Chọn công thức liên kết" className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {choices.map((item) => {
            const active = item.versionId === value;
            return (
              <li key={item.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-ring ${active ? 'border-primary bg-primary-soft' : 'border-border bg-card hover:bg-accent'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <input
                    type="radio"
                    name="quiz-recipe"
                    className="sr-only"
                    checked={active}
                    disabled={disabled}
                    onChange={() => onChange(item.versionId, item)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-muted-foreground">{item.code} · {formatVersionLabel(item.versionNumber)}</span>
                    <span className={`block ${cardTitleClass} truncate text-base`}>{item.name}</span>
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />}
                </label>
              </li>
            );
          })}
          {hasMore && (
            <li ref={sentinelRef} className="py-2 text-center text-xs text-muted-foreground" role="status">Đang tải thêm công thức...</li>
          )}
        </ul>
      )}
      <Message error={error} />
      {error && <Button type="button" onClick={() => setRetry((current) => current + 1)}>Thử lại tải công thức</Button>}
    </div>
  );
}
