'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import type { QuizState } from '@/lib/api/quiz-management';
import { cardActionClass, interactiveCardClass, stretchedLinkClass } from '@/components/workspace/interactive-card';
import { cardTitleClass } from '@/components/workspace/page-header';

interface QuizCardProps {
  code: string;
  title: string;
  description?: string | null;
  version: number;
  state: QuizState;
  recipeLabel?: string;
  questionsCount: number;
  passingScore: number;
  publishedAt?: string | null;
  passRate?: number;
  href?: string;
  actions?: ReactNode;
  preview?: boolean;
}

const STATE_BADGE: Record<QuizState, { label: string; className: string }> = {
  draft: { label: 'Bản nháp', className: 'bg-info-soft text-info' },
  published: { label: 'Đã ban hành', className: 'bg-success-soft text-success' },
  archived: { label: 'Lưu trữ', className: 'bg-secondary text-muted-foreground' },
};

const QUESTION_TINT: Record<QuizState, string> = {
  draft: 'bg-secondary text-foreground',
  published: 'bg-success-soft text-success',
  archived: 'bg-muted text-muted-foreground',
};

function formatPublished(value: string | null | undefined, state: QuizState) {
  if (!value) return state === 'published' ? 'Đã ban hành' : 'Chưa ban hành';
  return `Ban hành ${new Date(value).toLocaleDateString('vi-VN')}`;
}

export function QuizCard({
  code,
  title,
  description,
  version,
  state,
  recipeLabel,
  questionsCount,
  passingScore,
  publishedAt,
  passRate,
  href,
  actions,
  preview = false,
}: QuizCardProps) {
  const badge = STATE_BADGE[state];
  const showLink = Boolean(href) && !preview;
  return (
    <article className={preview ? 'relative rounded-lg border border-border bg-card p-5 shadow-soft' : `p-5 ${interactiveCardClass}`}>
      <div className="flex min-w-0 items-start gap-4">
        <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg sm:h-[72px] sm:w-[72px] ${QUESTION_TINT[state]}`}>
          <span className="font-display text-stat font-normal leading-none tabular-nums">{questionsCount}</span>
          <span className="mt-1 text-pill">câu</span>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{code || 'QZ-???'} · Phiên bản {version}</p>
            <span className={`inline-flex rounded-md px-2.5 py-1 text-pill font-medium ${badge.className}`}>{badge.label}</span>
          </div>
          <h3 className={cardTitleClass}>
            {showLink ? (
              <Link href={href!} className={stretchedLinkClass}>{title}</Link>
            ) : title ? (
              title
            ) : (
              <span className="text-muted-foreground">Tên bộ đề sẽ hiện ở đây</span>
            )}
          </h3>
          {description && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
          {recipeLabel && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BookOpen size={14} strokeWidth={1.5} aria-hidden="true" />
              Công thức: {recipeLabel}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>Đạt từ {passingScore}%</span>
            {passRate !== undefined && (
              <span className="flex min-w-[140px] flex-1 items-center gap-2">
                <span className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-secondary">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, passRate))}%` }} />
                </span>
                <span className="shrink-0 tabular-nums">{passRate}% lượt đạt</span>
              </span>
            )}
          </div>
        </div>
      </div>
      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>{formatPublished(publishedAt, state)}</span>
        {actions && <div className={`flex flex-wrap items-center gap-2 ${cardActionClass}`}>{actions}</div>}
      </footer>
    </article>
  );
}
