import { DemoRepository } from '@/lib/demo/repository';
import {
  AiCandidate,
  Ingredient,
  MediaAsset,
  MediaReferenceInfo,
  MediaSource,
  MediaState,
  PaginatedResult,
  RecipeFilter,
  RecipeIngredient,
  RecipeStatus,
  RecipeStep,
  RecipeVersion,
  SessionInfo,
  User,
  Role,
} from '@/lib/demo/types';
import { clearSession, saveBackendSession, updateSessionUser } from '@/lib/demo/session';
import { ApiError, requestBlob, requestJson } from './client';

type JsonRecord = Record<string, unknown>;

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  state: string;
}

export interface UnitItem extends CatalogItem {
  categoryId: string;
  categoryName: string;
  decimalPlaces: number;
}

interface DraftContext {
  versionId: string;
}

export interface ScaleResult {
  standardYield: number;
  targetYield: number;
  multiplier: number;
  ingredients: RecipeIngredient[];
}
export interface UnitTotal { unit: string; quantity: number }

function mapUser(value: unknown): User {
  const item = record(value, 'user');
  const role = text(item.role, 'user.role');
  if (!['admin', 'rnd', 'viewer'].includes(role)) throw new TypeError('Role không hợp lệ.');
  return {
    id: text(item.id, 'user.id'), email: text(item.email, 'user.email'), fullName: text(item.fullName, 'user.fullName'),
    role: role as Role, isLocked: !booleanValue(item.isActive, 'user.isActive'),
    allowedRecipeIds: Array.isArray(item.allowedRecipeIds)
      ? item.allowedRecipeIds.map(id => text(id, 'recipe id'))
      : [],
    createdAt: text(item.createdAt, 'user.createdAt'),
  };
}

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} phải là một JSON object.`);
  }
  return value as JsonRecord;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} phải là một JSON array.`);
  return value;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new TypeError(`${label} phải là chuỗi.`);
  return value;
}

function optionalText(value: unknown, label: string): string | undefined {
  if (value === null || value === undefined) return undefined;
  return text(value, label);
}

function numberValue(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} phải là số hợp lệ.`);
  }
  return value;
}

function optionalNumber(value: unknown, label: string): number | undefined {
  if (value === null || value === undefined) return undefined;
  return numberValue(value, label);
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${label} phải là boolean.`);
  return value;
}

function mapStatus(versionStatus: string, recipeState: string): RecipeStatus {
  if (recipeState.toLowerCase() === 'archived') return 'Archived';
  switch (versionStatus.toLowerCase()) {
    case 'draft':
      return 'Draft';
    case 'published':
      return 'Published';
    default:
      throw new TypeError(`Trạng thái công thức không được hỗ trợ: ${versionStatus}`);
  }
}

function mapCatalog(value: unknown, label: string): CatalogItem {
  const item = record(value, label);
  return {
    id: text(item.id, `${label}.id`),
    code: text(item.code, `${label}.code`),
    name: text(item.name, `${label}.name`),
    description: optionalText(item.description, `${label}.description`),
    state: text(item.state, `${label}.state`),
  };
}

function mapUnit(value: unknown, label: string): UnitItem {
  const item = record(value, label);
  return {
    ...mapCatalog(item, label),
    categoryId: text(item.categoryId, `${label}.categoryId`),
    categoryName: text(item.categoryName, `${label}.categoryName`),
    decimalPlaces: numberValue(item.decimalPlaces, `${label}.decimalPlaces`),
  };
}

function mapIngredient(value: unknown, label: string): Ingredient {
  const item = record(value, label);
  return {
    id: text(item.id, `${label}.id`),
    code: text(item.code, `${label}.code`),
    name: text(item.name, `${label}.name`),
    group: text(item.categoryName, `${label}.categoryName`),
    defaultUnit: text(item.defaultUnitCode, `${label}.defaultUnitCode`),
    isActive: text(item.state, `${label}.state`).toLowerCase() === 'active',
    description: optionalText(item.description, `${label}.description`),
    note: optionalText(item.note, `${label}.note`),
    imageAssetId: optionalText(item.imageAssetRef, `${label}.imageAssetRef`),
    createdAt: text(item.createdAt, `${label}.createdAt`),
    updatedAt: text(item.updatedAt, `${label}.updatedAt`),
    categoryId: text(item.categoryId, `${label}.categoryId`),
    defaultUnitId: text(item.defaultUnitId, `${label}.defaultUnitId`),
    warning: optionalText(item.warning, `${label}.warning`),
  };
}

function mapRecipeIngredient(value: unknown, label: string): RecipeIngredient {
  const item = record(value, label);
  return {
    ingredientId: text(item.ingredientId, `${label}.ingredientId`),
    quantity: numberValue(item.quantity, `${label}.quantity`),
    unit: text(item.unitCode, `${label}.unitCode`),
    order: numberValue(item.sortOrder, `${label}.sortOrder`),
    notes: optionalText(item.note, `${label}.note`),
    stageNote: optionalText(item.stageName, `${label}.stageName`),
  };
}

function mapRecipeStep(value: unknown, label: string): RecipeStep {
  const item = record(value, label);
  const media = array(item.media, `${label}.media`).map((entry, index) => {
    const mediaItem = record(entry, `${label}.media[${index}]`);
    return {
      id: text(mediaItem.mediaAssetRef, `${label}.media[${index}].mediaAssetRef`),
      isPrimary: booleanValue(mediaItem.isPrimary, `${label}.media[${index}].isPrimary`),
      caption: optionalText(mediaItem.caption, `${label}.media[${index}].caption`),
    };
  });
  return {
    id: text(item.id, `${label}.id`),
    stepNumber: numberValue(item.sortOrder, `${label}.sortOrder`),
    title: text(item.title, `${label}.title`),
    instruction: text(item.description, `${label}.description`),
    durationSeconds: optionalNumber(item.durationSeconds, `${label}.durationSeconds`),
    temperatureCelsius: optionalNumber(item.temperatureCelsius, `${label}.temperatureCelsius`),
    equipment: optionalText(item.equipment, `${label}.equipment`),
    notes: optionalText(item.safetyNote, `${label}.safetyNote`),
    completionCriteria: optionalText(item.completionCriteria, `${label}.completionCriteria`),
    mediaAssetIds: media.map((entry) => entry.id),
    coverMediaAssetId: media.find((entry) => entry.isPrimary)?.id,
    mediaCaptions: Object.fromEntries(
      media.filter((entry) => entry.caption).map((entry) => [entry.id, entry.caption as string])
    ),
  };
}

function mapRecipeDetail(value: unknown): RecipeVersion {
  const item = record(value, 'recipe');
  const yieldItem = item.yield ? record(item.yield, 'recipe.yield') : null;
  const versionNumber = numberValue(item.versionNumber, 'recipe.versionNumber');
  return {
    id: text(item.id, 'recipe.id'),
    recipeId: text(item.id, 'recipe.id'),
    versionId: text(item.versionId, 'recipe.versionId'),
    versionNumber,
    versionLabel: `v${versionNumber}.0`,
    status: mapStatus(text(item.versionStatus, 'recipe.versionStatus'), text(item.state, 'recipe.state')),
    name: text(item.name, 'recipe.name'),
    code: text(item.code, 'recipe.code'),
    description: optionalText(item.description, 'recipe.description'),
    targetYield: yieldItem ? numberValue(yieldItem.quantity, 'recipe.yield.quantity') : null,
    yieldUnit: yieldItem ? text(yieldItem.unitCode, 'recipe.yield.unitCode') : null,
    yieldUnitId: yieldItem ? text(yieldItem.unitId, 'recipe.yield.unitId') : undefined,
    primaryMediaAssetId: optionalText(item.primaryMediaAssetRef, 'recipe.primaryMediaAssetRef'),
    ingredients: array(item.ingredients, 'recipe.ingredients').map((entry, index) =>
      mapRecipeIngredient(entry, `recipe.ingredients[${index}]`)
    ),
    steps: array(item.steps, 'recipe.steps').map((entry, index) =>
      mapRecipeStep(entry, `recipe.steps[${index}]`)
    ),
    creatorId: '',
    creatorEmail: '',
    publishedAt: optionalText(item.publishedAt, 'recipe.publishedAt'),
    publishedByUserId: optionalText(item.publishedByUserRef, 'recipe.publishedByUserRef'),
    createdAt: text(item.createdAt, 'recipe.createdAt'),
    updatedAt: text(item.updatedAt, 'recipe.updatedAt'),
  };
}

function mapRecipeSummary(value: unknown): RecipeVersion {
  const item = record(value, 'recipe summary');
  const versionNumber = numberValue(item.versionNumber, 'recipe summary.versionNumber');
  const updatedAt = text(item.updatedAt, 'recipe summary.updatedAt');
  const primaryMediaAssetId =
    optionalText(item.primaryMediaAssetRef, 'recipe summary.primaryMediaAssetRef') ??
    optionalText(item.primaryMediaAssetId, 'recipe summary.primaryMediaAssetId');
  const ingredientCount = typeof item.ingredientCount === 'number' ? item.ingredientCount : 0;
  const stepCount = typeof item.stepCount === 'number' ? item.stepCount : 0;
  const createdByUserRef = optionalText(item.createdByUserRef, 'recipe summary.createdByUserRef') ?? '';
  return {
    id: text(item.id, 'recipe summary.id'),
    recipeId: text(item.id, 'recipe summary.id'),
    versionId: text(item.versionId, 'recipe summary.versionId'),
    versionNumber,
    versionLabel: `v${versionNumber}.0`,
    status: mapStatus(text(item.versionStatus, 'recipe summary.versionStatus'), text(item.state, 'recipe summary.state')),
    name: text(item.name, 'recipe summary.name'),
    code: text(item.code, 'recipe summary.code'),
    description: optionalText(item.description, 'recipe summary.description') ?? '',
    targetYield: null,
    yieldUnit: null,
    primaryMediaAssetId: primaryMediaAssetId || undefined,
    ingredients: Array.from({ length: ingredientCount }, (_, i) => ({ ingredientId: '', quantity: 0, unit: '', order: i + 1 })),
    steps: Array.from({ length: stepCount }, (_, i) => ({ id: String(i + 1), stepNumber: i + 1, title: '', instruction: '' })),
    creatorId: createdByUserRef,
    creatorEmail: createdByUserRef ? 'rd@recipehub.demo' : '',
    createdAt: updatedAt,
    updatedAt,
  };
}

function mapMediaAsset(value: unknown): MediaAsset {
  const item = record(value, 'media asset');
  const id = text(item.assetId, 'media asset.assetId');
  const deliveryUrl = optionalText(item.deliveryUrl, 'media asset.deliveryUrl') ?? '';
  const aiDraftId = optionalText(item.aiDraftId, 'media asset.aiDraftId');
  let resolvedUrl = deliveryUrl;
  if (!resolvedUrl && aiDraftId) {
    resolvedUrl = `/api/backend/api/v1/content/image-drafts/${aiDraftId}/image`;
  }
  return {
    id,
    name: optionalText(item.originalFileName, 'media asset.originalFileName') ?? id,
    mimeType: optionalText(item.mimeType, 'media asset.mimeType') ?? 'image/png',
    sizeBytes: numberValue(item.byteSize, 'media asset.byteSize'),
    blob: new Blob(),
    source: (optionalText(item.sourceType, 'media asset.sourceType') ?? '').toLowerCase().includes('ai') ? 'AiIllustration' : 'Real',
    state: 'Active',
    tags: [],
    uploadedBy: '',
    createdAt: optionalText(item.createdAt, 'media asset.createdAt') ?? new Date().toISOString(),
    deliveryUrl: resolvedUrl || undefined,
  };
}

export class BackendRepository extends DemoRepository {
  override async login(username: string, password: string): Promise<SessionInfo> {
    const response = record(await requestJson('api/v1/identity/auth/login', null, {
      method: 'POST', body: JSON.stringify({ username, password }),
    }), 'login');
    return saveBackendSession(mapUser(response.user), {
      accessToken: text(response.accessToken, 'login.accessToken'), refreshToken: text(response.refreshToken, 'login.refreshToken'),
      expiresAt: text(response.expiresAt, 'login.expiresAt'),
    });
  }

  override async logout(_session: SessionInfo | null): Promise<void> {
    try { await requestJson('api/v1/identity/auth/logout', null, { method: 'POST' }); }
    finally { clearSession(); }
  }

  override async getCurrentUser(_session: SessionInfo): Promise<User | null> {
    try {
      const user = mapUser(await requestJson('api/v1/identity/auth/me', null, { method: 'GET' }));
      updateSessionUser(user);
      return user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  }

  async getUsersPage(search = '', role = '', state = '', page = 1, pageSize = 20): Promise<PaginatedResult<User>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search.trim()) params.set('search', search.trim());
    if (role && role !== 'all') params.set('role', role);
    if (state && state !== 'all') params.set('state', state);
    const response = record(await requestJson(`api/v1/identity/users?${params}`, null, { method: 'GET' }), 'users page');
    const total = numberValue(response.totalCount, 'users.totalCount');
    return { items: array(response.items, 'users.items').map(mapUser), total,
      page: numberValue(response.page, 'users.page'), pageSize: numberValue(response.pageSize, 'users.pageSize'),
      totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  override async getUsers(search = '', role = '', state = '', page = 1, pageSize = 100): Promise<User[]> {
    return (await this.getUsersPage(search, role, state, page, pageSize)).items;
  }

  override async createUser(actor: SessionInfo, data: Omit<User, 'id' | 'createdAt'> & { password?: string }): Promise<User> {
    return mapUser(await requestJson('api/v1/identity/users', this.actorId(actor), {
      method: 'POST', body: JSON.stringify({ email: data.email, fullName: data.fullName, role: data.role,
        password: data.password }),
    }));
  }

  override async updateUser(actor: SessionInfo, id: string, data: Partial<User>): Promise<User> {
    const current = mapUser(await requestJson(`api/v1/identity/users/${id}`, this.actorId(actor), { method: 'GET' }));
    return mapUser(await requestJson(`api/v1/identity/users/${id}`, this.actorId(actor), {
      method: 'PUT', body: JSON.stringify({ fullName: data.fullName ?? current.fullName, role: data.role ?? current.role }),
    }));
  }

  async updateUserStatus(actor: SessionInfo, id: string, isActive: boolean): Promise<User> {
    return mapUser(await requestJson(`api/v1/identity/users/${id}/status`, this.actorId(actor), {
      method: 'PUT', body: JSON.stringify({ isActive }),
    }));
  }

  override async toggleUserLock(actor: SessionInfo, id: string): Promise<boolean> {
    const current = mapUser(await requestJson(`api/v1/identity/users/${id}`, this.actorId(actor), { method: 'GET' }));
    return (await this.updateUserStatus(actor, id, current.isLocked)).isLocked;
  }

  async resetUserPassword(actor: SessionInfo, id: string, newPassword: string): Promise<void> {
    await requestJson(`api/v1/identity/users/${id}/password`, this.actorId(actor), { method: 'PUT', body: JSON.stringify({ newPassword }) });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await requestJson('api/v1/identity/auth/password', null, { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
    clearSession();
  }

  async scaleRecipe(ingredients: RecipeIngredient[], standardYield: number, targetYield: number, signal?: AbortSignal): Promise<ScaleResult> {
    const response = record(await requestJson('api/v1/recipes/calculate/scale', null, {
      method: 'POST', signal, body: JSON.stringify({ ingredients, standardYield, targetYield }),
    }), 'scale');
    return { standardYield: numberValue(response.standardYield, 'scale.standardYield'), targetYield: numberValue(response.targetYield, 'scale.targetYield'),
      multiplier: numberValue(response.multiplier, 'scale.multiplier'), ingredients: array(response.ingredients, 'scale.ingredients').map((value) => {
        const line = record(value, 'scaled ingredient');
        return { ingredientId: text(line.ingredientId, 'ingredientId'), quantity: numberValue(line.quantity, 'quantity'),
          unit: text(line.unit, 'unit'), order: numberValue(line.order, 'order'), notes: optionalText(line.notes, 'notes'), stageNote: optionalText(line.stageNote, 'stageNote') };
      }) };
  }

  async convertUnit(value: number, sourceUnit: string, targetUnit: string, signal?: AbortSignal): Promise<number> {
    const response = record(await requestJson('api/v1/recipes/units/convert', null, {
      method: 'POST', signal, body: JSON.stringify({ value, sourceUnit, targetUnit }),
    }), 'conversion');
    return numberValue(response.convertedValue, 'conversion.convertedValue');
  }

  async calculateTotals(ingredients: RecipeIngredient[], signal?: AbortSignal): Promise<UnitTotal[]> {
    const response = record(await requestJson('api/v1/recipes/calculate/totals', null, {
      method: 'POST', signal, body: JSON.stringify({ ingredients }),
    }), 'totals');
    return array(response.totals, 'totals.totals').map(value => {
      const total = record(value, 'total');
      return { unit: text(total.unit, 'total.unit'), quantity: numberValue(total.quantity, 'total.quantity') };
    });
  }

  private categories: CatalogItem[] | null = null;
  private unitCategories: CatalogItem[] | null = null;
  private units: UnitItem[] | null = null;
  private ingredientsCache: Ingredient[] | null = null;
  private ingredientsPromise: Promise<Ingredient[]> | null = null;
  private mediaCache: MediaAsset[] | null = null;
  private mediaPromise: Promise<MediaAsset[]> | null = null;
  private recipesCache = new Map<string, PaginatedResult<RecipeVersion>>();
  private recipesPromise = new Map<string, Promise<PaginatedResult<RecipeVersion>>>();
  private readonly draftContexts = new Map<string, DraftContext>();
  private readonly draftPreviews = new Map<string, Blob>();
  private rememberDraftContext(recipe: RecipeVersion): void {
    const context = {
      versionId: recipe.versionId ?? '',
    };
    this.draftContexts.set(recipe.id, context);
    recipe.steps.forEach((step) => this.draftContexts.set(step.id, context));
  }

  private actorId(actor: SessionInfo): string {
    if (/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(actor.userId)) {
      return actor.userId;
    }
    throw new Error('Session không có User ID hợp lệ. Hãy đăng nhập lại.');
  }

  private async getCategories(): Promise<CatalogItem[]> {
    if (this.categories) return this.categories;
    const response = await requestJson('api/v1/recipes/ingredient-categories', null, { method: 'GET' });
    this.categories = array(response, 'ingredient categories').map((entry, index) =>
      mapCatalog(entry, `ingredient categories[${index}]`)
    );
    return this.categories;
  }

  async getIngredientCategories(): Promise<CatalogItem[]> {
    return this.getCategories();
  }

  async getUnitCategories(): Promise<CatalogItem[]> {
    if (this.unitCategories) return this.unitCategories;
    const response = await requestJson('api/v1/recipes/unit-categories', null, { method: 'GET' });
    this.unitCategories = array(response, 'unit categories').map((entry, index) =>
      mapCatalog(entry, `unit categories[${index}]`)
    );
    return this.unitCategories;
  }

  async getUnits(): Promise<UnitItem[]> {
    if (this.units) return this.units;
    const response = await requestJson('api/v1/recipes/catalogs/units', null, { method: 'GET' });
    this.units = array(response, 'units').map((entry, index) => mapUnit(entry, `units[${index}]`));
    return this.units;
  }

  async createIngredientCategory(
    actor: SessionInfo,
    data: { code: string; name: string; description: string }
  ): Promise<CatalogItem> {
    const response = await requestJson('api/v1/recipes/ingredient-categories', this.actorId(actor), {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.categories = null;
    return mapCatalog(response, 'ingredient category');
  }

  async updateIngredientCategory(
    actor: SessionInfo,
    id: string,
    data: { code: string; name: string; description: string }
  ): Promise<CatalogItem> {
    const response = await requestJson(`api/v1/recipes/ingredient-categories/${id}`, this.actorId(actor), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    this.categories = null;
    return mapCatalog(response, 'ingredient category');
  }

  async deactivateIngredientCategory(actor: SessionInfo, id: string): Promise<void> {
    await requestJson(`api/v1/recipes/ingredient-categories/${id}`, this.actorId(actor), { method: 'DELETE' });
    this.categories = null;
  }

  async activateIngredientCategory(actor: SessionInfo, id: string): Promise<CatalogItem> {
    const response = await requestJson(
      `api/v1/recipes/ingredient-categories/${id}/activate`,
      this.actorId(actor),
      { method: 'PATCH' }
    );
    this.categories = null;
    return mapCatalog(response, 'ingredient category');
  }

  async createUnitCategory(
    actor: SessionInfo,
    data: { code: string; name: string; description: string }
  ): Promise<CatalogItem> {
    const response = await requestJson('api/v1/recipes/unit-categories', this.actorId(actor), {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.unitCategories = null;
    return mapCatalog(response, 'unit category');
  }

  async updateUnitCategory(
    actor: SessionInfo,
    id: string,
    data: { code: string; name: string; description: string }
  ): Promise<CatalogItem> {
    const response = await requestJson(`api/v1/recipes/unit-categories/${id}`, this.actorId(actor), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    this.unitCategories = null;
    return mapCatalog(response, 'unit category');
  }

  async deactivateUnitCategory(actor: SessionInfo, id: string): Promise<void> {
    await requestJson(`api/v1/recipes/unit-categories/${id}`, this.actorId(actor), { method: 'DELETE' });
    this.unitCategories = null;
  }

  async activateUnitCategory(actor: SessionInfo, id: string): Promise<CatalogItem> {
    const response = await requestJson(
      `api/v1/recipes/unit-categories/${id}/activate`,
      this.actorId(actor),
      { method: 'PATCH' }
    );
    this.unitCategories = null;
    return mapCatalog(response, 'unit category');
  }

  async createUnit(
    actor: SessionInfo,
    data: {
      code: string;
      name: string;
      categoryId: string;
      decimalPlaces: number;
    }
  ): Promise<UnitItem> {
    const response = await requestJson('api/v1/recipes/units', this.actorId(actor), {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.units = null;
    return mapUnit(response, 'unit');
  }

  async updateUnit(
    actor: SessionInfo,
    id: string,
    data: {
      code: string;
      name: string;
      categoryId: string;
      decimalPlaces: number;
    }
  ): Promise<UnitItem> {
    const response = await requestJson(`api/v1/recipes/units/${id}`, this.actorId(actor), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    this.units = null;
    return mapUnit(response, 'unit');
  }

  async deactivateUnit(actor: SessionInfo, id: string): Promise<void> {
    await requestJson(`api/v1/recipes/units/${id}`, this.actorId(actor), { method: 'DELETE' });
    this.units = null;
  }

  async activateUnit(actor: SessionInfo, id: string): Promise<UnitItem> {
    const response = await requestJson(`api/v1/recipes/units/${id}/activate`, this.actorId(actor), {
      method: 'PATCH',
    });
    this.units = null;
    return mapUnit(response, 'unit');
  }

  private async resolveCategoryId(name: string): Promise<string> {
    const match = (await this.getCategories()).find(
      (item) => item.name === name || item.code.toLowerCase() === name.toLowerCase()
    );
    if (!match) throw new Error(`Không tìm thấy nhóm nguyên liệu "${name}" trong Recipe Service.`);
    return match.id;
  }

  private async resolveUnitId(code: string): Promise<string> {
    const normalized = code.trim().toLowerCase();
    const match = (await this.getUnits()).find(
      (item) => item.code.toLowerCase() === normalized || item.name.toLowerCase() === normalized
    );
    if (!match) throw new Error(`Không tìm thấy đơn vị "${code}" trong Recipe Service.`);
    return match.id;
  }

  override async getIngredients(
    query?: string,
    group?: string,
    activeOnly?: boolean,
    signal?: AbortSignal
  ): Promise<Ingredient[]> {
    const effectiveQuery = query ?? '';
    const effectiveGroup = group ?? '';
    const onlyActive = activeOnly ?? false;
    const isDefault = !effectiveQuery.trim() && (!effectiveGroup || effectiveGroup === 'all') && !onlyActive;

    if (isDefault && this.ingredientsCache) {
      return this.ingredientsCache;
    }

    const withAbort = <T>(promise: Promise<T>): Promise<T> => {
      if (!signal) return promise;
      if (signal.aborted) return Promise.reject(new DOMException('This operation was aborted', 'AbortError'));
      const { promise: abortPromise, reject } = Promise.withResolvers<T>();
      signal.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')), { once: true });
      return Promise.race([promise, abortPromise]);
    };

    if (isDefault && this.ingredientsPromise) {
      return withAbort(this.ingredientsPromise);
    }

    const fetchPromise = (async () => {
      const params = new URLSearchParams();
      if (effectiveQuery.trim()) params.set('query', effectiveQuery.trim());
      if (onlyActive) params.set('state', 'active');
      if (effectiveGroup && effectiveGroup !== 'all') params.set('categoryId', await this.resolveCategoryId(effectiveGroup));
      const suffix = params.size ? `?${params.toString()}` : '';
      const response = await requestJson(`api/v1/recipes/ingredients${suffix}`, null, { method: 'GET' });
      const items = array(response, 'ingredients').map((entry, index) =>
        mapIngredient(entry, `ingredients[${index}]`)
      );
      if (isDefault) {
        this.ingredientsCache = items;
      }
      return items;
    })();

    if (isDefault) {
      this.ingredientsPromise = fetchPromise;
      const clearIfSame = () => {
        if (this.ingredientsPromise === fetchPromise) {
          this.ingredientsPromise = null;
        }
      };
      fetchPromise.then(clearIfSame, clearIfSame);
    }

    return withAbort(fetchPromise);
  }

  async generateIngredientCode(actor: SessionInfo, categoryId: string): Promise<string> {
    const response = record(
      await requestJson('api/v1/recipes/ingredients/generate-code', this.actorId(actor), {
        method: 'POST',
        body: JSON.stringify({ categoryId }),
      }),
      'generated ingredient code'
    );
    return text(response.code, 'generated ingredient code.code');
  }

  override async createIngredient(
    actor: SessionInfo,
    data: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Ingredient> {
    const response = await requestJson('api/v1/recipes/ingredients', this.actorId(actor), {
      method: 'POST',
      body: JSON.stringify({
        code: data.code,
        name: data.name,
        categoryId: data.categoryId ?? await this.resolveCategoryId(data.group),
        defaultUnitId: data.defaultUnitId ?? await this.resolveUnitId(data.defaultUnit),
        description: data.description ?? null,
        warning: data.warning ?? null,
        note: data.note ?? null,
        imageAssetRef: data.imageAssetId ?? null,
      }),
    });
    this.ingredientsCache = null;
    const created = mapIngredient(response, 'ingredient');
    if (data.isActive) return created;
    await requestJson(`api/v1/recipes/ingredients/${created.id}`, this.actorId(actor), { method: 'DELETE' });
    return { ...created, isActive: false };
  }

  override async updateIngredient(
    actor: SessionInfo,
    id: string,
    data: Partial<Omit<Ingredient, 'id' | 'createdAt'>>
  ): Promise<Ingredient> {
    const current = mapIngredient(
      await requestJson(`api/v1/recipes/ingredients/${id}`, null, { method: 'GET' }),
      'ingredient'
    );
    const desiredActive = data.isActive ?? current.isActive;
    const response = await requestJson(`api/v1/recipes/ingredients/${id}`, this.actorId(actor), {
      method: 'PUT',
      body: JSON.stringify({
        code: data.code ?? current.code,
        name: data.name ?? current.name,
        categoryId: data.categoryId ?? await this.resolveCategoryId(data.group ?? current.group),
        defaultUnitId: data.defaultUnitId ?? await this.resolveUnitId(data.defaultUnit ?? current.defaultUnit),
        description: data.description ?? current.description ?? null,
        warning: data.warning ?? current.warning ?? null,
        note: data.note ?? current.note ?? null,
        imageAssetRef: data.imageAssetId ?? current.imageAssetId ?? null,
      }),
    });
    this.ingredientsCache = null;
    let updated = mapIngredient(response, 'ingredient');
    if (desiredActive !== updated.isActive) {
      const method = desiredActive ? 'PATCH' : 'DELETE';
      const suffix = desiredActive ? '/activate' : '';
      const stateResponse = await requestJson(`api/v1/recipes/ingredients/${id}${suffix}`, this.actorId(actor), { method });
      updated = stateResponse ? mapIngredient(stateResponse, 'ingredient') : { ...updated, isActive: desiredActive };
    }
    return updated;
  }

  override async getRecipes(actor: SessionInfo, filter?: RecipeFilter): Promise<PaginatedResult<RecipeVersion>> {
    const effectiveFilter = filter ?? {};
    const requestedPageSize = effectiveFilter.pageSize ?? 10;
    const clampedPageSize = Math.min(Math.max(1, requestedPageSize), 100);
    const cacheKey = `${effectiveFilter.page ?? 1}_${clampedPageSize}_${effectiveFilter.query?.trim() ?? ''}_${effectiveFilter.status ?? 'all'}`;

    const cached = this.recipesCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const inFlight = this.recipesPromise.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const fetchPromise = (async () => {
      const params = new URLSearchParams({
        page: String(effectiveFilter.page ?? 1),
        pageSize: String(clampedPageSize),
      });
      if (effectiveFilter.query?.trim()) params.set('query', effectiveFilter.query.trim());
      if (effectiveFilter.status && effectiveFilter.status !== 'all') {
        if (effectiveFilter.status === 'Archived') params.set('state', 'archived');
        else if (effectiveFilter.status === 'Published') params.set('versionStatus', 'published');
        else params.set('versionStatus', effectiveFilter.status.toLowerCase());
      }
      const response = record(
        await requestJson(`api/v1/recipes?${params.toString()}`, this.actorId(actor), { method: 'GET' }),
        'recipes page'
      );
      const page = numberValue(response.page, 'recipes page.page');
      const pageSize = numberValue(response.pageSize, 'recipes page.pageSize');
      const total = numberValue(response.totalCount, 'recipes page.totalCount');
      const rawItems = array(response.items, 'recipes page.items');
      const items = await Promise.all(
        rawItems.map(async (raw) => {
          const summary = mapRecipeSummary(raw);
          const rawRec = record(raw, 'recipe raw item');
          if (typeof rawRec.ingredientCount === 'number') {
            return summary;
          }
          try {
            const detail = mapRecipeDetail(await requestJson(
              `api/v1/recipes/${summary.id}/versions/${summary.versionId}`, this.actorId(actor), { method: 'GET' }
            ));
            return {
              ...detail,
              id: summary.id,
              recipeId: summary.recipeId,
              versionId: summary.versionId || detail.versionId,
              versionNumber: summary.versionNumber || detail.versionNumber,
              versionLabel: summary.versionLabel || detail.versionLabel,
              status: summary.status || detail.status,
              name: summary.name || detail.name,
              code: summary.code || detail.code,
              primaryMediaAssetId: detail.primaryMediaAssetId || summary.primaryMediaAssetId,
              creatorEmail: actor.email || detail.creatorEmail || 'rd@recipehub.demo',
            };
          } catch {
            return summary;
          }
        })
      );

      const result: PaginatedResult<RecipeVersion> = {
        items,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
      this.recipesCache.set(cacheKey, result);
      return result;
    })();

    this.recipesPromise.set(cacheKey, fetchPromise);
    const cleanup = () => {
      if (this.recipesPromise.get(cacheKey) === fetchPromise) {
        this.recipesPromise.delete(cacheKey);
      }
    };
    fetchPromise.then(cleanup, cleanup);
    return fetchPromise;
  }

  override async getRecipeVersion(actor: SessionInfo, recipeId: string): Promise<RecipeVersion> {
    const recipe = mapRecipeDetail(
      await requestJson(`api/v1/recipes/${recipeId}`, this.actorId(actor), { method: 'GET' })
    );
    this.rememberDraftContext(recipe);
    return recipe;
  }

  override async getRecipeVersions(actor: SessionInfo, recipeId: string): Promise<RecipeVersion[]> {
    try {
      const rawVersions = array(
        await requestJson(`api/v1/recipes/${recipeId}/versions`, this.actorId(actor), { method: 'GET' }),
        'recipe versions'
      );
      const detailedVersions = await Promise.all(
        rawVersions.map(async (vItem) => {
          const vRec = record(vItem, 'version summary');
          const versionId = text(vRec.id, 'version summary.id');
          try {
            const detail = mapRecipeDetail(
              await requestJson(`api/v1/recipes/${recipeId}/versions/${versionId}`, this.actorId(actor), { method: 'GET' })
            );
            return {
              ...detail,
              recipeId,
            };
          } catch {
            const versionNumber = numberValue(vRec.versionNumber, 'version summary.versionNumber');
            return {
              id: versionId,
              recipeId,
              versionId,
              versionNumber,
              versionLabel: `v${versionNumber}.0`,
              status: mapStatus(text(vRec.status, 'version summary.status'), 'active'),
              name: text(vRec.name, 'version summary.name'),
              code: '',
              targetYield: null,
              yieldUnit: null,
              ingredients: [],
              steps: [],
              creatorId: '',
              creatorEmail: '',
              createdAt: text(vRec.createdAt, 'version summary.createdAt'),
              updatedAt: text(vRec.updatedAt, 'version summary.updatedAt'),
            };
          }
        })
      );
      return detailedVersions.sort((a, b) => b.versionNumber - a.versionNumber);
    } catch {
      // Fallback: if versions endpoint fails, return current version
      try {
        const current = await this.getRecipeVersion(actor, recipeId);
        return [current];
      } catch {
        return [];
      }
    }
  }
  private async recipePayload(
    data: {
      code: string;
      name: string;
      description?: string;
      targetYield?: number | null;
      yieldUnit?: string | null;
      primaryMediaAssetId?: string;
      ingredients: RecipeIngredient[];
      steps: RecipeStep[];
    }
  ): Promise<JsonRecord> {
    const ingredients = await Promise.all(data.ingredients.map(async (item) => ({
      ingredientId: item.ingredientId,
      unitId: await this.resolveUnitId(item.unit),
      quantity: item.quantity,
      stageName: item.stageNote ?? null,
      note: item.notes ?? null,
    })));
    const steps = data.steps.map((step) => ({
      id: /^[0-9a-f-]{36}$/i.test(step.id) ? step.id : null,
      title: step.title,
      description: step.instruction,
      durationSeconds: step.durationSeconds ?? null,
      temperatureCelsius: step.temperatureCelsius ?? null,
      equipment: step.equipment ?? null,
      safetyNote: step.notes ?? null,
      completionCriteria: step.completionCriteria ?? null,
      media: (step.mediaAssetIds ?? []).map((mediaAssetRef) => ({
        mediaAssetRef,
        isPrimary: mediaAssetRef === step.coverMediaAssetId,
        caption: step.mediaCaptions?.[mediaAssetRef] ?? null,
      })),
    }));
    const hasYieldQuantity = data.targetYield !== null && data.targetYield !== undefined;
    const hasYieldUnit = data.yieldUnit !== null && data.yieldUnit !== undefined && data.yieldUnit.trim().length > 0;
    if (hasYieldQuantity !== hasYieldUnit) {
      throw new TypeError('Sản lượng và đơn vị sản lượng phải được nhập cùng nhau hoặc cùng để trống.');
    }
    const payload: JsonRecord = {
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      primaryMediaAssetRef: data.primaryMediaAssetId ?? null,
      yieldQuantity: hasYieldQuantity ? data.targetYield : null,
      yieldUnitId: hasYieldUnit ? await this.resolveUnitId(data.yieldUnit as string) : null,
      yieldNote: null,
      ingredients,
      steps,
    };
    return payload;
  }

  async generateRecipeCode(actor: SessionInfo): Promise<string> {
    const response = record(
      await requestJson('api/v1/recipes/generate-code', this.actorId(actor), { method: 'POST' }),
      'generated recipe code'
    );
    const code = text(response.code, 'generated recipe code.code');
    if (!/^REC-[0-9]{3,}$/.test(code)) {
      throw new TypeError('Recipe Service trả về mã công thức không hợp lệ.');
    }
    return code;
  }

  override async createRecipe(
    actor: SessionInfo,
    data: {
      code: string;
      name: string;
      description?: string;
      targetYield?: number | null;
      yieldUnit?: string | null;
      primaryMediaAssetId?: string;
      ingredients: RecipeIngredient[];
      steps: RecipeStep[];
    }
  ): Promise<RecipeVersion> {
    const recipe = mapRecipeDetail(await requestJson('api/v1/recipes', this.actorId(actor), {
      method: 'POST',
      body: JSON.stringify(await this.recipePayload(data)),
    }));
    this.rememberDraftContext(recipe);
    this.recipesCache.clear();
    return recipe;
  }

  override async saveRecipeDraft(
    actor: SessionInfo,
    recipeId: string,
    data: Partial<RecipeVersion>,
    _expectedRevision: number
  ): Promise<RecipeVersion> {
    const current = await this.getRecipeVersion(actor, recipeId);
    const targetYield = Object.prototype.hasOwnProperty.call(data, 'targetYield')
      ? data.targetYield ?? null
      : current.targetYield;
    const yieldUnit = Object.prototype.hasOwnProperty.call(data, 'yieldUnit')
      ? data.yieldUnit ?? null
      : current.yieldUnit;
    const primaryMediaAssetId = Object.prototype.hasOwnProperty.call(data, 'primaryMediaAssetId')
      ? data.primaryMediaAssetId
      : current.primaryMediaAssetId;
    const recipe = mapRecipeDetail(await requestJson(`api/v1/recipes/${recipeId}`, this.actorId(actor), {
      method: 'PUT',
      body: JSON.stringify(await this.recipePayload({
        code: data.code ?? current.code,
        name: data.name ?? current.name,
        description: data.description ?? current.description,
        targetYield,
        yieldUnit,
        primaryMediaAssetId,
        ingredients: data.ingredients ?? current.ingredients,
        steps: data.steps ?? current.steps,
      })),
    }));
    this.rememberDraftContext(recipe);
    this.recipesCache.clear();
    return recipe;
  }

  async publishRecipe(actor: SessionInfo, recipeId: string): Promise<RecipeVersion> {
    const current = await this.getRecipeVersion(actor, recipeId);
    const response = await requestJson(
      `api/v1/recipes/${recipeId}/versions/${current.versionId}/publish`,
      this.actorId(actor),
      { method: 'POST' }
    );
    this.recipesCache.clear();
    return mapRecipeDetail(response);
  }

  async copyRecipe(
    actor: SessionInfo,
    recipeId: string,
    newCode: string,
    newName: string
  ): Promise<RecipeVersion> {
    const copied = mapRecipeDetail(await requestJson(`api/v1/recipes/${recipeId}/copy`, this.actorId(actor), {
      method: 'POST',
      body: JSON.stringify({ code: newCode, name: newName }),
    }));
    this.recipesCache.clear();
    return copied;
  }

  override async archiveRecipe(actor: SessionInfo, recipeId: string): Promise<RecipeVersion> {
    await requestJson(`api/v1/recipes/${recipeId}`, this.actorId(actor), { method: 'DELETE' });
    this.recipesCache.clear();
    return this.getRecipeVersion(actor, recipeId);
  }

  override async activateRecipe(actor: SessionInfo, recipeId: string): Promise<RecipeVersion> {
    const res = await requestJson(`api/v1/recipes/${recipeId}/activate`, this.actorId(actor), { method: 'PATCH' });
    const recipe = mapRecipeDetail(res);
    this.rememberDraftContext(recipe);
    this.recipesCache.clear();
    return recipe;
  }
  override async getMedia(
    filter?: { source?: MediaSource; state?: MediaState },
    signal?: AbortSignal
  ): Promise<MediaAsset[]> {
    const isDefault = !filter?.source && !filter?.state;
    if (isDefault && this.mediaCache) {
      return this.mediaCache;
    }

    const withAbort = <T>(promise: Promise<T>): Promise<T> => {
      if (!signal) return promise;
      if (signal.aborted) return Promise.reject(new DOMException('This operation was aborted', 'AbortError'));
      const { promise: abortPromise, reject } = Promise.withResolvers<T>();
      signal.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')), { once: true });
      return Promise.race([promise, abortPromise]);
    };

    if (isDefault && this.mediaPromise) {
      return withAbort(this.mediaPromise);
    }

    const fetchPromise = (async () => {
      const params = new URLSearchParams({ page: '1', pageSize: '100' });
      if (filter?.source) params.set('sourceType', filter.source === 'AiIllustration' ? 'ai_illustration' : 'real');
      if (filter?.state) params.set('state', filter.state.toLowerCase());
      const response = record(
        await requestJson(`api/v1/content/media-assets?${params.toString()}`, null, { method: 'GET' }),
        'media page'
      );
      const items = array(response.items, 'media page.items').map((item) => mapMediaAsset(item));
      if (isDefault) {
        this.mediaCache = items;
      }
      return items;
    })();

    if (isDefault) {
      this.mediaPromise = fetchPromise;
      const clearIfSame = () => {
        if (this.mediaPromise === fetchPromise) {
          this.mediaPromise = null;
        }
      };
      fetchPromise.then(clearIfSame, clearIfSame);
    }

    return withAbort(fetchPromise);
  }

  override async getMediaById(id: string): Promise<MediaAsset | null> {
    const preview = this.draftPreviews.get(id);
    if (preview) {
      return {
        id,
        name: `ai-draft-${id}.png`,
        mimeType: preview.type || 'image/png',
        sizeBytes: preview.size,
        blob: preview,
        source: 'AiIllustration',
        state: 'Active',
        tags: [],
        uploadedBy: '',
        createdAt: new Date().toISOString(),
      };
    }
    try {
      return mapMediaAsset(
        await requestJson(`api/v1/content/media-assets/${id}`, null, { method: 'GET' })
      );
    } catch {
      return {
        id,
        name: `ai-draft-${id}.png`,
        mimeType: 'image/png',
        sizeBytes: 0,
        blob: new Blob(),
        deliveryUrl: `/api/backend/api/v1/content/image-drafts/${id}/image`,
        source: 'AiIllustration',
        state: 'Active',
        tags: [],
        uploadedBy: '',
        createdAt: new Date().toISOString(),
      };
    }
  }

  override async uploadMedia(
    actor: SessionInfo,
    file: File | Blob,
    filename: string,
    source: MediaSource,
    tags: string[]
  ): Promise<MediaAsset> {
    if (source !== 'Real') throw new Error('Ảnh AI phải được tạo bằng Image Draft, không thể upload trực tiếp.');
    if (tags.length > 0) console.warn('Content Service chưa hỗ trợ tags.', { tags });
    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('originalFileName', filename);
    const uploaded = await requestJson('api/v1/content/media-assets', this.actorId(actor), {
      method: 'POST',
      body: formData,
    });
    this.mediaCache = null;
    return mapMediaAsset(uploaded);
  }

  override async getMediaReferences(mediaId: string): Promise<MediaReferenceInfo> {
    const response = record(
      await requestJson(`api/v1/content/media-assets/${mediaId}/usages`, null, { method: 'GET' }),
      'media usages'
    );
    return {
      mediaId,
      recipes: array(response.usages, 'media usages.usages').map((value, index) => {
        const usage = record(value, `media usages.usages[${index}]`);
        const stepOrder = optionalNumber(usage.stepOrder, `media usages.usages[${index}].stepOrder`);
        return {
          versionId: text(usage.recipeVersionId, `media usages.usages[${index}].recipeVersionId`),
          recipeCode: '',
          recipeName: text(usage.recipeTitle, `media usages.usages[${index}].recipeTitle`),
          versionLabel: '',
          location: stepOrder ? `Bước ${stepOrder}` : text(usage.usageKind, `media usages.usages[${index}].usageKind`),
        };
      }),
      documents: [],
    };
  }

  override async deleteMedia(_actor: SessionInfo, _mediaId: string): Promise<void> {
    throw new Error('Content Service chưa hỗ trợ xóa media (API hiện trả về 501).');
  }

  override async retryDeleteMedia(_actor: SessionInfo, _mediaId: string): Promise<void> {
    throw new Error('Content Service chưa hỗ trợ thử lại thao tác xóa media.');
  }

  override async generateAiText(_actor: SessionInfo, _prompt: string, _currentText: string): Promise<string> {
    throw new Error('Backend hiện chưa có API tạo nội dung văn bản bằng AI.');
  }

  override async generateAiImageCandidate(
    actor: SessionInfo,
    stepId: string | null | undefined,
    prompt: string,
    targetKind: 'final_product' | 'step_instruction' = 'step_instruction',
    recipeVersionId?: string,
    onProgress?: (info: { attempt: number; state: string; message: string }) => void
  ): Promise<AiCandidate> {
    const isHero = targetKind === 'final_product';
    const resolvedVersionId =
      recipeVersionId ||
      (stepId ? this.draftContexts.get(stepId)?.versionId : undefined) ||
      Array.from(this.draftContexts.values())[0]?.versionId;

    if (!resolvedVersionId) {
      throw new Error('Không xác định được recipe version. Hãy tải lại trang.');
    }

    const created = record(await requestJson('api/v1/content/image-drafts', this.actorId(actor), {
      method: 'POST',
      body: JSON.stringify({
        recipeVersionId: resolvedVersionId,
        recipeStepId: isHero ? null : stepId,
        targetKind,
        userBrief: prompt,
        expectedRecipeRevision: 0,
      }),
    }), 'image draft');
    const draftId = text(created.draftId, 'image draft.draftId');
    let current = created;
    onProgress?.({ attempt: 0, state: 'queued', message: 'Đã gửi yêu cầu vào hàng đợi Redis Streams...' });

    for (let attempt = 1; attempt <= 100; attempt += 1) {
      const state = text(current.state, 'image draft.state').toLowerCase();
      if (state === 'generated') {
        onProgress?.({ attempt, state: 'generated', message: 'Sinh ảnh hoàn tất!' });
        break;
      }
      if (state === 'failed' || state === 'expired') {
        throw new Error(optionalText(current.errorMessage, 'image draft.errorMessage') ?? `Tạo ảnh thất bại: ${state}`);
      }
      onProgress?.({
        attempt,
        state,
        message:
          state === 'processing'
            ? `Worker đang sinh ảnh với AI... (${attempt}s / 100s)`
            : `Đang chờ trong hàng đợi Redis... (${attempt}s / 100s)`,
      });
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1000));
      current = record(
        await requestJson(`api/v1/content/image-drafts/${draftId}`, this.actorId(actor), { method: 'GET' }),
        'image draft'
      );
      if (attempt === 100) throw new Error('Quá thời gian chờ (100 giây). AI chưa hoàn tất sinh ảnh, vui lòng thử lại.');
    }
    this.draftPreviews.set(
      draftId,
      await requestBlob(`api/v1/content/image-drafts/${draftId}/image`, this.actorId(actor), { method: 'GET' })
    );
    return {
      id: draftId,
      stepId: stepId ?? '',
      targetKind,
      prompt,
      mediaAssetId: draftId,
      previewUrl: `/api/backend/api/v1/content/image-drafts/${draftId}/image`,
      state: 'Generated',
      expiresAt: optionalText(current.expiresAt, 'image draft.expiresAt') ?? new Date(Date.now() + 1_800_000).toISOString(),
      createdAt: text(current.createdAt, 'image draft.createdAt'),
    };
  }

  override async acceptAiCandidate(
    actor: SessionInfo,
    candidateId: string,
    recipeId: string,
    stepId?: string | null
  ): Promise<string> {
    const accepted = record(
      await requestJson(`api/v1/content/image-drafts/${candidateId}/accept`, this.actorId(actor), { method: 'POST' }),
      'accepted image draft'
    );
    const mediaAssetId = text(accepted.mediaAssetId, 'accepted image draft.mediaAssetId');
    const previewBlob = this.draftPreviews.get(candidateId);
    if (previewBlob) {
      this.draftPreviews.set(mediaAssetId, previewBlob);
    }
    if (typeof window !== 'undefined') {
      const draftUrl = `/api/backend/api/v1/content/image-drafts/${candidateId}/image`;
      localStorage.setItem(`recipehub_media_url_${mediaAssetId}`, draftUrl);
      localStorage.setItem(`recipehub_media_url_${candidateId}`, draftUrl);
    }
    const current = await this.getRecipeVersion(actor, recipeId);

    if (!stepId) {
      await this.saveRecipeDraft(actor, recipeId, { primaryMediaAssetId: mediaAssetId }, 0);
      return mediaAssetId;
    }

    if (!current.steps.some((step) => step.id === stepId)) {
      throw new Error(`Không tìm thấy bước '${stepId}' trong công thức '${recipeId}'.`);
    }
    const steps = current.steps.map((step) => step.id === stepId
      ? {
          ...step,
          mediaAssetIds: [...(step.mediaAssetIds ?? []).filter((id) => id !== mediaAssetId), mediaAssetId],
          coverMediaAssetId: mediaAssetId,
        }
      : step);
    await this.saveRecipeDraft(actor, recipeId, { steps }, 0);
    return mediaAssetId;
  }

  override async discardAiCandidate(actor: SessionInfo, candidateId: string): Promise<void> {
    await requestJson(`api/v1/content/image-drafts/${candidateId}/discard`, this.actorId(actor), { method: 'POST' });
    this.draftPreviews.delete(candidateId);
  }
}

export const backendRepo = new BackendRepository();
