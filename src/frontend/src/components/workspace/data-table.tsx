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
      <div className="w-full bg-white border border-[#E8E2D9] rounded-lg p-12 text-center text-[#706E68]">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#B47820] mb-2"></div>
        <p className="text-xs">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full bg-white border border-[#E8E2D9] rounded-lg p-12 text-center text-[#706E68] space-y-2">
        <Inbox className="w-8 h-8 text-[#8C887F] mx-auto" />
        <h4 className="text-sm font-semibold text-[#1A1917]">{emptyTitle}</h4>
        <p className="text-xs text-[#706E68] max-w-sm mx-auto">{emptyMessage}</p>
        {emptyAction && <div className="pt-2">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-[#E8E2D9] rounded-lg overflow-hidden flex flex-col shadow-xs">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-sm border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-[#F5F0E8] border-b border-[#E8E2D9] text-[#706E68] text-xs uppercase tracking-wider font-semibold">
              {columns.map((col, idx) => (
                <th key={idx} className={`px-4 py-2.5 font-semibold ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E2D9]">
            {data.map((item, rowIdx) => (
              <tr
                key={keyExtractor(item, rowIdx)}
                className="hover:bg-[#FAF9F5] transition-colors"
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={`px-4 py-2.5 text-[#1A1917] ${col.className || ''}`}>
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
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#E8E2D9] text-xs text-[#706E68] bg-[#F5F0E8]">
          <div>
            Tổng số: <strong className="text-[#1A1917]">{pagination.total}</strong> bản ghi | Trang{' '}
            <strong className="text-[#1A1917]">{pagination.page}</strong> /{' '}
            {pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Trước
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Sau <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
