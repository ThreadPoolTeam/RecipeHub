export type Role = 'rnd' | 'viewer' | 'admin';

export type RecipeStatus = 'Draft' | 'Published' | 'Archived';

export type MediaSource = 'Real' | 'AiIllustration';

export type MediaState = 'Active' | 'DeleteFailed';

export type DraftState = 'Generated' | 'Accepted' | 'Discarded' | 'Expired';

export type DocumentTemplate = 'standard-sop' | 'summary-card' | 'barista-handbook';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isLocked: boolean;
  allowedRecipeIds: string[]; // For Viewer role: list of approved recipe IDs granted
  avatarUrl?: string;
  createdAt: string;
}

export interface SessionInfo {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
  lastActiveAt: number; // timestamp in ms
}

export interface Ingredient {
  id: string;
  code: string;
  name: string;
  group: string; // 'Trà' | 'Sữa & Kem' | 'Siro & Đường' | 'Topping' | 'Khác'
  defaultUnit: string; // 'g' | 'ml' | 'shot' | 'muỗng' | 'gói'
  isActive: boolean;
  costPerUnit?: number;
  description?: string;
  note?: string;
  imageAssetId?: string;
  createdAt: string;
  updatedAt: string;
  categoryId?: string;
  defaultUnitId?: string;
  warning?: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;
  order: number;
  notes?: string;
  stageNote?: string; // Lý do tách giai đoạn nếu nguyên liệu trùng
}

export interface RecipeStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  durationSeconds?: number;
  temperatureCelsius?: number;
  equipment?: string;
  notes?: string;
  completionCriteria?: string;
  mediaAssetIds?: string[];
  coverMediaAssetId?: string;
  mediaCaptions?: Record<string, string>; // mediaAssetId -> caption
}

export interface RecipeVersion {
  id: string; // version entity ID
  versionId?: string;
  recipeId: string; // parent recipe identity (shared across v1, v2...)
  versionNumber: number; // 1, 2, 3...
  versionLabel: string; // 'v1.0', 'v2.0'...
  status: RecipeStatus;
  name: string;
  code: string; // e.g. 'REC-OLO-01'
  description?: string;
  targetYield: number | null;
  yieldUnit: string | null;
  yieldUnitId?: string;
  primaryMediaAssetId?: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  creatorId: string;
  creatorEmail: string;
  publishedAt?: string;
  publishedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  source: MediaSource;
  state: MediaState;
  tags?: string[];
  uploadedBy: string;
  createdAt: string;
  deliveryUrl?: string;
}

export interface AiCandidate {
  id: string;
  stepId?: string;
  targetKind?: 'final_product' | 'step_instruction';
  prompt: string;
  mediaAssetId: string;
  previewUrl?: string;
  state: DraftState;
  expiresAt: string;
  createdAt: string;
}

export interface DocumentDraft {
  id: string;
  sourceVersionId: string;
  template: DocumentTemplate;
  titleOverride?: string;
  coverMediaIdOverride?: string;
  stepCaptionOverrides?: Record<string, string>;
  customNotes?: string;
  updatedAt: string;
}

export interface PublishedDocument {
  id: string;
  sourceVersionId: string;
  recipeCode: string;
  versionLabel: string;
  snapshot: {
    recipeVersion: RecipeVersion;
    draft: DocumentDraft;
  };
  pdfBlob: Blob;
  actorEmail: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  actorEmail: string;
  actorRole: Role;
  action: string;
  targetType: 'recipe' | 'ingredient' | 'user' | 'media' | 'settings' | 'auth';
  targetId?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface DemoSettings {
  idleTimeoutMinutes: number; // default 30
  aiTextEnabled: boolean;
  aiImageEnabled: boolean;
  aiProvider: 'mock-gemini' | 'mock-flux';
  simulateAiFailure: boolean;
  simulateMediaDeleteFailure: boolean;
}

export type DemoErrorCode =
  | 'Validation'
  | 'Forbidden'
  | 'NotFound'
  | 'Conflict'
  | 'SessionExpired'
  | 'AiUnavailable'
  | 'ExportFailed'
  | 'StorageUnavailable';

export class DemoError extends Error {
  constructor(
    public code: DemoErrorCode,
    message: string,
    public action?: string
  ) {
    super(message);
    this.name = 'DemoError';
  }
}

export interface RecipeFilter {
  query?: string;
  status?: RecipeStatus | 'all';
  creatorEmail?: string;
  ingredientId?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MediaReferenceInfo {
  mediaId: string;
  recipes: Array<{
    versionId: string;
    recipeCode: string;
    recipeName: string;
    versionLabel: string;
    location: string;
  }>;
  documents: Array<{
    documentId: string;
    recipeCode: string;
    versionLabel: string;
  }>;
}
