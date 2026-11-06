export type DocumentType = 'draft' | 'published';
export type ExportScope = 'single' | 'collection';
export type DocumentState = 'pending' | 'processing' | 'ready' | 'failed';

export interface StepMediaItemDto {
  assetId: string;
  caption: string | null;
}

export interface PreviewPdfStepItem {
  stepId: string;
  media: StepMediaItemDto[];
}

export interface PreviewPdfItem {
  recipeId: string;
  recipeVersionId: string;
  titleOverride?: string | null;
  coverMediaAssetId?: string | null;
  steps: PreviewPdfStepItem[];
}

export interface PreviewPdfRequest {
  documentType: DocumentType;
  title: string;
  subtitle?: string | null;
  items: PreviewPdfItem[];
}

export interface ExportPdfRequest {
  expectedSnapshotHash: string;
  documentType: DocumentType;
  title: string;
  subtitle?: string | null;
  items: PreviewPdfItem[];
}

export interface PdfDocumentItemSummary {
  recipeVersionId: string;
  recipeCode: string;
  versionNumber: number;
  recipeName: string;
  sortOrder: number;
}

export interface PdfDocumentResponse {
  id: string;
  title: string;
  subtitle?: string | null;
  documentType: DocumentType;
  exportScope: ExportScope;
  state: DocumentState;
  createdByUserId: string;
  createdAt: string;
  completedAt?: string | null;
  fileName: string;
  byteSize?: number | null;
  sha256?: string | null;
  itemCount: number;
  errorCode?: string | null;
  items: PdfDocumentItemSummary[];
}

export interface PdfDocumentSummaryResponse {
  id: string;
  title: string;
  documentType: DocumentType;
  exportScope: ExportScope;
  state: DocumentState;
  createdByUserId: string;
  createdAt: string;
  completedAt?: string | null;
  fileName: string;
  byteSize?: number | null;
  sha256?: string | null;
  itemCount: number;
  errorCode?: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface PdfCapabilitiesResponse {
  orientation: 'landscape';
  maxItems: number;
  maxPdfBytes: number;
  maxMediaBytes: number;
  maxMediaPixels: number;
  maxConcurrentExports: number;
  maxTitleLength?: number;
  maxSubtitleLength?: number;
  maxCaptionLength?: number;
}

export interface HistoryFilterParams {
  search?: string;
  documentType?: DocumentType;
  exportScope?: ExportScope;
  state?: DocumentState;
  recipeVersionId?: string;
  createdByUserId?: string;
  fromUtc?: string;
  toUtc?: string;
  page?: number;
  pageSize?: number;
}

export interface PublishedDocumentLookupResponse {
  id: string;
  title: string;
  recipeVersionId: string;
  fileName: string;
  completedAt: string;
  byteSize?: number | null;
}
