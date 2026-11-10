import { requestJson } from './client';

export type QuizState = 'draft' | 'published' | 'archived';
export interface QuizOption { id?: number | null; sortOrder: number; content: string; isCorrect: boolean }
export interface QuizQuestion { id?: number | null; sortOrder: number; content: string; explanation?: string | null; options: QuizOption[] }
export interface QuizVersionSummary { versionId: string; versionNumber: number; state: QuizState; recipeVersionId: string; passingScore: number; publishedAt: string | null; questionsCount: number }
export interface QuizSummary { quizId: string; code: string; title: string; description: string | null; createdByUserRef: string; latestVersionNumber: number; versions: QuizVersionSummary[] }
export interface QuizDetail { quizId: string; code: string; title: string; description: string | null; createdByUserRef: string; version: Omit<QuizVersionSummary, 'questionsCount'> & { questions: QuizQuestion[] } }
export interface QuizDraft { title: string; description: string | null; recipeVersionId: string; passingScore: number; questions: QuizQuestion[] }
export interface QuizPage<T> { items: T[]; total: number; page: number; pageSize: number }
export interface RecipeChoice { id: string; code: string; state: string; versionId: string; versionNumber: number; versionStatus: string; name: string }
export interface RecipeVersionInfo { code: string; name: string; versionNumber: number }
export interface RecipeVersionChoice { id: string; versionNumber: number; status: string; name: string }
export interface ManagementResult { attemptId: string; quizId: string; quizCode: string; quizTitle: string; versionNumber: number; userRef: string; state: string; score: number | null; isPassed: boolean | null; passingScore: number; startedAt: string; submittedAt: string | null }
export interface ManagementResultDetail extends Omit<ManagementResult, 'score' | 'isPassed'> { score: number; isPassed: boolean; answers: { questionId: number; content: string; explanation: string | null; selectedOptionId: number | null; correctOptionId: number | null; isCorrect: boolean; options: { id: number; sortOrder: number; content: string; isCorrect: boolean }[] }[] }
const root = 'api/v1/quiz/management';
async function call<T>(actor: string, path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  return await requestJson(path, actor, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal }) as T;
}
function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.toString();
}
export const quizManagement = {
  list: (actor: string, filters: { code?: string; title?: string; state?: string; page?: number; pageSize?: number } = {}, signal?: AbortSignal) => call<QuizPage<QuizSummary>>(actor, `${root}/quizzes?${query(filters)}`, 'GET', undefined, signal),
  detail: (actor: string, id: string, version: number, signal?: AbortSignal) => call<QuizDetail>(actor, `${root}/quizzes/${id}?version=${version}`, 'GET', undefined, signal),
  create: (actor: string, draft: QuizDraft & { code: string }) => call<QuizDetail>(actor, `${root}/quizzes`, 'POST', draft),
  save: (actor: string, id: string, version: number, draft: QuizDraft) => call<QuizDetail>(actor, `${root}/quizzes/${id}?version=${version}`, 'PATCH', draft),
  transition: (actor: string, id: string, version: number, state: 'published' | 'archived') => call<QuizDetail>(actor, `${root}/quizzes/${id}?version=${version}`, 'PATCH', { state }),
  clone: (actor: string, id: string, sourceVersion: number) => call<QuizDetail>(actor, `${root}/quizzes/${id}/clone`, 'POST', { sourceVersion }),
  deleteQuiz: (actor: string, id: string) => call<null>(actor, `${root}/quizzes/${id}`, 'DELETE'),
  deleteVersion: (actor: string, id: string, version: number) => call<null>(actor, `${root}/quizzes/${id}/questions?version=${version}`, 'DELETE'),
  recipes: (actor: string, search: string, page: number, signal?: AbortSignal) => call<{ items: RecipeChoice[]; totalCount: number }>(actor, `api/v1/recipes?${query({ query: search, state: 'active', versionStatus: 'published', page, pageSize: 12 })}`, 'GET', undefined, signal),
  recipeVersions: (actor: string, id: string, signal?: AbortSignal) => call<RecipeVersionChoice[]>(actor, `api/v1/recipes/${id}/versions`, 'GET', undefined, signal),
  allRecipes: (actor: string, page: number, signal?: AbortSignal) => call<{ items: RecipeChoice[]; totalCount: number }>(actor, `api/v1/recipes?${query({ page, pageSize: 100 })}`, 'GET', undefined, signal),
  results: (actor: string, filters: { quizId?: string; userRef?: string; version?: number; page?: number; pageSize?: number }, signal?: AbortSignal) => call<QuizPage<ManagementResult>>(actor, `${root}/results?${query(filters)}`, 'GET', undefined, signal),
  result: (actor: string, id: string, signal?: AbortSignal) => call<ManagementResultDetail>(actor, `${root}/results/${id}`, 'GET', undefined, signal),
};
const versionInfoCache = new Map<string, RecipeVersionInfo>();
export function formatVersionLabel(versionNumber: number) { return `v${versionNumber}.0`; }
export async function resolveRecipeVersion(actor: string, versionId: string, signal?: AbortSignal): Promise<RecipeVersionInfo | null> {
  const cached = versionInfoCache.get(versionId);
  if (cached) return cached;
  const recipes: RecipeChoice[] = [];
  for (let page = 1; ; page++) {
    const data = await quizManagement.allRecipes(actor, page, signal);
    recipes.push(...data.items);
    const hit = data.items.find(item => item.versionId === versionId);
    if (hit) return remember(versionId, { code: hit.code, name: hit.name, versionNumber: hit.versionNumber });
    if (!data.items.length || recipes.length >= data.totalCount) break;
  }
  for (let index = 0; index < recipes.length; index += 6) {
    const chunk = recipes.slice(index, index + 6);
    const found = await Promise.all(chunk.map(async recipe => {
      const versions = await quizManagement.recipeVersions(actor, recipe.id, signal).catch(() => [] as RecipeVersionChoice[]);
      const version = versions.find(item => item.id === versionId);
      return version ? { code: recipe.code, name: recipe.name, versionNumber: version.versionNumber } : null;
    }));
    const hit = found.find(item => item !== null);
    if (hit) return remember(versionId, hit);
  }
  return null;
}
function remember(versionId: string, info: RecipeVersionInfo) { versionInfoCache.set(versionId, info); return info; }
