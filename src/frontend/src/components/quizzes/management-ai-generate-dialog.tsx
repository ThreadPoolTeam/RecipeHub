'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Sparkles } from 'lucide-react';
import { quizManagement } from '@/lib/api/quiz-management';
import { ApiError } from '@/lib/api/client';
import { Dialog } from '@/components/workspace/dialog';
import { Button } from '@/components/workspace/fields';
import { ManagementRecipePicker } from './management-recipe-picker';
import { useManagementContext } from './management-shared';

const MIN = 1;
const MAX = 50;
const DEFAULT = 20;

export function ManagementAiGenerateDialog({
  open,
  onClose,
  onAccepted,
}: {
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
}) {
  const { session } = useManagementContext();
  const [recipeVersionId, setRecipeVersionId] = useState('');
  const [count, setCount] = useState(DEFAULT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const clamp = (value: number) => Math.min(MAX, Math.max(MIN, value));

  function reset() {
    setRecipeVersionId('');
    setCount(DEFAULT);
    setError('');
    setBusy(false);
  }

  function close() {
    if (busy) return;
    reset();
    onClose();
  }

  async function submit() {
    if (!session || busy) return;
    if (!recipeVersionId) {
      setError('Chọn công thức đã ban hành để AI soạn đề.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await quizManagement.aiGenerate(session.userId, { recipeVersionId, questionCount: count });
      reset();
      onAccepted();
      onClose();
    } catch (err: unknown) {
      setBusy(false);
      setError(err instanceof ApiError && err.status === 409
        ? 'Bạn đang có một đề đang được AI soạn, vui lòng đợi hoàn tất.'
        : 'Không gửi được yêu cầu tạo đề. Vui lòng kiểm tra lại và thử.');
    }
  }

  return (
    <Dialog
      isOpen={open}
      onClose={close}
      title="Tạo đề bằng AI"
      description="AI soạn một đề nháp từ công thức bạn chọn. Bạn xem và sửa trước khi ban hành."
      onConfirm={submit}
      confirmLabel="Tạo đề"
      cancelLabel="Hủy"
      confirmVariant="primary"
      isConfirming={busy}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-foreground">Công thức</p>
          {session && (
            <ManagementRecipePicker
              actor={session.userId}
              value={recipeVersionId}
              onChange={(value) => { setRecipeVersionId(value); setError(''); }}
              disabled={busy}
            />
          )}
          <p className="mt-2 text-xs text-muted-foreground">Chỉ hiện công thức đã ban hành. Mỗi đề gắn với một công thức.</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-foreground" id="ai-count-label">Số câu hỏi</p>
          <div className="flex flex-wrap items-center gap-3" role="group" aria-labelledby="ai-count-label">
            <Button
              type="button"
              aria-label="Giảm số câu"
              disabled={busy || count <= MIN}
              onClick={() => setCount(value => clamp(value - 1))}
            >
              <Minus aria-hidden="true" size={16} strokeWidth={1.5} />
            </Button>
            <input
              type="number"
              inputMode="numeric"
              min={MIN}
              max={MAX}
              step={1}
              value={count}
              disabled={busy}
              aria-labelledby="ai-count-label"
              onChange={(event) => setCount(clamp(Number(event.target.value) || MIN))}
              className="h-10 w-20 rounded-md border border-input bg-card px-3 text-center text-sm tabular-nums text-foreground shadow-inset outline-none focus:border-ring focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <Button
              type="button"
              aria-label="Tăng số câu"
              disabled={busy || count >= MAX}
              onClick={() => setCount(value => clamp(value + 1))}
            >
              <Plus aria-hidden="true" size={16} strokeWidth={1.5} />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">từ {MIN} đến {MAX} câu</span>
          </div>
        </div>

        <p className="rounded-lg bg-info-soft p-3 text-xs text-info">
          Đề tối đa {MAX} câu. Sau khi tạo, bạn có thể tạo thêm cho đến khi đủ {MAX} câu.
        </p>

        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

        <p className="text-xs text-muted-foreground">
          Muốn tự nhập câu hỏi? <Link href="/rnd/quizzes/new" className="font-semibold text-primary underline-offset-2 hover:underline">Tự soạn đề mới</Link>.
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles aria-hidden="true" className="h-3 w-3" strokeWidth={1.5} />
          AI chỉ tạo bản nháp, bạn vẫn cần kiểm tra nội dung trước khi ban hành.
        </p>
      </div>
    </Dialog>
  );
}
