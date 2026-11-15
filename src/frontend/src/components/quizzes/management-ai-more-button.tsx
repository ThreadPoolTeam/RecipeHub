'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { quizManagement } from '@/lib/api/quiz-management';
import { ApiError } from '@/lib/api/client';
import { Dialog } from '@/components/workspace/dialog';
import { Button } from '@/components/workspace/fields';

const MAX_TOTAL = 50;
const MIN_BATCH = 1;

export function ManagementAiMoreButton({
  actor,
  quizId,
  version,
  existingCount,
  dirty,
  activeJob,
  onAccepted,
}: {
  actor: string;
  quizId: string;
  version: number;
  existingCount: number;
  dirty: boolean;
  activeJob: boolean;
  onAccepted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const remaining = Math.max(0, MAX_TOTAL - existingCount);
  const blockedReason = activeJob
    ? 'Đang có tác vụ AI chạy cho đề này'
    : dirty
    ? 'Lưu thay đổi trước khi tạo thêm'
    : remaining <= 0
    ? 'Đề đã đủ 50 câu'
    : '';
  const disabled = Boolean(blockedReason);
  const maxBatch = Math.min(remaining, MAX_TOTAL);
  const batch = Math.min(Math.max(MIN_BATCH, count), Math.max(MIN_BATCH, maxBatch));

  async function submit() {
    if (busy || disabled) return;
    setBusy(true);
    setError('');
    try {
      await quizManagement.aiGenerateMore(actor, quizId, version, { questionCount: batch });
      setBusy(false);
      setOpen(false);
      onAccepted();
    } catch (err: unknown) {
      setBusy(false);
      setError(err instanceof ApiError && err.status === 409
        ? 'Bạn đang có một đề đang được AI soạn, vui lòng đợi hoàn tất.'
        : err instanceof ApiError && err.status === 400
        ? `Chỉ có thể thêm tối đa ${remaining} câu cho đề này.`
        : 'Không gửi được yêu cầu tạo thêm. Vui lòng thử lại.');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="primary"
        disabled={disabled || busy}
        aria-describedby={blockedReason ? 'ai-more-reason' : undefined}
        onClick={() => { setCount(Math.min(20, Math.max(MIN_BATCH, maxBatch))); setError(''); setOpen(true); }}
      >
        <Sparkles aria-hidden="true" size={15} strokeWidth={1.5} />
        Tạo thêm bằng AI
      </Button>
      <span className="text-xs tabular-nums text-muted-foreground">
        Đã có {existingCount} / {MAX_TOTAL} câu
      </span>
      {blockedReason && <span id="ai-more-reason" className="text-xs text-muted-foreground">{blockedReason}</span>}

      <Dialog
        isOpen={open}
        onClose={() => { if (!busy) setOpen(false); }}
        title="Tạo thêm bằng AI"
        description={`Đề sẽ nối thêm câu hỏi vào bản nháp. Còn tối đa ${remaining} câu cho đề này.`}
        onConfirm={submit}
        confirmLabel="Tạo thêm"
        cancelLabel="Hủy"
        confirmVariant="primary"
        isConfirming={busy}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-foreground" id="ai-more-count-label">Số câu hỏi cần thêm</p>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_BATCH}
              max={maxBatch}
              step={1}
              value={batch}
              disabled={busy}
              aria-labelledby="ai-more-count-label"
              onChange={(event) => {
                const next = Number(event.target.value) || MIN_BATCH;
                setCount(Math.min(maxBatch, Math.max(MIN_BATCH, next)));
              }}
              className="h-10 w-24 rounded-md border border-input bg-card px-3 text-center text-sm tabular-nums text-foreground shadow-inset outline-none focus:border-ring focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-muted-foreground">AI sẽ tránh lặp ý với các câu đã có trong đề.</p>
          </div>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        </div>
      </Dialog>
    </div>
  );
}
