'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Sparkles, Wand2 } from 'lucide-react';
import { Alert, Button, TextArea, TextInput } from '@/components/workspace/fields';
import { Dialog } from '@/components/workspace/dialog';
import { useDemo } from '@/lib/demo/provider';
import {
  describeDescriptionSuggestionError,
  suggestAiDraftDescription,
  type CreateAiDraftInput,
} from '@/lib/api/recipe-ai-draft';

const DESCRIPTION_MAX_LENGTH = 1000;
const DESCRIPTION_PLACEHOLDER =
  'Ví dụ: cà phê vị đắng, màu đen, ít ngọt. Nêu cảm giác vị, màu, kết cấu hoặc cách phục vụ nếu bạn muốn.';
const SUGGESTION_WARNING = 'Gợi ý chỉ là đoán từ tên món, hãy đọc và sửa trước khi tạo.';

export interface AiDraftFormProps {
  submitting: boolean;
  error: string | null;
  initialRecipeName: string;
  initialDescription: string;
  onSubmit: (input: CreateAiDraftInput) => void;
  onDraftChange: (input: CreateAiDraftInput) => void;
}

export function AiDraftForm({
  submitting,
  error,
  initialRecipeName,
  initialDescription,
  onSubmit,
  onDraftChange,
}: AiDraftFormProps) {
  const { session } = useDemo();
  const [recipeName, setRecipeName] = useState(initialRecipeName);
  const [description, setDescription] = useState(initialDescription);
  const [attempted, setAttempted] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState<string | null>(null);

  const trimmedName = recipeName.trim();
  const trimmedDescription = description.trim();
  const nameError = !trimmedName
    ? 'Nhập tên món để AI nhận diện đúng đồ uống.'
    : trimmedName.length > 120
      ? 'Tên món tối đa 120 ký tự.'
      : undefined;
  const descriptionError =
    description.length > DESCRIPTION_MAX_LENGTH
      ? `Mô tả tối đa ${DESCRIPTION_MAX_LENGTH} ký tự.`
      : undefined;
  const canSuggest = Boolean(session) && !nameError && !suggesting && !submitting;

  const notifyChange = (nextName: string, nextDescription: string) => {
    onDraftChange({
      recipeName: nextName.trim(),
      description: nextDescription.trim() ? nextDescription.trim() : null,
    });
  };

  const applyDescription = (value: string) => {
    setDescription(value);
    notifyChange(recipeName, value);
  };

  const handleNameChange = (value: string) => {
    setRecipeName(value);
    notifyChange(value, description);
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    notifyChange(recipeName, value);
  };

  const requestSuggestion = async () => {
    if (!session || !canSuggest) return;
    setSuggesting(true);
    setSuggestionError(null);
    try {
      const suggestion = await suggestAiDraftDescription(session, trimmedName);
      if (trimmedDescription) {
        setConfirmOverwrite(suggestion);
      } else {
        applyDescription(suggestion.slice(0, DESCRIPTION_MAX_LENGTH));
      }
    } catch (suggestionFailure: unknown) {
      setSuggestionError(describeDescriptionSuggestionError(suggestionFailure));
    } finally {
      setSuggesting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (nameError || descriptionError) return;
    onSubmit({ recipeName: trimmedName, description: trimmedDescription || null });
  };

  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <TextInput
          label="Tên món"
          required
          value={recipeName}
          maxLength={120}
          placeholder="Ví dụ: Cà phê muối kem béo"
          helper={`${recipeName.length}/120 ký tự. Nêu tên gọi R&D dùng trong thực đơn.`}
          error={attempted ? nameError : undefined}
          onChange={(event) => handleNameChange(event.target.value)}
          disabled={submitting}
        />

        <div className="space-y-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={requestSuggestion}
              disabled={!canSuggest}
              isLoading={suggesting}
            >
              <Wand2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              Gợi ý mô tả
            </Button>
          </div>
          <TextArea
            label="Mô tả"
            rows={4}
            value={description}
            maxLength={DESCRIPTION_MAX_LENGTH}
            placeholder={DESCRIPTION_PLACEHOLDER}
            helper={`${description.length}/${DESCRIPTION_MAX_LENGTH} ký tự. Không bắt buộc, nhưng mô tả càng rõ thì bản nháp càng sát ý.`}
            error={attempted ? descriptionError : undefined}
            onChange={(event) => handleDescriptionChange(event.target.value)}
            disabled={submitting}
          />
          <p className="text-body-sm text-muted-foreground">{SUGGESTION_WARNING}</p>
          {suggestionError && <Alert type="info" title="Chưa gợi ý được mô tả" message={suggestionError} />}
        </div>

        {error && <Alert type="error" title="Chưa tạo được bản nháp" message={error} />}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-body-sm text-muted-foreground">AI thường trả kết quả trong vòng 2 phút.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/rnd/recipes">
              <Button type="button" variant="secondary" disabled={submitting}>
                <ArrowLeft className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                Hủy
              </Button>
            </Link>
            <Button type="submit" variant="primary" isLoading={submitting}>
              <Sparkles className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              Tạo bản nháp bằng AI
            </Button>
          </div>
        </div>
      </form>

      {confirmOverwrite !== null && (
        <Dialog
          isOpen
          onClose={() => setConfirmOverwrite(null)}
          title="Ghi đè mô tả đang có?"
          description="Ô Mô tả hiện đã có nội dung. Gợi ý mới sẽ thay thế toàn bộ nội dung đó."
          confirmLabel="Ghi đè bằng gợi ý"
          cancelLabel="Giữ mô tả cũ"
          onConfirm={() => {
            applyDescription(confirmOverwrite.slice(0, DESCRIPTION_MAX_LENGTH));
            setConfirmOverwrite(null);
          }}
        >
          <p className="text-body text-foreground">{confirmOverwrite}</p>
          <p className="text-body-sm text-muted-foreground">{SUGGESTION_WARNING}</p>
        </Dialog>
      )}
    </section>
  );
}
