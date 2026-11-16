'use client';

import React from 'react';
import { Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './fields';

interface DataTableProps<T> {
  columns: Array<{
    header: string;
    accessor?: keyof T;
    render?: (item: T, index: number) => React.ReactNode;
    className?: string;
  }>;
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (newPage: number) => void;
  };
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = 'Không có dữ liệu',
  emptyMessage = 'Chưa có bản ghi nào phù hợp với bộ lọc hiện tại.',
  emptyAction,
  pagination,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
        <div className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-primary motion-reduce:animate-none"></div>
        <p className="text-xs">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full space-y-2 rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
        <Inbox className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        <h4 className="font-display text-panel font-medium text-foreground">{emptyTitle}</h4>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{emptyMessage}</p>
        {emptyAction && <div className="pt-2">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-sm border-collapse min-w-[640px]">
          <thead>
            <tr className="h-14 border-b border-border bg-secondary text-xs font-medium text-muted-foreground">
              {columns.map((col, idx) => (
                <th key={idx} className={`px-4 font-medium ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item, rowIdx) => (
              <tr
                key={keyExtractor(item, rowIdx)}
                className="h-16 hover:bg-accent transition-colors motion-reduce:transition-none"
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={`px-4 py-3 text-foreground ${col.className || ''}`}>
                    {col.render
                      ? col.render(item, rowIdx)
                      : col.accessor
                      ? String(item[col.accessor] ?? '')
                      : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          <div>
            Tổng số: <strong className="text-foreground">{pagination.total}</strong> bản ghi | Trang{' '}
            <strong className="text-foreground">{pagination.page}</strong> /{' '}
            {pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} /> Trước
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Sau <ChevronRight className="w-3.5 h-3.5 ml-1" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
