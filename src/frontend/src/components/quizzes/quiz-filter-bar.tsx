'use client';

import Link from 'next/link';
import { SearchInput } from '@/components/workspace/fields';
import type { QuizState } from '@/lib/api/quiz-management';

export type QuizStateFilter = QuizState | 'all';

interface QuizFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  stateFilter: QuizStateFilter;
  onStateChange: (value: QuizStateFilter) => void;
  counts: Record<QuizStateFilter, number>;
  resultsHref: string;
}

const STATE_OPTIONS: ReadonlyArray<{ value: QuizStateFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'published', label: 'Đã ban hành' },
  { value: 'draft', label: 'Bản nháp' },
  { value: 'archived', label: 'Lưu trữ' },
];

export function QuizFilterBar({ search, onSearchChange, onSearchClear, stateFilter, onStateChange, counts, resultsHref }: QuizFilterBarProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
      <SearchInput
        className="w-full lg:min-w-[240px] lg:flex-1"
        placeholder="Tìm theo tên hoặc mã bộ đề..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        onClear={onSearchClear}
      />
      <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
        <div role="group" aria-label="Lọc theo trạng thái bộ đề" className="flex min-w-0 overflow-x-auto rounded-md border border-border bg-card shadow-control">
          {STATE_OPTIONS.map((option, index) => {
            const isActive = stateFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onStateChange(option.value)}
                className={`shrink-0 px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${index > 0 ? 'border-l border-border' : ''} ${isActive ? 'bg-primary text-primary-foreground hover:brightness-90' : 'bg-card text-foreground hover:bg-accent'}`}
              >
                {option.label}
                <span className={`ml-1.5 text-xs font-normal ${isActive ? '' : 'text-muted-foreground'}`}>{counts[option.value]}</span>
              </button>
            );
          })}
        </div>
        <Link
          href={resultsHref}
          className="inline-flex h-9 shrink-0 items-center rounded-md border border-input bg-card px-4 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Kết quả làm bài
        </Link>
      </div>
    </div>
  );
}
