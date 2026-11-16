'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/workspace/fields';
import { PageHeader } from '@/components/workspace/page-header';
import { AiDraftForm } from '@/components/recipes/ai-draft-form';
import { AiDraftProgress } from '@/components/recipes/ai-draft-progress';
import { AiDraftReview } from '@/components/recipes/ai-draft-review';
import { AiDraftCannotGenerateView } from '@/components/recipes/ai-draft-cannot-generate';
import { useAiDraftPolling } from '@/lib/ai-draft-polling';
import { createAiDraft, describeAiDraftError, type CreateAiDraftInput } from '@/lib/api/recipe-ai-draft';
import { useDemo } from '@/lib/demo/provider';

const MAX_OMIT = 5;
const EMPTY_INPUT: CreateAiDraftInput = { recipeName: '', description: null };

export default function AiRecipeDraftPage() {
  const { session } = useDemo();
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<CreateAiDraftInput>(EMPTY_INPUT);
  const [activeOmit, setActiveOmit] = useState<string[]>([]);
  const polling = useAiDraftPolling(session, jobId);
  const isCurrentJob = jobId !== null && polling.jobId === jobId;

  const showCannotGenerate =
    isCurrentJob &&
    polling.status === 'succeeded' &&
    polling.outcome === 'cannot_generate' &&
    polling.cannotGenerate;
  const phase = !jobId
    ? 'form'
    : !isCurrentJob
      ? 'polling'
      : polling.status === 'succeeded' && polling.outcome === 'generated' && polling.draft
        ? 'review'
        : showCannotGenerate
          ? 'cannot-generate'
          : 'polling';

  const resetToForm = () => {
    setJobId(null);
    setActiveOmit([]);
    setSubmitError(null);
  };

  const handleSubmit = async (input: CreateAiDraftInput, omitIngredients: string[] = []) => {
    if (!session) {
      setSubmitError('Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.');
      return;
    }
    setLastInput(input);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const createdJobId = await createAiDraft(session, { ...input, omitIngredients });
      setActiveOmit(omitIngredients);
      setJobId(createdJobId);
    } catch (error: unknown) {
      setSubmitError(describeAiDraftError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Trợ lý R&D"
        title="Tạo công thức bằng AI"
        description="Nhập tên món và mô tả mong muốn. AI chạy nền, sau đó bạn kiểm lại bản nháp và lưu bằng luồng tạo công thức hiện có."
        actions={
          <Link href="/rnd/recipes">
            <Button type="button" variant="secondary" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              Danh sách công thức
            </Button>
          </Link>
        }
      />

      {phase === 'form' && (
        <AiDraftForm
          submitting={submitting}
          error={submitError}
          initialRecipeName={lastInput.recipeName}
          initialDescription={lastInput.description ?? ''}
          onSubmit={(input) => {
            void handleSubmit(input);
          }}
          onDraftChange={setLastInput}
        />
      )}

      {phase === 'polling' && (
        <AiDraftProgress
          status={polling.status}
          elapsedSeconds={polling.elapsedSeconds}
          notice={polling.notice}
          errorMessage={polling.errorMessage}
          expired={polling.expired}
          onCancel={resetToForm}
          onRestart={resetToForm}
        />
      )}

      {phase === 'cannot-generate' && polling.cannotGenerate && (
        <AiDraftCannotGenerateView
          result={polling.cannotGenerate}
          retrying={submitting}
          retryError={submitError}
          onEditRequest={resetToForm}
          onRetry={() => {
            void handleSubmit(lastInput, activeOmit);
          }}
          onOmit={(ingredientName) => {
            const next = [...activeOmit.filter((name) => name !== ingredientName), ingredientName];
            void handleSubmit(lastInput, next.slice(-MAX_OMIT));
          }}
        />
      )}

      {phase === 'review' && polling.draft && (
        <AiDraftReview draft={polling.draft} onRestart={resetToForm} />
      )}
    </div>
  );
}
