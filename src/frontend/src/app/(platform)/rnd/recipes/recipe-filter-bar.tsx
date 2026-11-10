'use client';

import { SearchInput, Select, type SelectOption } from '@/components/workspace/fields';
import type { RecipeStatus } from '@/lib/demo/types';

export type RecipeStatusFilter = RecipeStatus | 'all';

interface RecipeFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  statusFilter: RecipeStatusFilter;
  onStatusChange: (value: RecipeStatusFilter) => void;
  statusCounts: Record<RecipeStatusFilter, number>;
  creatorFilter: string;
  onCreatorChange: (value: string) => void;
  creatorOptions: SelectOption[];
}

const STATUS_OPTIONS: ReadonlyArray<{ value: RecipeStatusFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Draft', label: 'Bản nháp' },
  { value: 'Published', label: 'Đã phát hành' },
  { value: 'Archived', label: 'Lưu trữ' },
];

export function RecipeFilterBar({
  searchQuery,
  onSearchChange,
  onSearchClear,
  statusFilter,
  onStatusChange,
  statusCounts,
  creatorFilter,
  onCreatorChange,
  creatorOptions,
}: RecipeFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <SearchInput
        className="w-full lg:min-w-[260px] lg:flex-1"
        placeholder="Tìm theo mã hoặc tên công thức..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onClear={onSearchClear}
      />

      <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
        <div className="w-48 shrink-0">
          <Select
            aria-label="Lọc theo trạng thái"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as RecipeStatusFilter)}
            options={STATUS_OPTIONS.map((option) => ({
              value: option.value,
              label: `${option.label} ${statusCounts[option.value]}`,
            }))}
          />
        </div>

        <div className="w-48 shrink-0">
          <Select
            aria-label="Lọc theo người tạo"
            value={creatorFilter}
            onChange={(e) => onCreatorChange(e.target.value)}
            options={creatorOptions}
          />
        </div>
      </div>
    </div>
  );
}
