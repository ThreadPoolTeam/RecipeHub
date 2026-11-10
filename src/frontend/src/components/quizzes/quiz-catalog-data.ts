import { quizManagement, type ManagementResult, type QuizSummary } from '@/lib/api/quiz-management';

export const QUIZ_PAGE_SIZE = 12;

export async function loadAllQuizzes(actor: string, signal: AbortSignal) {
  const items: QuizSummary[] = [];
  for (let page = 1; ; page += 1) {
    const data = await quizManagement.list(actor, { page, pageSize: 100 }, signal);
    items.push(...data.items);
    if (!data.items.length || items.length >= data.total) return items;
  }
}

export async function loadRecipeLabels(actor: string, signal: AbortSignal) {
  const labels = new Map<string, string>();
  for (let page = 1; ; page += 1) {
    const data = await quizManagement.allRecipes(actor, page, signal);
    data.items.forEach((item) => labels.set(item.versionId, `${item.name} · v${item.versionNumber}`));
    if (!data.items.length || page * 100 >= data.totalCount) return labels;
  }
}

export function summarizeAttempts(items: ManagementResult[]) {
  const submitted = items.filter((item) => item.submittedAt && item.score !== null);
  if (!submitted.length) return { passRate: undefined as number | undefined, average: undefined as number | undefined };
  const passed = submitted.filter((item) => item.isPassed || (item.score ?? 0) >= item.passingScore).length;
  const average = submitted.reduce((sum, item) => sum + (item.score ?? 0), 0) / submitted.length;
  return { passRate: Math.round((passed / submitted.length) * 100), average: Math.round(average) };
}
