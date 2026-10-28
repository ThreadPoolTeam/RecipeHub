import { clearSession, getStoredSession } from '@/lib/demo/session';

interface ProblemDetails {
  title?: string;
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildHeaders(actorId: string | null, headers: HeadersInit | undefined): Headers {
  const result = new Headers(headers);
  if (actorId) result.set('X-User-Id', actorId);
  const session = getStoredSession();
  if (session?.accessToken) result.set('Authorization', `Bearer ${session.accessToken}`);
  return result;
}

function parseProblem(body: string, status: number): string {
  if (!body) return `API trả về HTTP ${status} mà không có nội dung.`;
  try {
    const value = JSON.parse(body) as ProblemDetails;
    const validationMessage = value.errors ? Object.values(value.errors).flat().join(' ') : '';
    return validationMessage || value.detail || value.message || value.title || body;
  } catch {
    return body;
  }
}

async function execute(path: string, actorId: string | null, init: RequestInit): Promise<Response> {
  const response = await fetch(`/api/backend/${path.replace(/^\//, '')}`, {
    ...init,
    headers: buildHeaders(actorId, init.headers),
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) clearSession();
    throw new ApiError(response.status, parseProblem(body, response.status), body);
  }
  return response;
}

export async function requestJson(
  path: string,
  actorId: string | null,
  init: RequestInit
): Promise<unknown> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await execute(path, actorId, { ...init, headers });
  return response.status === 204 ? null : response.json();
}

export async function requestBlob(
  path: string,
  actorId: string | null,
  init: RequestInit
): Promise<Blob> {
  return (await execute(path, actorId, init)).blob();
}

export async function requestExternalBlob(url: string): Promise<Blob> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, parseProblem(body, response.status), body);
  }
  return response.blob();
}
