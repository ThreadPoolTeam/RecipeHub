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
} from '@/lib/demo/types';
import { requestBlob, requestExternalBlob, requestJson } from './client';

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
  return {
    id: text(item.id, 'recipe summary.id'),
    recipeId: text(item.id, 'recipe summary.id'),
    versionId: text(item.versionId, 'recipe summary.versionId'),
    versionNumber,
    versionLabel: `v${versionNumber}.0`,
    status: mapStatus(text(item.versionStatus, 'recipe summary.versionStatus'), text(item.state, 'recipe summary.state')),
    name: text(item.name, 'recipe summary.name'),
    code: text(item.code, 'recipe summary.code'),
    targetYield: null,
    yieldUnit: null,
    ingredients: [],
    steps: [],
    creatorId: '',
    creatorEmail: '',
    createdAt: updatedAt,
    updatedAt,
  };
}

async function mapMediaAsset(value: unknown, actorId: string | null): Promise<MediaAsset> {
  const item = record(value, 'media asset');
  const id = text(item.assetId, 'media asset.assetId');
  const deliveryUrl = text(item.deliveryUrl, 'media asset.deliveryUrl');
  const blob = /^https?:\/\//i.test(deliveryUrl)
    ? await requestExternalBlob(deliveryUrl)
    : await requestBlob(deliveryUrl.replace(/^\//, ''), actorId, { method: 'GET' });
  return {
    id,
    name: optionalText(item.originalFileName, 'media asset.originalFileName') ?? id,
    mimeType: text(item.mimeType, 'media asset.mimeType'),
    sizeBytes: numberValue(item.byteSize, 'media asset.byteSize'),
    blob,
    source: text(item.sourceType, 'media asset.sourceType').toLowerCase().includes('ai') ? 'AiIllustration' : 'Real',
    state: 'Active',
    tags: [],
    uploadedBy: '',
    createdAt: text(item.createdAt, 'media asset.createdAt'),
    deliveryUrl,
  };
}

export class BackendRepository extends DemoRepository {
  private categories: CatalogItem[] | null = null;
  private unitCategories: CatalogItem[] | null = null;
  private units: UnitItem[] | null = null;
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
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actor.userId)) {
      return actor.userId;
    }
    const knownActors: Record<string, string> = {
      'rd@recipehub.demo': '00000000-0000-0000-0000-000000000101',
      'viewer@recipehub.demo': '00000000-0000-0000-0000-000000000102',
      'admin@recipehub.demo': '00000000-0000-0000-0000-000000000103',
    };
    const mapped = knownActors[actor.email.toLowerCase()];
    if (!mapped) throw new Error(`Tài khoản ${actor.email} chưa có UUID để gọi backend.`);
    return mapped;
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
    const response = await requestJson('api/v1/recipes/units', null, { method: 'GET' });
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

  override async getIngredients(query?: string, group?: string, activeOnly?: boolean): Promise<Ingredient[]> {
    const effectiveQuery = query ?? '';
    const effectiveGroup = group ?? '';
    const onlyActive = activeOnly ?? false;
    const params = new URLSearchParams();
    if (effectiveQuery.trim()) params.set('query', effectiveQuery.trim());
    if (onlyActive) params.set('state', 'active');
    if (effectiveGroup && effectiveGroup !== 'all') params.set('categoryId', await this.resolveCategoryId(effectiveGroup));
    const suffix = params.size ? `?${params.toString()}` : '';
    const response = await requestJson(`api/v1/recipes/ingredients${suffix}`, null, { method: 'GET' });
    return array(response, 'ingredients').map((entry, index) =>
      mapIngredient(entry, `ingredients[${index}]`)
    );
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
    return {
      items: array(response.items, 'recipes page.items').map(mapRecipeSummary),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  override async getRecipeVersion(actor: SessionInfo, recipeId: string): Promise<RecipeVersion> {
    const recipe = mapRecipeDetail(
      await requestJson(`api/v1/recipes/${recipeId}`, this.actorId(actor), { method: 'GET' })
    );
    this.rememberDraftContext(recipe);
    return recipe;
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
    return recipe;
  }

  async publishRecipe(actor: SessionInfo, recipeId: string): Promise<RecipeVersion> {
    const current = await this.getRecipeVersion(actor, recipeId);
    const response = await requestJson(
      `api/v1/recipes/${recipeId}/versions/${current.versionId}/publish`,
      this.actorId(actor),
      { method: 'POST' }
    );
    return mapRecipeDetail(response);
  }

  async copyRecipe(
    actor: SessionInfo,
    recipeId: string,
    newCode: string,
    newName: string
  ): Promise<RecipeVersion> {
    return mapRecipeDetail(await requestJson(`api/v1/recipes/${recipeId}/copy`, this.actorId(actor), {
      method: 'POST',
      body: JSON.stringify({ code: newCode, name: newName }),
    }));
  }

  override async archiveRecipe(actor: SessionInfo, recipeId: string): Promise<RecipeVersion> {
    await requestJson(`api/v1/recipes/${recipeId}`, this.actorId(actor), { method: 'DELETE' });
    return this.getRecipeVersion(actor, recipeId);
  }

  override async activateRecipe(actor: SessionInfo, recipeId: string): Promise<RecipeVersion> {
    const res = await requestJson(`api/v1/recipes/${recipeId}/activate`, this.actorId(actor), { method: 'PATCH' });
    const recipe = mapRecipeDetail(res);
    this.rememberDraftContext(recipe);
    return recipe;
  }

  override async getMedia(filter?: { source?: MediaSource; state?: MediaState }): Promise<MediaAsset[]> {
    const params = new URLSearchParams({ page: '1', pageSize: '100' });
    if (filter?.source) params.set('sourceType', filter.source === 'AiIllustration' ? 'ai_illustration' : 'real');
    if (filter?.state) params.set('state', filter.state.toLowerCase());
    const response = record(
      await requestJson(`api/v1/content/media-assets?${params.toString()}`, null, { method: 'GET' }),
      'media page'
    );
    return Promise.all(array(response.items, 'media page.items').map((item) => mapMediaAsset(item, null)));
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
    return mapMediaAsset(
      await requestJson(`api/v1/content/media-assets/${id}`, null, { method: 'GET' }),
      null
    );
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
    return mapMediaAsset(await requestJson('api/v1/content/media-assets', this.actorId(actor), {
      method: 'POST',
      body: formData,
    }), this.actorId(actor));
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
    stepId: string,
    prompt: string
  ): Promise<AiCandidate> {
    const context = this.draftContexts.get(stepId);
    if (!context) throw new Error('Không xác định được recipe version của bước đang chọn. Hãy tải lại trang.');
    const created = record(await requestJson('api/v1/content/image-drafts', this.actorId(actor), {
      method: 'POST',
      body: JSON.stringify({
        recipeVersionId: context.versionId,
        recipeStepId: stepId,
        targetKind: 'step_instruction',
        userBrief: prompt,
        expectedRecipeRevision: 0,
      }),
    }), 'image draft');
    const draftId = text(created.draftId, 'image draft.draftId');
    let current = created;
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      const state = text(current.state, 'image draft.state').toLowerCase();
      if (state === 'generated') break;
      if (state === 'failed' || state === 'expired') {
        throw new Error(optionalText(current.errorMessage, 'image draft.errorMessage') ?? `Tạo ảnh thất bại: ${state}`);
      }
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1000));
      current = record(
        await requestJson(`api/v1/content/image-drafts/${draftId}`, this.actorId(actor), { method: 'GET' }),
        'image draft'
      );
      if (attempt === 30) throw new Error('Image Draft chưa hoàn tất sau 30 giây. Hãy thử lại sau.');
    }
    this.draftPreviews.set(
      draftId,
      await requestBlob(`api/v1/content/image-drafts/${draftId}/image`, this.actorId(actor), { method: 'GET' })
    );
    return {
      id: draftId,
      stepId,
      prompt,
      mediaAssetId: draftId,
      state: 'Generated',
      expiresAt: optionalText(current.expiresAt, 'image draft.expiresAt') ?? new Date(Date.now() + 1_800_000).toISOString(),
      createdAt: text(current.createdAt, 'image draft.createdAt'),
    };
  }

  override async acceptAiCandidate(
    actor: SessionInfo,
    candidateId: string,
    recipeId: string,
    stepId: string
  ): Promise<void> {
    const accepted = record(
      await requestJson(`api/v1/content/image-drafts/${candidateId}/accept`, this.actorId(actor), { method: 'POST' }),
      'accepted image draft'
    );
    const mediaAssetId = text(accepted.mediaAssetId, 'accepted image draft.mediaAssetId');
    const current = await this.getRecipeVersion(actor, recipeId);
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
  }

  override async discardAiCandidate(actor: SessionInfo, candidateId: string): Promise<void> {
    await requestJson(`api/v1/content/image-drafts/${candidateId}/discard`, this.actorId(actor), { method: 'POST' });
    this.draftPreviews.delete(candidateId);
  }
}

export const backendRepo = new BackendRepository();
