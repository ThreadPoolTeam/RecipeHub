'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { quizManagement, formatVersionLabel, type RecipeChoice } from '@/lib/api/quiz-management';
import { ManagementFrame, Message, useManagementContext } from './management-shared';
import { ManagementRecipePicker } from './management-recipe-picker';
import { QuizCard } from './quiz-card';
import { Button, TextArea, TextInput } from '@/components/workspace/fields';
import { panelTitleClass } from '@/components/workspace/page-header';
import { useToast } from '@/components/workspace/toast';

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <li className={`flex items-center gap-2 text-sm ${done ? 'text-success' : 'text-muted-foreground'}`}>
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      {label}
    </li>
  );
}

export function ManagementCreate() {
  const { session, base } = useManagementContext();
  const { toast } = useToast();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState('80');
  const [recipeVersionId, setRecipeVersionId] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const score = Number(passingScore);
  const nameOk = title.trim().length > 0;
  const recipeOk = Boolean(recipeVersionId);
  const scoreOk = Number.isFinite(score) && score > 0 && score <= 100;
  const canSubmit = nameOk && recipeOk && scoreOk && code.trim().length > 0 && !busy;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session || busy) return;
    if (!recipeVersionId) { setError('Chọn phiên bản công thức đã ban hành.'); return; }
    setBusy(true);
    setError('');
    try {
      const created = await quizManagement.create(session.userId, {
        code: code.trim(),
        title: title.trim(),
        description: description.trim() || null,
        recipeVersionId,
        passingScore: score,
        questions: [],
      });
      toast({ type: 'success', title: 'Đã tạo bản nháp', description: created.code || code.trim() });
      router.push(`${base}/${created.quizId}?version=${created.version.versionNumber}`);
    } catch {
      toast({ type: 'error', title: 'Không thể tạo bộ đề', description: 'Vui lòng kiểm tra thông tin và thử lại.' });
      setBusy(false);
    }
  }

  return (
    <ManagementFrame
      eyebrow="Đào tạo"
      title="Tạo bộ đề mới"
      description="Điền thông tin chung, chọn công thức rồi chuyển sang soạn câu hỏi."
    >
      <Message error={error} />
      <form className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]" onSubmit={submit}>
        <div className="space-y-6">
          <fieldset className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-soft" disabled={busy}>
            <legend className={panelTitleClass}><span className="mr-3 text-primary">01</span>Thông tin chung</legend>
            <TextInput label="Tên bộ đề" required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Cà phê phin chuẩn nhập môn" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Mã bộ đề" required maxLength={50} value={code} onChange={(event) => setCode(event.target.value)} placeholder="VD: QZ-CAPHE-01" helper="Mã duy nhất, không đổi sau khi tạo." />
              <TextInput label="Điểm đạt (%)" required type="number" min="0.01" max="100" step="0.01" value={passingScore} onChange={(event) => setPassingScore(event.target.value)} />
            </div>
            <TextArea label="Mô tả" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mục tiêu và phạm vi kiến thức của bộ đề." />
          </fieldset>

          <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className={panelTitleClass}><span className="mr-3 text-primary">02</span>Công thức liên quan</h2>
              <p className="text-xs text-muted-foreground">Chỉ hiển thị công thức đã phát hành.</p>
            </div>
            {session && (
              <ManagementRecipePicker
                actor={session.userId}
                value={recipeVersionId}
                onChange={(versionId, choice) => { setRecipeVersionId(versionId); setSelectedRecipe(choice ?? null); }}
                disabled={busy}
              />
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
            <h2 className={panelTitleClass}><span className="mr-3 text-primary">03</span>Câu hỏi</h2>
            <div className="mt-4 rounded-lg border border-dashed border-border bg-secondary p-8 text-center">
              <p className="font-semibold text-foreground">Chưa có câu hỏi</p>
              <p className="mt-1 text-sm text-muted-foreground">Tạo bộ đề trước, sau đó soạn câu hỏi và đáp án ở màn kế tiếp.</p>
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <p className="text-pill font-medium uppercase tracking-[0.06em] text-muted-foreground">Xem trước thẻ bộ đề</p>
            <div className="mt-3">
              <QuizCard
                preview
                code={code}
                title={title}
                description={description}
                version={1}
                state="draft"
                recipeLabel={selectedRecipe ? `${selectedRecipe.name} · ${formatVersionLabel(selectedRecipe.versionNumber)}` : undefined}
                questionsCount={0}
                passingScore={scoreOk ? score : 0}
              />
            </div>
            <ul className="mt-4 space-y-2">
              <ChecklistItem done={nameOk} label="Có tên bộ đề" />
              <ChecklistItem done={recipeOk} label="Đã chọn công thức liên quan" />
              <ChecklistItem done={scoreOk} label="Điểm đạt hợp lệ" />
            </ul>
            <Button type="submit" variant="primary" className="mt-5 w-full" disabled={!canSubmit} isLoading={busy}>
              Tạo và soạn câu hỏi
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Cần có tên bộ đề, mã bộ đề và một công thức đã phát hành.</p>
          </div>
        </aside>

        <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
          <p className="text-xs text-muted-foreground">Bộ đề được tạo ở trạng thái bản nháp và chỉ hiển thị cho cửa hàng sau khi ban hành.</p>
          <Link
            href={base}
            className="inline-flex h-9 items-center rounded-md border border-input bg-card px-4 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Hủy bỏ
          </Link>
        </div>
      </form>
    </ManagementFrame>
  );
}
