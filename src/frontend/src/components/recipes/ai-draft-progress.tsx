'use client';

import Link from 'next/link';
import { ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';
import { Alert, Button } from '@/components/workspace/fields';
import { sectionTitleClass } from '@/components/workspace/page-header';
import type { AiDraftStatus } from '@/lib/api/recipe-ai-draft';

const POLL_TIMEOUT_SECONDS = 120;

export interface AiDraftProgressProps {
  status: AiDraftStatus;
  elapsedSeconds: number;
  notice: string | null;
  errorMessage: string | null;
  expired: boolean;
  onCancel: () => void;
  onRestart: () => void;
}

export function AiDraftProgress({
  status,
  elapsedSeconds,
  notice,
  errorMessage,
  expired,
  onCancel,
  onRestart,
}: AiDraftProgressProps) {
  if (status === 'failed') {
    return (
      <section className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-soft">
        <Alert
          type="error"
          title="Chưa tạo được bản nháp"
          message={errorMessage ?? 'AI chưa hoàn tất yêu cầu. Vui lòng thử lại.'}
        />
        {expired && (
          <p className="text-body-sm text-muted-foreground">
            Bản nháp tạm chỉ được lưu trong 30 phút. Bạn có thể tạo yêu cầu mới ngay bây giờ.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Link href="/rnd/recipes">
            <Button type="button" variant="secondary">
              <ArrowLeft className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              Danh sách công thức
            </Button>
          </Link>
          <Button type="button" variant="primary" onClick={onRestart}>
            <RefreshCw className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
            Tạo bản nháp mới
          </Button>
        </div>
      </section>
    );
  }

  const progress = Math.min(100, Math.max(4, Math.round((elapsedSeconds / POLL_TIMEOUT_SECONDS) * 100)));
  const statusText = status === 'pending'
    ? 'Yêu cầu đã vào hàng đợi xử lý.'
    : 'AI đang soạn nguyên liệu và các bước pha.';

  return (
    <section
      aria-busy="true"
      role="status"
      className="space-y-5 rounded-lg border border-border bg-card p-6 shadow-soft"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-info-soft text-info">
          <Sparkles className="h-5 w-5 motion-safe:animate-pulse" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className={sectionTitleClass}>Đang tạo bản nháp</h2>
          <p className="mt-1 text-body text-muted-foreground">{statusText}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div
          role="progressbar"
          aria-label="Tiến trình tạo bản nháp"
          aria-valuemin={0}
          aria-valuemax={POLL_TIMEOUT_SECONDS}
          aria-valuenow={Math.min(elapsedSeconds, POLL_TIMEOUT_SECONDS)}
          className="h-2 w-full overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-body-sm text-muted-foreground tabular-nums">
          Đã chờ {Math.min(elapsedSeconds, POLL_TIMEOUT_SECONDS)} giây trên tối đa {POLL_TIMEOUT_SECONDS} giây.
        </p>
      </div>

      <div className="space-y-3" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="space-y-2 rounded-lg border border-border bg-secondary p-4">
            <div className="h-4 w-2/5 rounded bg-card motion-safe:animate-pulse" />
            <div className="h-3 w-4/5 rounded bg-card motion-safe:animate-pulse" />
            <div className="h-3 w-3/5 rounded bg-card motion-safe:animate-pulse" />
          </div>
        ))}
      </div>

      {notice && <Alert type="info" title="Đang thử lại" message={notice} />}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-body-sm text-muted-foreground">
          Bạn có thể hủy chờ và tạo yêu cầu khác. Yêu cầu đang xử lý sẽ tự hết hạn sau 30 phút.
        </p>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Hủy chờ
        </Button>
      </div>
    </section>
  );
}
