import { requestJson, requestBlob } from '@/lib/api/client';

export interface PersistentAiDraft {
  id: string;
  recipeVersionId: string;
  targetKind: 'final_product' | 'step_instruction';
  stepId: string | null;
  prompt: string;
  mediaAssetId: string;
  previewUrl: string;
  state: string;
  createdAt: string;
  expiresAt: string;
}

const STORAGE_KEY = 'recipehub_ai_drafts';

export function getStoredAiDrafts(
  recipeVersionId: string,
  targetKind: 'final_product' | 'step_instruction',
  stepId?: string | null
): PersistentAiDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all: PersistentAiDraft[] = JSON.parse(raw);
    const now = Date.now();

    // Auto-clean expired drafts (> 30 mins)
    const valid = all.filter((d) => new Date(d.expiresAt).getTime() > now);
    if (valid.length !== all.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }

    return valid
      .filter((d) => {
        if (d.recipeVersionId !== recipeVersionId) return false;
        if (d.targetKind !== targetKind) return false;
        if (targetKind === 'step_instruction') {
          return d.stepId === stepId;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Failed to get stored AI drafts', err);
    return [];
  }
}

export function saveStoredAiDraft(draft: PersistentAiDraft): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: PersistentAiDraft[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const toStore: PersistentAiDraft = {
      ...draft,
      previewUrl: draft.previewUrl.startsWith('blob:') ? '' : draft.previewUrl,
    };
    const updated = [
      toStore,
      ...all.filter((d) => d.id !== draft.id && new Date(d.expiresAt).getTime() > now),
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save stored AI draft', err);
  }
}

export function removeStoredAiDraft(draftId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all: PersistentAiDraft[] = JSON.parse(raw);
    const updated = all.filter((d) => d.id !== draftId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to remove stored AI draft', err);
  }
}

export async function syncBackendAiDrafts(
  recipeVersionId: string,
  targetKind: 'final_product' | 'step_instruction',
  stepId?: string | null
): Promise<PersistentAiDraft[]> {
  if (typeof window === 'undefined') return [];
  let path = `api/v1/content/image-drafts?recipeVersionId=${recipeVersionId}&state=generated&pageSize=20`;
  if (targetKind === 'step_instruction' && stepId) {
    path += `&recipeStepId=${stepId}`;
  }
  const data = (await requestJson(path, null, { method: 'GET' })) as { items?: Array<any> };
  const items = Array.isArray(data?.items) ? data.items : [];
  const now = Date.now();
  const drafts: PersistentAiDraft[] = [];

  for (const item of items) {
    if (!item.draftId) continue;
    const expiresAt = item.expiresAt || new Date(now + 1_800_000).toISOString();
    if (new Date(expiresAt).getTime() <= now) continue;

    const blob = await requestBlob(`api/v1/content/image-drafts/${item.draftId}/image`, null, { method: 'GET' });
    const previewUrl = URL.createObjectURL(blob);

    const draft: PersistentAiDraft = {
      id: item.draftId,
      recipeVersionId,
      targetKind: item.targetKind || targetKind,
      stepId: stepId ?? null,
      prompt: item.prompt || 'Ảnh minh họa AI',
      mediaAssetId: item.draftId,
      previewUrl,
      state: item.state || 'generated',
      createdAt: item.createdAt || new Date().toISOString(),
      expiresAt,
    };
    saveStoredAiDraft(draft);
    drafts.push(draft);
  }
  return drafts;
}
