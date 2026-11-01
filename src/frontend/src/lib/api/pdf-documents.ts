import { ApiError, requestBinary, requestJson } from './client';
import {
  PreviewPdfRequest,
  ExportPdfRequest,
  PdfDocumentResponse,
  PdfDocumentSummaryResponse,
  PdfCapabilitiesResponse,
  HistoryFilterParams,
  PagedResult,
  PublishedDocumentLookupResponse,
} from './pdf-document-types';

const BASE_PATH = 'api/v1/recipes/documents';

export async function getPdfCapabilities(
  actorId: string | null = null,
  signal?: AbortSignal
): Promise<PdfCapabilitiesResponse> {
  const result = await requestJson(`${BASE_PATH}/capabilities`, actorId, {
    method: 'GET',
    signal,
  });
  return result as PdfCapabilitiesResponse;
}

export async function previewPdf(
  request: PreviewPdfRequest,
  actorId: string | null = null,
  signal?: AbortSignal
): Promise<{ blob: Blob; snapshotHash: string | null }> {
  const { blob, headers } = await requestBinary(`${BASE_PATH}/preview`, actorId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  const snapshotHash =
    headers.get('x-pdf-snapshot-hash') ||
    headers.get('X-Pdf-Snapshot-Hash') ||
    null;

  return { blob, snapshotHash };
}

export async function exportPdf(
  request: ExportPdfRequest,
  actorId: string | null = null,
  signal?: AbortSignal
): Promise<PdfDocumentResponse> {
  const result = await requestJson(BASE_PATH, actorId, {
    method: 'POST',
    body: JSON.stringify(request),
    signal,
  });
  return result as PdfDocumentResponse;
}

export async function getPdfDocuments(
  filters: HistoryFilterParams = {},
  actorId: string | null = null,
  signal?: AbortSignal
): Promise<PagedResult<PdfDocumentSummaryResponse>> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.documentType) params.set('documentType', filters.documentType);
  if (filters.exportScope) params.set('exportScope', filters.exportScope);
  if (filters.state) params.set('state', filters.state);
  if (filters.recipeVersionId) params.set('recipeVersionId', filters.recipeVersionId);
  if (filters.createdByUserId) params.set('createdByUserId', filters.createdByUserId);
  if (filters.fromUtc) params.set('fromUtc', filters.fromUtc);
  if (filters.toUtc) params.set('toUtc', filters.toUtc);
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.pageSize) params.set('pageSize', filters.pageSize.toString());

  const queryString = params.toString();
  const path = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;

  const result = await requestJson(path, actorId, {
    method: 'GET',
    signal,
  });
  return result as PagedResult<PdfDocumentSummaryResponse>;
}

export async function getPdfDocumentDetail(
  documentId: string,
  actorId: string | null = null,
  signal?: AbortSignal
): Promise<PdfDocumentResponse> {
  const result = await requestJson(`${BASE_PATH}/${documentId}`, actorId, {
    method: 'GET',
    signal,
  });
  return result as PdfDocumentResponse;
}

export async function downloadPdfDocumentFile(
  documentId: string,
  disposition: 'inline' | 'attachment' = 'attachment',
  actorId: string | null = null,
  signal?: AbortSignal
): Promise<{ blob: Blob; fileName: string | null }> {
  const { blob, headers } = await requestBinary(
    `${BASE_PATH}/${documentId}/file?disposition=${disposition}`,
    actorId,
    {
      method: 'GET',
      signal,
    }
  );

  let fileName: string | null = null;
  const contentDisp = headers.get('content-disposition') || headers.get('Content-Disposition');
  if (contentDisp) {
    const utf8Match = contentDisp.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match && utf8Match[1]) {
      fileName = decodeURIComponent(utf8Match[1]);
    } else {
      const asciiMatch = contentDisp.match(/filename="?([^";]+)"?/i);
      if (asciiMatch && asciiMatch[1]) {
        fileName = asciiMatch[1];
      }
    }
  }

  return { blob, fileName };
}

export async function getPublishedDocumentByVersion(
  versionId: string,
  actorId: string | null = null,
  signal?: AbortSignal
): Promise<PublishedDocumentLookupResponse | null> {
  try {
    const result = await requestJson(`api/v1/recipes/${versionId}/published-document`, actorId, {
      method: 'GET',
      signal,
    });
    return result as PublishedDocumentLookupResponse;
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}
