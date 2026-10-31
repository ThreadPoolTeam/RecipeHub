import { requestJson } from './client';

export interface ViewerQuiz {
  quizId: string;
  code: string;
  title: string;
  description: string | null;
  versionNumber: number;
  recipeVersionId: string;
  recipeTitle: string;
  passingScore: number;
  questionsCount: number;
}

export interface ViewerOption { id: number; sortOrder: number; content: string }
export interface ViewerQuestion { id: number; sortOrder: number; content: string; options: ViewerOption[] }
export interface ViewerQuizPreview extends ViewerQuiz { questions: ViewerQuestion[] }
export interface ViewerAnswer { questionId: number; selectedOptionId: number | null }
export interface ViewerAttemptStart {
  attemptId: string;
  quizId: string;
  versionNumber: number;
  state: 'in_progress' | 'submitted';
  startedAt: string;
}
export interface ViewerAttempt extends ViewerAttemptStart {
  questions: ViewerQuestion[];
  savedAnswers: ViewerAnswer[];
}
export interface ViewerAnswerResult {
  questionId: number;
  content: string;
  explanation: string | null;
  selectedOptionId: number | null;
  correctOptionId: number | null;
  isCorrect: boolean;
  options: (ViewerOption & { isCorrect: boolean })[];
}
export interface ViewerAttemptResult extends ViewerAttemptStart {
  score: number;
  isPassed: boolean;
  passingScore: number;
  submittedAt: string | null;
  answers: ViewerAnswerResult[];
}
export interface ViewerPage<T> { items: T[]; total: number; page: number; pageSize: number }

const root = 'api/v1/quiz';
function get<T>(path: string, actorId: string, signal?: AbortSignal): Promise<T> {
  return requestJson(`${root}/${path}`, actorId, { method: 'GET', signal }) as Promise<T>;
}

export const quizViewerApi = {
  catalog: (actorId: string, page = 1, signal?: AbortSignal) =>
    get<ViewerPage<ViewerQuiz>>(`quizzes?page=${page}&pageSize=12`, actorId, signal),
  preview: (actorId: string, quizId: string, version: number, signal?: AbortSignal) =>
    get<ViewerQuizPreview>(`quizzes/${encodeURIComponent(quizId)}?version=${version}`, actorId, signal),
  start: (actorId: string, quizId: string, version: number) =>
    requestJson(`${root}/quizzes/${encodeURIComponent(quizId)}/attempts?version=${version}`, actorId,
      { method: 'POST' }) as Promise<ViewerAttemptStart>,
  resume: (actorId: string, attemptId: string, signal?: AbortSignal) =>
    get<ViewerAttempt>(`attempts/${encodeURIComponent(attemptId)}`, actorId, signal),
  save: async (actorId: string, attemptId: string, answers: ViewerAnswer[]): Promise<void> => {
    await requestJson(`${root}/attempts/${encodeURIComponent(attemptId)}/answers`, actorId,
      { method: 'PUT', body: JSON.stringify({ answers }) });
  },
  submit: (actorId: string, attemptId: string, answers: ViewerAnswer[]) =>
    requestJson(`${root}/attempts/${encodeURIComponent(attemptId)}/submit`, actorId,
      { method: 'POST', body: JSON.stringify({ answers }) }) as Promise<ViewerAttemptResult>,
  result: (actorId: string, attemptId: string, signal?: AbortSignal) =>
    get<ViewerAttemptResult>(`attempts/${encodeURIComponent(attemptId)}/result`, actorId, signal),
  history: (actorId: string, filters: { page?: number; quizId?: string; version?: number; state?: string } = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams({ page: String(filters.page ?? 1), pageSize: '10' });
    if (filters.quizId) query.set('quizId', filters.quizId);
    if (filters.version) query.set('version', String(filters.version));
    if (filters.state) query.set('state', filters.state);
    // The controller returns QuizAttemptResultDto, not the management list DTO.
    return get<ViewerPage<ViewerAttemptResult>>(`me/attempts?${query}`, actorId, signal);
  },
};
