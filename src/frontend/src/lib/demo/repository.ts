import {
  User,
  SessionInfo,
  Ingredient,
  RecipeVersion,
  RecipeFilter,
  PaginatedResult,
  MediaAsset,
  MediaSource,
  MediaState,
  MediaReferenceInfo,
  AiCandidate,
  DocumentDraft,
  PublishedDocument,
  AuditEntry,
  DemoSettings,
  DemoError,
} from './types';
import {
  getDb,
  getAll,
  getById,
  putRecord,
  deleteRecord,
  resetDatabase,
} from './database';
import { DEMO_PASSWORD, createSvgBlob } from './seed';
import { saveSession, clearSession } from './session';

export class DemoRepository {
  // --- AUTH & SESSION ---
  async login(email: string, password: string): Promise<SessionInfo> {
    if (password !== DEMO_PASSWORD) {
      throw new DemoError('Validation', 'Mật khẩu hoặc email demo không chính xác');
    }

    const users = await getAll<User>('users');
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      throw new DemoError('Validation', 'Mật khẩu hoặc email demo không chính xác');
    }

    if (user.isLocked) {
      throw new DemoError('Forbidden', 'Tài khoản đã bị tạm khóa bởi Quản trị viên');
    }

    const session = saveSession(user);
    await this.logAudit(user.email, user.role, 'LOGIN', 'auth', user.id, {
      message: 'Đăng nhập thành công vào hệ thống demo',
    });

    return session;
  }

  async logout(session: SessionInfo | null): Promise<void> {
    if (session) {
      await this.logAudit(session.email, session.role, 'LOGOUT', 'auth', session.userId, {
        message: 'Đăng xuất khỏi hệ thống demo',
      });
    }
    clearSession();
  }

  async getCurrentUser(session: SessionInfo): Promise<User | null> {
    const user = await getById<User>('users', session.userId);
    if (!user || user.isLocked) {
      clearSession();
      return null;
    }
    return user;
  }

  // --- INGREDIENTS ---
  async getIngredients(query = '', group = '', activeOnly = false): Promise<Ingredient[]> {
    let list = await getAll<Ingredient>('ingredients');
    if (activeOnly) {
      list = list.filter((i) => i.isActive);
    }
    if (group && group !== 'all') {
      list = list.filter((i) => i.group === group);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }

  async createIngredient(
    actor: SessionInfo,
    data: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Ingredient> {
    if (!data.code.trim() || !data.name.trim()) {
      throw new DemoError('Validation', 'Mã và tên nguyên liệu không được để trống');
    }

    const existing = await getAll<Ingredient>('ingredients');
    if (existing.some((i) => i.code.trim().toUpperCase() === data.code.trim().toUpperCase())) {
      throw new DemoError('Conflict', `Mã nguyên liệu ${data.code} đã tồn tại trong hệ thống`);
    }

    const newIng: Ingredient = {
      id: `ing_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      group: data.group || 'Khác',
      defaultUnit: data.defaultUnit || 'ml',
      isActive: data.isActive ?? true,
      costPerUnit: data.costPerUnit || 0,
      description: data.description || '',
      note: data.note || '',
      imageAssetId: data.imageAssetId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await putRecord('ingredients', newIng);
    await this.logAudit(actor.email, actor.role, 'CREATE_INGREDIENT', 'ingredient', newIng.id, {
      code: newIng.code,
      name: newIng.name,
    });
    return newIng;
  }

  async updateIngredient(
    actor: SessionInfo,
    id: string,
    data: Partial<Omit<Ingredient, 'id' | 'createdAt'>>
  ): Promise<Ingredient> {
    const ing = await getById<Ingredient>('ingredients', id);
    if (!ing) throw new DemoError('NotFound', 'Không tìm thấy nguyên liệu');

    if (data.code && data.code.trim().toUpperCase() !== ing.code) {
      const existing = await getAll<Ingredient>('ingredients');
      if (existing.some((i) => i.id !== id && i.code.toUpperCase() === data.code!.trim().toUpperCase())) {
        throw new DemoError('Conflict', `Mã nguyên liệu ${data.code} đã tồn tại`);
      }
    }

    const updated: Ingredient = {
      ...ing,
      ...data,
      code: data.code ? data.code.trim().toUpperCase() : ing.code,
      name: data.name ? data.name.trim() : ing.name,
      updatedAt: new Date().toISOString(),
    };

    await putRecord('ingredients', updated);
    await this.logAudit(actor.email, actor.role, 'UPDATE_INGREDIENT', 'ingredient', id, {
      name: updated.name,
    });
    return updated;
  }

  // --- RECIPES ---
  async getRecipes(actor: SessionInfo, filter: RecipeFilter = {}): Promise<PaginatedResult<RecipeVersion>> {
    let list = await getAll<RecipeVersion>('recipes');

    // Role-based visibility enforcement
    if (actor.role === 'viewer') {
      const user = await getById<User>('users', actor.userId);
      const allowed = new Set(user?.allowedRecipeIds || []);
      list = list.filter((r) => r.status === 'Published' && allowed.has(r.recipeId));
    }

    if (filter.status && filter.status !== 'all') {
      list = list.filter((r) => r.status === filter.status);
    }

    if (filter.creatorEmail) {
      list = list.filter((r) => r.creatorEmail === filter.creatorEmail);
    }

    if (filter.ingredientId) {
      list = list.filter((r) => r.ingredients.some((i) => i.ingredientId === filter.ingredientId));
    }

    if (filter.query?.trim()) {
      const q = filter.query.trim().toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const pageSize = filter.pageSize && filter.pageSize > 0 ? filter.pageSize : 10;
    const total = list.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const pagedItems = list.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: pagedItems,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getRecipeVersion(actor: SessionInfo, idOrRecipeId: string, versionId?: string): Promise<RecipeVersion> {
    const targetId = versionId || idOrRecipeId;
    let recipe = await getById<RecipeVersion>('recipes', targetId);
    if (!recipe) {
      const all = await getAll<RecipeVersion>('recipes');
      recipe = all.find((r) => r.id === targetId || r.versionId === targetId || r.recipeId === targetId) ?? null;
    }
    if (!recipe) throw new DemoError('NotFound', 'Không tìm thấy công thức');
    if (actor.role === 'viewer') {
      const user = await getById<User>('users', actor.userId);
      const allowed = new Set(user?.allowedRecipeIds || []);
      if (recipe.status !== 'Published' || !allowed.has(recipe.recipeId)) {
        throw new DemoError('Forbidden', 'Bạn không có quyền truy cập công thức này');
      }
    }
    return recipe;
  }

  async getRecipeVersions(actor: SessionInfo, recipeId: string): Promise<RecipeVersion[]> {
    const all = await getAll<RecipeVersion>('recipes');
    const target = all.find((r) => r.id === recipeId || r.recipeId === recipeId || r.code === recipeId);
    if (!target) return [];
    const recipeKey = target.recipeId || target.code;
    const matches = all.filter(
      (r) => (r.recipeId && r.recipeId === recipeKey) || r.code === target.code || r.id === recipeId
    );
    return matches.sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async createRecipe(
    actor: SessionInfo,
    data: {
      code: string;
      name: string;
      description?: string;
      targetYield?: number | null;
      yieldUnit?: string | null;
      primaryMediaAssetId?: string;
      ingredients: RecipeVersion['ingredients'];
      steps: RecipeVersion['steps'];
    }
  ): Promise<RecipeVersion> {
    if (actor.role !== 'rnd') {
      throw new DemoError('Forbidden', 'Chỉ chuyên viên R&D mới có quyền tạo công thức');
    }

    if (!data.code.trim() || !data.name.trim()) {
      throw new DemoError('Validation', 'Mã và tên công thức không được để trống');
    }

    const all = await getAll<RecipeVersion>('recipes');
    if (all.some((r) => r.code.trim().toUpperCase() === data.code.trim().toUpperCase())) {
      throw new DemoError('Conflict', `Mã công thức ${data.code} đã tồn tại`);
    }

    const recipeId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const versionId = `ver_${recipeId}_v1`;

    const newVersion: RecipeVersion = {
      id: versionId,
      recipeId,
      versionNumber: 1,
      versionLabel: 'v1.0',
      status: 'Draft',
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      description: data.description || '',
      targetYield: data.targetYield ?? null,
      yieldUnit: data.yieldUnit ?? null,
      primaryMediaAssetId: data.primaryMediaAssetId,
      ingredients: data.ingredients || [],
      steps: data.steps || [],
      creatorId: actor.userId,
      creatorEmail: actor.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await putRecord('recipes', newVersion);
    await this.logAudit(actor.email, actor.role, 'CREATE_RECIPE', 'recipe', versionId, {
      code: newVersion.code,
      name: newVersion.name,
    });
    return newVersion;
  }

  async saveRecipeDraft(
    actor: SessionInfo,
    versionId: string,
    data: Partial<RecipeVersion>,
    _expectedRevision: number
  ): Promise<RecipeVersion> {
    const current = await getById<RecipeVersion>('recipes', versionId);
    if (!current) throw new DemoError('NotFound', 'Không tìm thấy công thức');

    if (current.status !== 'Draft') {
      throw new DemoError('Forbidden', 'Chỉ có thể chỉnh sửa công thức ở trạng thái Bản nháp');
    }

    const updated: RecipeVersion = {
      ...current,
      ...data,
      id: current.id,
      recipeId: current.recipeId,
      versionNumber: current.versionNumber,
      versionLabel: current.versionLabel,
      code: data.code ? data.code.trim().toUpperCase() : current.code,
      name: data.name ? data.name.trim() : current.name,
      updatedAt: new Date().toISOString(),
    };

    await putRecord('recipes', updated);
    await this.logAudit(actor.email, actor.role, 'SAVE_DRAFT', 'recipe', versionId, {
      code: updated.code,
    });
    return updated;
  }

  async publishRecipe(actor: SessionInfo, versionId: string): Promise<RecipeVersion> {
    const current = await getById<RecipeVersion>('recipes', versionId);
    if (!current) throw new DemoError('NotFound', 'Không tìm thấy công thức');

    if (current.status !== 'Draft') {
      throw new DemoError('Conflict', 'Chỉ công thức trạng thái Nháp mới có thể phát hành');
    }

    if (!current.ingredients || current.ingredients.length === 0) {
      throw new DemoError('Validation', 'Công thức cần có ít nhất 1 nguyên liệu định lượng');
    }

    if (!current.steps || current.steps.length === 0) {
      throw new DemoError('Validation', 'Công thức cần có ít nhất 1 bước hướng dẫn (SOP)');
    }

    const updated: RecipeVersion = {
      ...current,
      status: 'Published',
      publishedAt: new Date().toISOString(),
      publishedByUserId: actor.userId,
      updatedAt: new Date().toISOString(),
    };

    await putRecord('recipes', updated);
    await this.logAudit(actor.email, actor.role, 'PUBLISH_RECIPE', 'recipe', versionId, {
      code: updated.code,
    });
    return updated;
  }

  async copyRecipe(
    actor: SessionInfo,
    sourceVersionId: string,
    newCode: string,
    newName: string
  ): Promise<RecipeVersion> {
    const source = await getById<RecipeVersion>('recipes', sourceVersionId);
    if (!source) throw new DemoError('NotFound', 'Không tìm thấy công thức nguồn');

    return this.createRecipe(actor, {
      code: newCode,
      name: newName,
      description: source.description,
      targetYield: source.targetYield,
      yieldUnit: source.yieldUnit,
      primaryMediaAssetId: source.primaryMediaAssetId,
      ingredients: JSON.parse(JSON.stringify(source.ingredients)),
      steps: JSON.parse(JSON.stringify(source.steps)),
    });
  }

  async archiveRecipe(actor: SessionInfo, versionId: string): Promise<RecipeVersion> {
    const current = await getById<RecipeVersion>('recipes', versionId);
    if (!current) throw new DemoError('NotFound', 'Không tìm thấy công thức');
    const updated: RecipeVersion = {
      ...current,
      status: 'Archived',
      updatedAt: new Date().toISOString(),
    };
    await putRecord('recipes', updated);
    await this.logAudit(actor.email, actor.role, 'ARCHIVE_RECIPE', 'recipe', versionId, {
      code: current.code,
      name: current.name,
    });
    return updated;
  }

  async activateRecipe(actor: SessionInfo, versionId: string): Promise<RecipeVersion> {
    const current = await getById<RecipeVersion>('recipes', versionId);
    if (!current) throw new DemoError('NotFound', 'Không tìm thấy công thức');
    const updated: RecipeVersion = {
      ...current,
      status: 'Draft',
      updatedAt: new Date().toISOString(),
    };
    await putRecord('recipes', updated);
    await this.logAudit(actor.email, actor.role, 'ACTIVATE_RECIPE', 'recipe', versionId, {
      code: current.code,
      name: current.name,
    });
    return updated;
  }

  // --- MEDIA ---
  async getMedia(filter?: { source?: MediaSource; state?: MediaState }): Promise<MediaAsset[]> {
    let list = await getAll<MediaAsset>('media');
    if (filter?.source) list = list.filter((m) => m.source === filter.source);
    if (filter?.state) list = list.filter((m) => m.state === filter.state);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getMediaById(id: string): Promise<MediaAsset | null> {
    const m = await getById<MediaAsset>('media', id);
    return m || null;
  }

  async uploadMedia(
    actor: SessionInfo,
    file: File | Blob,
    filename: string,
    source: MediaSource = 'Real',
    tags: string[] = []
  ): Promise<MediaAsset> {
    if (file.size > 5 * 1024 * 1024) {
      throw new DemoError('Validation', 'Dung lượng tệp vượt quá giới hạn 5 MB');
    }

    const id = `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const asset: MediaAsset = {
      id,
      name: filename,
      mimeType: file.type || 'image/jpeg',
      sizeBytes: file.size,
      blob: file,
      source,
      state: 'Active',
      tags,
      uploadedBy: actor.email,
      createdAt: new Date().toISOString(),
    };

    await putRecord('media', asset);
    await this.logAudit(actor.email, actor.role, 'UPLOAD_MEDIA', 'media', id, {
      name: filename,
      source,
    });
    return asset;
  }

  async getMediaReferences(mediaId: string): Promise<MediaReferenceInfo> {
    const recipes = await getAll<RecipeVersion>('recipes');
    const drafts = await getAll<DocumentDraft>('documentDrafts');

    const referencedRecipes: MediaReferenceInfo['recipes'] = [];
    for (const r of recipes) {
      let isRef = false;
      let loc = '';
      for (const step of r.steps) {
        if (step.coverMediaAssetId === mediaId || (step.mediaAssetIds || []).includes(mediaId)) {
          isRef = true;
          loc = `Bước ${step.stepNumber}: ${step.title}`;
          break;
        }
      }
      if (isRef) {
        referencedRecipes.push({
          versionId: r.id,
          recipeCode: r.code,
          recipeName: r.name,
          versionLabel: r.versionLabel,
          location: loc,
        });
      }
    }

    const referencedDocs: MediaReferenceInfo['documents'] = [];
    for (const d of drafts) {
      if (d.coverMediaIdOverride === mediaId) {
        const recipe = recipes.find((r) => r.id === d.sourceVersionId);
        referencedDocs.push({
          documentId: d.id,
          recipeCode: recipe?.code || 'N/A',
          versionLabel: recipe?.versionLabel || 'N/A',
        });
      }
    }

    return {
      mediaId,
      recipes: referencedRecipes,
      documents: referencedDocs,
    };
  }

  async deleteMedia(actor: SessionInfo, mediaId: string): Promise<void> {
    const settings = await this.getSettings();
    const refs = await this.getMediaReferences(mediaId);

    if (refs.recipes.length > 0 || refs.documents.length > 0) {
      const names = refs.recipes.map((r) => `${r.recipeCode} (${r.versionLabel})`).join(', ');
      throw new DemoError('Conflict', `Tệp ảnh đang được sử dụng trong: ${names}. Không thể xóa.`);
    }

    // Simulation error mode check
    if (settings.simulateMediaDeleteFailure) {
      const asset = await getById<MediaAsset>('media', mediaId);
      if (asset) {
        await putRecord('media', { ...asset, state: 'DeleteFailed' });
      }
      throw new DemoError(
        'Conflict',
        'Lỗi mô phỏng: Xóa ảnh thất bại. Tệp đã chuyển sang trạng thái DeleteFailed để thử lại.'
      );
    }

    await deleteRecord('media', mediaId);
    await this.logAudit(actor.email, actor.role, 'DELETE_MEDIA', 'media', mediaId, {
      message: 'Đã xóa tệp media thành công',
    });
  }

  async retryDeleteMedia(actor: SessionInfo, mediaId: string): Promise<void> {
    const asset = await getById<MediaAsset>('media', mediaId);
    if (!asset) throw new DemoError('NotFound', 'Không tìm thấy tệp media');

    const refs = await this.getMediaReferences(mediaId);
    if (refs.recipes.length > 0 || refs.documents.length > 0) {
      throw new DemoError('Conflict', 'Tệp ảnh vẫn đang có liên kết sử dụng, không thể hoàn tất xóa.');
    }

    const settings = await this.getSettings();
    if (settings.simulateMediaDeleteFailure) {
      throw new DemoError('Conflict', 'Chế độ mô phỏng lỗi xóa ảnh vẫn đang bật trong Cài đặt Admin.');
    }

    await deleteRecord('media', mediaId);
    await this.logAudit(actor.email, actor.role, 'RETRY_DELETE_MEDIA', 'media', mediaId, {
      message: 'Thử lại xóa ảnh thành công sau khi tắt mô phỏng lỗi',
    });
  }

  // --- AI SIMULATION ---
  async generateAiText(actor: SessionInfo, prompt: string, currentText: string): Promise<string> {
    const settings = await this.getSettings();
    if (!settings.aiTextEnabled) {
      throw new DemoError('AiUnavailable', 'Tính năng gợi ý văn bản AI đang bị tắt trong hệ thống.');
    }

    if (settings.simulateAiFailure) {
      throw new DemoError('AiUnavailable', 'Lỗi mô phỏng: Máy chủ AI không phản hồi (503 Service Unavailable).');
    }

    await this.logAudit(actor.email, actor.role, 'AI_GENERATE_TEXT', 'recipe', undefined, { prompt });

    return `${currentText}\n\n[Gợi ý chuẩn hóa R&D từ AI]: Cân chỉnh thời gian khuấy ở nhiệt độ ổn định để bọt sữa đạt độ sánh mịn tự nhiên và lưu hương trà lâu hơn.`;
  }

  async generateAiImageCandidate(
    actor: SessionInfo,
    stepId: string | null | undefined,
    prompt: string,
    targetKind: 'final_product' | 'step_instruction' = 'step_instruction',
    recipeVersionId?: string,
    onProgress?: (info: { attempt: number; state: string; message: string }) => void
  ): Promise<AiCandidate> {
    onProgress?.({ attempt: 1, state: 'processing', message: 'Đang khởi tạo ảnh mô phỏng...' });
    const settings = await this.getSettings();
    if (!settings.aiImageEnabled) {
      throw new DemoError('AiUnavailable', 'Tính năng sinh ảnh AI đang bị tắt trong hệ thống.');
    }

    if (settings.simulateAiFailure) {
      throw new DemoError('AiUnavailable', 'Lỗi mô phỏng: Hạn ngạch tạo ảnh AI tạm thời gián đoạn.');
    }

    const mockBlob = createSvgBlob(
      `AI Concept: ${prompt.slice(0, 20)}`,
      '#3B2219',
      '#E8D3B9'
    );

    const asset = await this.uploadMedia(
      actor,
      mockBlob,
      `ai_cand_${Date.now()}.svg`,
      'AiIllustration',
      ['ai-candidate', stepId || recipeVersionId || 'hero']
    );

    const candidate: AiCandidate = {
      id: `aicand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      stepId: stepId ?? '',
      targetKind,
      prompt,
      mediaAssetId: asset.id,
      previewUrl: asset.deliveryUrl,
      state: 'Generated',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    await putRecord('aiCandidates', candidate);
    return candidate;
  }

  async acceptAiCandidate(
    actor: SessionInfo,
    candidateId: string,
    recipeVersionId: string,
    stepId?: string | null
  ): Promise<string> {
    const cand = await getById<AiCandidate>('aiCandidates', candidateId);
    if (!cand) throw new DemoError('NotFound', 'Không tìm thấy candidate AI');

    if (new Date(cand.expiresAt).getTime() < Date.now()) {
      cand.state = 'Expired';
      await putRecord('aiCandidates', cand);
      throw new DemoError('Validation', 'Đề xuất ảnh AI đã hết hạn (hạn 30 phút). Không thể chấp nhận.');
    }

    cand.state = 'Accepted';
    await putRecord('aiCandidates', cand);

    // Attach to recipe
    const recipe = await getById<RecipeVersion>('recipes', recipeVersionId);
    if (recipe && recipe.status === 'Draft') {
      if (!stepId) {
        recipe.primaryMediaAssetId = cand.mediaAssetId;
      } else {
        const step = recipe.steps.find((s) => s.id === stepId);
        if (step) {
          step.coverMediaAssetId = cand.mediaAssetId;
          step.mediaAssetIds = Array.from(new Set([...(step.mediaAssetIds || []), cand.mediaAssetId]));
        }
      }
      await putRecord('recipes', recipe);
    }
    await this.logAudit(actor.email, actor.role, 'AI_ACCEPT_IMAGE', 'recipe', recipeVersionId, {
      candidateId,
      mediaAssetId: cand.mediaAssetId,
    });
    return cand.mediaAssetId;
  }

  async discardAiCandidate(actor: SessionInfo, candidateId: string): Promise<void> {
    const cand = await getById<AiCandidate>('aiCandidates', candidateId);
    if (!cand) return;
    cand.state = 'Discarded';
    await putRecord('aiCandidates', cand);
  }

  // --- DOCUMENTS ---
  async getDocumentDraft(sourceVersionId: string): Promise<DocumentDraft> {
    const existing = await getAll<DocumentDraft>('documentDrafts');
    const draft = existing.find((d) => d.sourceVersionId === sourceVersionId);
    if (draft) return draft;

    const newDraft: DocumentDraft = {
      id: `docdraft_${Date.now()}`,
      sourceVersionId,
      template: 'standard-sop',
      updatedAt: new Date().toISOString(),
    };
    await putRecord('documentDrafts', newDraft);
    return newDraft;
  }

  async saveDocumentDraft(actor: SessionInfo, draft: DocumentDraft): Promise<void> {
    draft.updatedAt = new Date().toISOString();
    await putRecord('documentDrafts', draft);
    await this.logAudit(actor.email, actor.role, 'SAVE_DOCUMENT_DRAFT', 'recipe', draft.sourceVersionId);
  }

  async publishDocument(
    actor: SessionInfo,
    sourceVersionId: string,
    pdfBlob: Blob
  ): Promise<PublishedDocument> {
    const recipe = await getById<RecipeVersion>('recipes', sourceVersionId);
    if (!recipe || recipe.status !== 'Published') {
      throw new DemoError('Conflict', 'Chỉ công thức đã phát hành mới có thể xuất bản tài liệu chính thức');
    }

    const draft = await this.getDocumentDraft(sourceVersionId);

    const published: PublishedDocument = {
      id: `pub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sourceVersionId,
      recipeCode: recipe.code,
      versionLabel: recipe.versionLabel,
      snapshot: {
        recipeVersion: JSON.parse(JSON.stringify(recipe)),
        draft: JSON.parse(JSON.stringify(draft)),
      },
      pdfBlob,
      actorEmail: actor.email,
      createdAt: new Date().toISOString(),
    };

    await putRecord('publishedDocuments', published);
    await this.logAudit(actor.email, actor.role, 'PUBLISH_DOCUMENT', 'recipe', sourceVersionId, {
      recipeCode: recipe.code,
      versionLabel: recipe.versionLabel,
    });
    return published;
  }

  async getPublishedDocument(sourceVersionId: string): Promise<PublishedDocument | null> {
    const all = await getAll<PublishedDocument>('publishedDocuments');
    const docs = all.filter((d) => d.sourceVersionId === sourceVersionId);
    if (docs.length === 0) return null;
    // return latest published document for this version
    docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return docs[0];
  }

  // --- ADMIN & SETTINGS ---
  async getUsers(): Promise<User[]> {
    return getAll<User>('users');
  }

  async createUser(actor: SessionInfo, data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    if (actor.role !== 'admin') throw new DemoError('Forbidden', 'Chỉ Admin mới có quyền tạo tài khoản');

    const users = await getAll<User>('users');
    if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw new DemoError('Conflict', 'Email này đã tồn tại trong hệ thống');
    }

    const newUser: User = {
      id: `user_${Date.now()}`,
      email: data.email.trim().toLowerCase(),
      fullName: data.fullName.trim(),
      role: data.role,
      isLocked: data.isLocked || false,
      allowedRecipeIds: data.allowedRecipeIds || [],
      createdAt: new Date().toISOString(),
    };

    await putRecord('users', newUser);
    await this.logAudit(actor.email, actor.role, 'CREATE_USER', 'user', newUser.id, {
      email: newUser.email,
      role: newUser.role,
    });
    return newUser;
  }

  async updateUser(actor: SessionInfo, id: string, data: Partial<User>): Promise<User> {
    if (actor.role !== 'admin') throw new DemoError('Forbidden', 'Chỉ Admin mới có quyền cập nhật tài khoản');

    const user = await getById<User>('users', id);
    if (!user) throw new DemoError('NotFound', 'Không tìm thấy người dùng');

    const updated: User = {
      ...user,
      ...data,
      id: user.id,
    };

    await putRecord('users', updated);
    await this.logAudit(actor.email, actor.role, 'UPDATE_USER', 'user', id, {
      email: updated.email,
    });
    return updated;
  }

  async toggleUserLock(actor: SessionInfo, id: string): Promise<boolean> {
    if (actor.role !== 'admin') throw new DemoError('Forbidden', 'Chỉ Admin mới có quyền khóa/mở khóa');
    const user = await getById<User>('users', id);
    if (!user) throw new DemoError('NotFound', 'Không tìm thấy người dùng');

    user.isLocked = !user.isLocked;
    await putRecord('users', user);

    await this.logAudit(actor.email, actor.role, user.isLocked ? 'LOCK_USER' : 'UNLOCK_USER', 'user', id, {
      email: user.email,
    });
    return user.isLocked;
  }

  async getSettings(): Promise<DemoSettings> {
    const rec = await getById<DemoSettings & { key: string }>('settings', 'main');
    if (!rec) {
      return {
        idleTimeoutMinutes: 30,
        aiTextEnabled: true,
        aiImageEnabled: true,
        aiProvider: 'mock-gemini',
        simulateAiFailure: false,
        simulateMediaDeleteFailure: false,
      };
    }
    const { key: _key, ...settings } = rec;
    return settings;
  }

  async updateSettings(actor: SessionInfo, data: Partial<DemoSettings>): Promise<DemoSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...data };
    await putRecord('settings', { key: 'main', ...updated });
    await this.logAudit(actor.email, actor.role, 'UPDATE_SETTINGS', 'settings', 'main', updated);
    return updated;
  }


  async resetSystem(actor: SessionInfo): Promise<void> {
    await resetDatabase();
    await this.logAudit(actor.email, actor.role, 'RESET_SYSTEM', 'settings', undefined, {
      message: 'Reset toàn bộ cơ sở dữ liệu về bộ seed ban đầu',
    });
  }

  private async logAudit(
    actorEmail: string,
    actorRole: User['role'],
    action: string,
    targetType: AuditEntry['targetType'],
    targetId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      const entry: AuditEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        actorEmail,
        actorRole,
        action,
        targetType,
        targetId,
        details,
        timestamp: new Date().toISOString(),
      };
      await putRecord('auditLogs', entry);
    } catch {
      // Best-effort audit logging
    }
  }
}

export const repo = new DemoRepository();
