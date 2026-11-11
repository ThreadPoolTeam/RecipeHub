'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { quizManagement, type ManagementResult, type QuizSummary } from '@/lib/api/quiz-management';
import { Button } from '@/components/workspace/fields';
import { ManagementFrame, Message, Pagination, errorText, useManagementContext } from './management-shared';
import { QuizCard } from './quiz-card';
import { QuizFilterBar, type QuizStateFilter } from './quiz-filter-bar';
import { QuizStats } from './quiz-stats';
import { QUIZ_PAGE_SIZE, loadAllQuizzes, loadRecipeLabels, summarizeAttempts } from './quiz-catalog-data';

export function ManagementCatalog() {
  const { session, base } = useManagementContext();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<QuizStateFilter>('all');
  const [page, setPage] = useState(1);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [recipeLabels, setRecipeLabels] = useState<Map<string, string>>(new Map());
  const [results, setResults] = useState<ManagementResult[]>([]);
  const [attemptTotal, setAttemptTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const load = useCallback(async (signal: AbortSignal) => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const [quizList, labels, resultPage] = await Promise.all([
        loadAllQuizzes(session.userId, signal),
        loadRecipeLabels(session.userId, signal).catch(() => new Map<string, string>()),
        quizManagement.results(session.userId, { page: 1, pageSize: 100 }, signal),
      ]);
      if (signal.aborted) return;
      setQuizzes(quizList);
      setRecipeLabels(labels);
      setResults(resultPage.items);
      setAttemptTotal(resultPage.total);
    } catch (err: unknown) {
      if (!signal.aborted) setError(errorText(err));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session || session.role === 'viewer') return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void load(controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [session, load, retry]);

  const counts = useMemo<Record<QuizStateFilter, number>>(() => ({
    all: quizzes.length,
    published: quizzes.filter((quiz) => quiz.versions.some((version) => version.state === 'published')).length,
    draft: quizzes.filter((quiz) => quiz.versions.some((version) => version.state === 'draft')).length,
    archived: quizzes.filter((quiz) => quiz.versions.some((version) => version.state === 'archived')).length,
  }), [quizzes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      if (stateFilter !== 'all' && !quiz.versions.some((version) => version.state === stateFilter)) return false;
      return !term || quiz.code.toLowerCase().includes(term) || quiz.title.toLowerCase().includes(term);
    });
  }, [quizzes, search, stateFilter]);

  const paginated = useMemo(() => filtered.slice((page - 1) * QUIZ_PAGE_SIZE, page * QUIZ_PAGE_SIZE), [filtered, page]);
  const summary = useMemo(() => summarizeAttempts(results), [results]);

  return (
    <ManagementFrame
      eyebrow="Đào tạo"
      title="Bộ đề kiểm tra"
      description="Soạn bộ đề theo công thức, ban hành cho cửa hàng và theo dõi kết quả làm bài."
      actions={
        <Link href={`${base}/new`}>
          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1" strokeWidth={1.5} /> Tạo bộ đề
          </Button>
        </Link>
      }
    >
      <QuizStats published={counts.published} attempts={attemptTotal} passRate={summary.passRate} average={summary.average} />
      <QuizFilterBar
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        onSearchClear={() => { setSearch(''); setPage(1); }}
        stateFilter={stateFilter}
        onStateChange={(value) => { setStateFilter(value); setPage(1); }}
        counts={counts}
        resultsHref={`${base}/results`}
      />
      <Message error={error} />
      {error && <Button className="mb-4" onClick={() => setRetry((value) => value + 1)}>Thử lại</Button>}
      <div aria-busy={loading}>
        {loading ? (
          <div className="grid gap-6 motion-safe:animate-pulse md:grid-cols-2" role="status">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex gap-4 rounded-lg border border-border bg-card p-5">
                <div className="h-16 w-16 rounded-lg bg-muted" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-5 w-2/3 rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : paginated.length ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {paginated.map((quiz) => {
              const ordered = [...quiz.versions].sort((a, b) => b.versionNumber - a.versionNumber);
              const version = ordered.find((item) => stateFilter === 'all' || item.state === stateFilter) ?? ordered[0];
              if (!version) return null;
              const perQuiz = summarizeAttempts(results.filter((item) => item.quizId === quiz.quizId));
              return (
                <QuizCard
                  key={quiz.quizId}
                  code={quiz.code}
                  title={quiz.title}
                  description={quiz.description}
                  version={version.versionNumber}
                  state={version.state}
                  recipeLabel={recipeLabels.get(version.recipeVersionId)}
                  questionsCount={version.questionsCount}
                  passingScore={version.passingScore}
                  publishedAt={version.publishedAt}
                  passRate={perQuiz.passRate}
                  href={`${base}/${quiz.quizId}?version=${version.versionNumber}`}
                  actions={version.state === 'published' ? (
                    <Link
                      href={`${base}/results?quizId=${quiz.quizId}&version=${version.versionNumber}`}
                      className="inline-flex h-8 items-center rounded-md border border-input bg-card px-3 text-xs font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Kết quả
                    </Link>
                  ) : undefined}
                />
              );
            })}
          </div>
        ) : (
          !error && (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              <h2 className="font-display text-panel font-medium text-foreground">Chưa có bộ đề phù hợp</h2>
              <p className="mt-2">Thay bộ lọc hoặc tạo bộ đề đầu tiên từ công thức đã ban hành.</p>
            </div>
          )
        )}
      </div>
      {filtered.length > 0 && (
        <Pagination page={page} total={filtered.length} pageSize={QUIZ_PAGE_SIZE} onPage={setPage} disabled={loading} />
      )}
    </ManagementFrame>
  );
}
