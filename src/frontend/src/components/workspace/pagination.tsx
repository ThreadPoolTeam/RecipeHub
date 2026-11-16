'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className = '' }: PaginationProps) {
  const count = Math.max(0, Math.floor(totalPages));
  const current = Math.min(Math.max(1, Math.floor(page)), count || 1);
  const pages = [...new Set([1, current - 1, current, current + 1, count])]
    .filter(number => number >= 1 && number <= count).sort((a, b) => a - b);
  const button = 'min-h-9 min-w-9 px-2 text-body-sm hover:text-primary disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <nav aria-label="Phân trang" className={`flex flex-wrap items-center ${className}`}>
      <button type="button" className={button} disabled={count === 0 || current <= 1} onClick={() => onPageChange(current - 1)}>Trước</button>
      {pages.map((number, index) => (
        <span key={number} className="contents">
          {index > 0 && number - pages[index - 1] > 1 && <span aria-hidden="true" className="px-1 text-muted-foreground">…</span>}
          <button type="button" className={`${button} ${number === current ? 'font-semibold text-primary' : 'text-foreground'}`}
            aria-label={`Trang ${number}`} aria-current={number === current ? 'page' : undefined}
            onClick={() => onPageChange(number)}>{number}</button>
        </span>
      ))}
      <button type="button" className={button} disabled={count === 0 || current >= count} onClick={() => onPageChange(current + 1)}>Tiếp</button>
    </nav>
  );
}
