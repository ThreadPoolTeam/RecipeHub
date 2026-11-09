'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion, Ingredient, RecipeIngredient, RecipeStep, AiCandidate, MediaAsset } from '@/lib/demo/types';
import { Button, Alert } from '@/components/workspace/fields';
import { EditRecipeBasic } from '@/components/recipes/edit-recipe-basic';
import { EditRecipeIngredients } from '@/components/recipes/edit-recipe-ingredients';
import { EditRecipeSop } from '@/components/recipes/edit-recipe-sop';
import { EditRecipeImageRail } from '@/components/recipes/edit-recipe-image-rail';
import { EditRecipeAiDialog } from '@/components/recipes/edit-recipe-ai-dialog';
import { EditRecipeMediaDialog } from '@/components/recipes/edit-recipe-media-dialog';
import { UnitItem } from '@/lib/api/backend-repository';
import {
  PersistentAiDraft,
  getStoredAiDrafts,
  saveStoredAiDraft,
  removeStoredAiDraft,
  syncBackendAiDrafts,
} from '@/lib/ai-draft-storage';
import { requestBlob } from '@/lib/api/client';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Bản published là bất biến: mở trình biên tập sẽ fork thành draft vN+1.
// Gom các lần fork trùng (React StrictMode chạy effect 2 lần) để không tạo 2 version cùng số.
const pendingForks = new Map<string, Promise<RecipeVersion>>();

export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { session, repo, touch } = useDemo();

  // Recipe State
  const [recipe, setRecipe] = useState<RecipeVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<'basic' | 'ingredients' | 'sop'>('basic');

  // Form Fields
  const [code, setCode] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetYield, setTargetYield] = useState('');
  const [yieldUnit, setYieldUnit] = useState('');
  const [availableUnits, setAvailableUnits] = useState<UnitItem[]>([]);

  // Dynamic Lists
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);

  // Notifications & State
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // AI Image Candidate State
  const [isAiImageModalOpen, setIsAiImageModalOpen] = useState(false);
  const [activeStepForImage, setActiveStepForImage] = useState<RecipeStep | null>(null);
  const [imagePrompt, setImagePrompt] = useState('Hình chụp thao tác rót sốt caramel thành hình hoa nghệ thuật trên ly đồ uống.');
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [generatedCandidate, setGeneratedCandidate] = useState<AiCandidate | null>(null);
  const [candidateAssetUrl, setCandidateAssetUrl] = useState<string | null>(null);
  const [aiImageError, setAiImageError] = useState<string | null>(null);
  const [forkNotice, setForkNotice] = useState<string | null>(null);
  const [aiTargetType, setAiTargetType] = useState<'hero' | 'step'>('hero');
  const [aiProgressStatus, setAiProgressStatus] = useState<{ attempt: number; state: string; message: string } | null>(null);
  const [activeDrafts, setActiveDrafts] = useState<PersistentAiDraft[]>([]);
  // Recipe Primary Cover State
  const [primaryMediaAssetId, setPrimaryMediaAssetId] = useState<string | null>(null);
  const [isPickingHeroCover, setIsPickingHeroCover] = useState(false);

  // MediaLibrary Picker Dialog for Step Cover Image
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [pickingStepIndex, setPickingStepIndex] = useState<number | null>(null);
  const [coverPreviews, setCoverPreviews] = useState<Record<string, string>>({});

  // Load Recipe Data
  useEffect(() => {
    if (!session || !id) return;
    let isMounted = true;
    setLoading(true);

    const loadEditableVersion = async () => {
      const latest = await repo.getRecipeVersion(session, id);
      if (latest.status !== 'Published') return latest;
      let fork = pendingForks.get(id);
      if (!fork) {
        fork = repo.saveRecipeDraft(session, id, {}, 0).finally(() => pendingForks.delete(id));
        pendingForks.set(id, fork);
      }
      const draft = await fork;
      if (isMounted) {
        setForkNotice(
          `Đã tạo bản nháp ${draft.versionLabel} từ bản phát hành ${latest.versionLabel}. Bản phát hành vẫn giữ nguyên cho cửa hàng cho tới khi bạn phát hành bản nháp này.`
        );
      }
      return draft;
    };

    Promise.all([
      loadEditableVersion(),
      repo.getIngredients('', '', true),
      repo.getMedia(),
      repo.getUnits(),
    ])
      .then(([rec, ings, mediaList, units]) => {
        if (!isMounted) return;
        setRecipe(rec);

        setCode(rec.code);
        setName(rec.name);
        setDescription(rec.description || '');
        setTargetYield(rec.targetYield === null ? '' : String(rec.targetYield));
        setYieldUnit(rec.yieldUnit ?? '');
        setAvailableUnits(units.filter((unit) => unit.state === 'active'));
        setIngredients(rec.ingredients || []);
        setSteps(rec.steps || []);
        setPrimaryMediaAssetId(rec.primaryMediaAssetId ?? null);
        setAvailableIngredients(ings);

        const previews: Record<string, string> = {};
        mediaList.forEach((m) => {
          if (m.blob && m.blob.size > 0) {
            previews[m.id] = URL.createObjectURL(m.blob);
          } else if (m.deliveryUrl) {
            previews[m.id] = m.deliveryUrl;
          }
        });
        setCoverPreviews(previews);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const e = err as Error;
        setErrorMsg(e.message || 'Không thể tải công thức để chỉnh sửa.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session, repo, id]);

  // Ingredients Helpers
  const handleAddIngredient = () => {
    if (availableIngredients.length === 0) return;
    const first = availableIngredients[0];
    const newEntry: RecipeIngredient = {
      ingredientId: first.id,
      quantity: 10,
      unit: first.defaultUnit,
      order: ingredients.length + 1,
      notes: '',
      stageNote: '',
    };
    setIngredients([...ingredients, newEntry]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index).map((ing, idx) => ({ ...ing, order: idx + 1 })));
  };

  const handleUpdateIngredient = (index: number, patch: Partial<RecipeIngredient>) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], ...patch };
    if (patch.ingredientId) {
      const match = availableIngredients.find((ing) => ing.id === patch.ingredientId);
      if (match) updated[index].unit = match.defaultUnit;
    }
    setIngredients(updated);
  };

  // Steps Helpers
  const handleAddStep = () => {
    const newStep: RecipeStep = {
      id: `step_${Date.now()}_${steps.length + 1}`,
      stepNumber: steps.length + 1,
      title: `Bước ${steps.length + 1}`,
      instruction: '',
      durationSeconds: 30,
      equipment: '',
      completionCriteria: '',
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index).map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  };

  const handleUpdateStep = (index: number, patch: Partial<RecipeStep>) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], ...patch };
    setSteps(updated);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === steps.length - 1)) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...steps];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setSteps(updated.map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  };
  // Prompt suggestion builder based on current recipe data
  const generateSuggestedPrompt = (target: 'hero' | 'step', step?: RecipeStep | null) => {
    if (target === 'hero') {
      const ingNames = ingredients
        .map((i) => availableIngredients.find((a) => a.id === i.ingredientId)?.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
      const desc = description.trim() ? `, ${description.trim().slice(0, 80)}` : '';
      return `Ảnh chụp thành phẩm món ${name || 'đồ uống'}${desc}, thành phần gồm ${ingNames || 'nguyên liệu pha chế tươi'}, phong cách chụp studio đồ uống cao cấp, ly thủy tinh sang trọng, bọt mịn màng, ánh sáng tự nhiên ấm áp, độ phân giải cao.`;
    } else {
      const stepTitle = step?.title || 'thao tác';
      const stepInstruction = step?.instruction || '';
      return `Ảnh cận cảnh quy trình pha chế: Thao tác "${stepTitle}". Chi tiết: ${stepInstruction.slice(0, 100) || 'bước chuẩn bị nguyên liệu và rót tầng tỉ mỉ'}, góc nhìn ngang 45 độ của barista, ánh sáng rõ nét, phong cách chuyên nghiệp.`;
    }
  };

  const getRemainingMinutes = (expiresAt?: string) => {
    if (!expiresAt) return 30;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (60 * 1000)));
  };

  const handleSelectDraft = async (draft: PersistentAiDraft) => {
    let preview = draft.previewUrl;
    if (!preview) {
      try {
        const blob = await requestBlob(`api/v1/content/image-drafts/${draft.id}/image`, null, { method: 'GET' });
        preview = URL.createObjectURL(blob);
        draft.previewUrl = preview;
        setActiveDrafts((prev) => prev.map((item) => (item.id === draft.id ? { ...item, previewUrl: preview } : item)));
      } catch (err) {
        console.error('Failed to load blob preview for draft', draft.id, err);
      }
    }

    setGeneratedCandidate({
      id: draft.id,
      stepId: draft.stepId || undefined,
      targetKind: draft.targetKind,
      prompt: draft.prompt,
      mediaAssetId: draft.mediaAssetId,
      previewUrl: preview,
      state: 'Generated',
      expiresAt: draft.expiresAt,
      createdAt: draft.createdAt,
    });
    setCandidateAssetUrl(preview || null);
    setImagePrompt(draft.prompt);
  };

  // AI Image Triggers
  const handleOpenHeroAiModal = () => {
    setErrorMsg(null);
    setAiTargetType('hero');
    setActiveStepForImage(null);
    setAiImageError(null);
    const versionId = recipe?.versionId || recipe?.id || '';
    const stored = getStoredAiDrafts(versionId, 'final_product');
    setActiveDrafts(stored);

    if (stored.length > 0) {
      handleSelectDraft(stored[0]);
    } else {
      setGeneratedCandidate(null);
      setCandidateAssetUrl(null);
      setImagePrompt(generateSuggestedPrompt('hero'));
    }

    setIsAiImageModalOpen(true);

    if (versionId) {
      syncBackendAiDrafts(versionId, 'final_product')
        .then((remote) => {
          if (remote.length > 0) {
            setActiveDrafts(remote);
            handleSelectDraft(remote[0]);
          }
        })
        .catch((err) => {
          console.error('Failed to sync backend AI drafts for hero', err);
        });
    }
  };

  const handleOpenHeroMediaPicker = () => {
    setIsPickingHeroCover(true);
    setPickingStepIndex(null);
    setIsMediaPickerOpen(true);
  };

  const handleOpenAiImage = (step: RecipeStep) => {
    if (!UUID_PATTERN.test(step.id)) {
      setErrorMsg('Bước này chưa được lưu vào hệ thống. Bạn vui lòng bấm nút "Lưu Bản Nháp" ở góc dưới bên phải trang trước, sau đó bấm lại nút AI này nhé!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrorMsg(null);
    setAiTargetType('step');
    setActiveStepForImage(step);
    setAiImageError(null);
    const versionId = recipe?.versionId || recipe?.id || '';
    const stored = getStoredAiDrafts(versionId, 'step_instruction', step.id);
    setActiveDrafts(stored);

    if (stored.length > 0) {
      handleSelectDraft(stored[0]);
    } else {
      setGeneratedCandidate(null);
      setCandidateAssetUrl(null);
      setImagePrompt(generateSuggestedPrompt('step', step));
    }

    setIsAiImageModalOpen(true);

    if (versionId) {
      syncBackendAiDrafts(versionId, 'step_instruction', step.id)
        .then((remote) => {
          if (remote.length > 0) {
            setActiveDrafts(remote);
            handleSelectDraft(remote[0]);
          }
        })
        .catch((err) => {
          console.error('Failed to sync backend AI drafts for step', err);
        });
    }
  };

  const handleGenerateAiImage = async () => {
    if (!session || !recipe) return;
    try {
      setIsGeneratingAiImage(true);
      setAiImageError(null);
      const isHero = aiTargetType === 'hero';
      const targetStepId = isHero ? null : activeStepForImage?.id;
      const targetKind = isHero ? 'final_product' : 'step_instruction';
      const versionId = recipe.versionId || recipe.id;

      if (!isHero && !targetStepId) {
        setErrorMsg('Vui lòng chọn bước cần tạo ảnh.');
        return;
      }
      setAiProgressStatus({ attempt: 0, state: 'queued', message: 'Đã gửi yêu cầu vào hàng đợi Redis Streams...' });
      const cand = await repo.generateAiImageCandidate(
        session,
        targetStepId,
        imagePrompt,
        targetKind,
        versionId,
        (info) => setAiProgressStatus(info)
      );

      // Determine reliable preview URL
      let previewUrl = cand.previewUrl || '';
      if (!previewUrl) {
        const asset = await repo.getMediaById(cand.mediaAssetId);
        if (asset) {
          previewUrl = asset.deliveryUrl || (asset.blob ? URL.createObjectURL(asset.blob) : '');
        }
      }
      const candidateWithPreview: AiCandidate = {
        ...cand,
        previewUrl,
      };
      setGeneratedCandidate(candidateWithPreview);
      setCandidateAssetUrl(previewUrl || null);
      // Save to persistent storage (survives refresh, auto expires after 30 mins)
      const persistentDraft: PersistentAiDraft = {
        id: cand.id,
        recipeVersionId: versionId,
        targetKind,
        stepId: targetStepId ?? null,
        prompt: imagePrompt,
        mediaAssetId: cand.mediaAssetId,
        previewUrl: previewUrl || '',
        state: 'Generated',
        createdAt: cand.createdAt || new Date().toISOString(),
        expiresAt: cand.expiresAt || new Date(Date.now() + 1_800_000).toISOString(),
      };
      saveStoredAiDraft(persistentDraft);

      const refreshed = getStoredAiDrafts(versionId, targetKind, targetStepId);
      setActiveDrafts(refreshed);
    } catch (err: unknown) {
      const e = err as Error;
      setAiImageError(e.message || 'Lỗi khi sinh ảnh AI Candidate.');
    } finally {
      setIsGeneratingAiImage(false);
      setAiProgressStatus(null);
    }
  };

  const handleAcceptCandidate = async () => {
    if (!session || !recipe || !generatedCandidate) return;
    try {
      setIsGeneratingAiImage(true);
      const isHero = aiTargetType === 'hero';
      const targetStepId = isHero ? null : activeStepForImage?.id;
      const targetKind = isHero ? 'final_product' : 'step_instruction';
      const versionId = recipe.versionId || recipe.id;

      const permanentMediaId = await repo.acceptAiCandidate(session, generatedCandidate.id, recipe.id, targetStepId);

      // Remove accepted draft from storage
      removeStoredAiDraft(generatedCandidate.id);

      if (isHero) {
        setPrimaryMediaAssetId(permanentMediaId);
        if (candidateAssetUrl) {
          setCoverPreviews((prev) => ({ ...prev, [permanentMediaId]: candidateAssetUrl }));
        }
        setSuccessMsg('Đã chấp nhận và đặt làm ảnh bìa thành phẩm thành công!');
      } else if (activeStepForImage) {
        const updatedSteps = steps.map((s) => {
          if (s.id === activeStepForImage.id) {
            return {
              ...s,
              coverMediaAssetId: permanentMediaId,
              mediaAssetIds: Array.from(new Set([...(s.mediaAssetIds || []), permanentMediaId])),
            };
          }
          return s;
        });
        setSteps(updatedSteps);

        if (candidateAssetUrl) {
          setCoverPreviews((prev) => ({ ...prev, [permanentMediaId]: candidateAssetUrl }));
        }
        setSuccessMsg(`Đã gắn ảnh AI vào bước "${activeStepForImage.title || activeStepForImage.stepNumber}" thành công!`);
      }

      touch();
      setIsAiImageModalOpen(false);
      setGeneratedCandidate(null);
      setCandidateAssetUrl(null);

      // Update remaining drafts
      const remaining = getStoredAiDrafts(versionId, targetKind, targetStepId);
      setActiveDrafts(remaining);
    } catch (err: unknown) {
      const e = err as Error;
      setAiImageError(e.message || 'Không thể chấp nhận đề xuất ảnh AI.');
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  const handleDiscardCandidate = async (candidateIdToDiscard?: string) => {
    const idToDiscard = candidateIdToDiscard || generatedCandidate?.id;
    if (!idToDiscard) {
      setIsAiImageModalOpen(false);
      return;
    }
    const versionId = recipe?.versionId || recipe?.id || '';
    const targetKind = aiTargetType === 'hero' ? 'final_product' : 'step_instruction';
    const targetStepId = aiTargetType === 'hero' ? null : activeStepForImage?.id;

    try {
      if (session) {
        await repo.discardAiCandidate(session, idToDiscard);
      }
    } catch {
      // ignore
    }
    removeStoredAiDraft(idToDiscard);

    const remaining = getStoredAiDrafts(versionId, targetKind, targetStepId);
    setActiveDrafts(remaining);

    if (remaining.length > 0) {
      handleSelectDraft(remaining[0]);
    } else {
      setGeneratedCandidate(null);
      setCandidateAssetUrl(null);
    }
  };
  const handleOpenMediaPicker = (stepIndex: number) => {
    setPickingStepIndex(stepIndex);
    setIsMediaPickerOpen(true);
  };

  const handleSelectMediaForStep = (asset: MediaAsset) => {
    const url = asset.blob && asset.blob.size > 0 ? URL.createObjectURL(asset.blob) : (asset.deliveryUrl || '');
    setCoverPreviews((prev) => ({ ...prev, [asset.id]: url }));
    if (isPickingHeroCover) {
      setPrimaryMediaAssetId(asset.id);
      setIsPickingHeroCover(false);
      setIsMediaPickerOpen(false);
      return;
    }

    if (pickingStepIndex === null) return;
    const updated = [...steps];
    const currentStep = updated[pickingStepIndex];
    updated[pickingStepIndex] = {
      ...currentStep,
      coverMediaAssetId: asset.id,
      mediaAssetIds: Array.from(new Set([...(currentStep.mediaAssetIds || []), asset.id])),
    };
    setSteps(updated);
    setIsMediaPickerOpen(false);
  };

  const codeImmutable = recipe?.status === 'Published' || (recipe?.versionNumber ?? 0) > 1;

  const handleGenerateCode = async () => {
    if (!session || !recipe || codeImmutable || generatingCode || saving) return;
    setGeneratingCode(true);
    setCodeError(null);
    try {
      setCode(await repo.generateRecipeCode(session));
      touch();
    } catch (error: unknown) {
      setCodeError(error instanceof Error ? error.message : 'Không thể tạo mã công thức.');
    } finally {
      setGeneratingCode(false);
    }
  };

  // Save Recipe Draft
  const handleSaveRecipe = async () => {
    if (!session || !recipe || generatingCode || saving) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanCode || !cleanName) {
      setErrorMsg('Vui lòng nhập đầy đủ mã và tên công thức.');
      return;
    }
    const hasYieldQuantity = targetYield.trim().length > 0;
    const hasYieldUnit = yieldUnit.trim().length > 0;
    if (hasYieldQuantity !== hasYieldUnit) {
      setErrorMsg('Sản lượng và đơn vị thành phẩm phải được nhập cùng nhau hoặc cùng để trống.');
      return;
    }
    const parsedYield = hasYieldQuantity ? Number(targetYield) : null;
    if (parsedYield !== null && (!Number.isFinite(parsedYield) || parsedYield <= 0)) {
      setErrorMsg('Sản lượng mục tiêu phải là số lớn hơn 0.');
      return;
    }

    try {
      setSaving(true);
      const updated = await repo.saveRecipeDraft(
        session,
        recipe.id,
        {
          code: cleanCode,
          name: cleanName,
          description: description.trim(),
          targetYield: parsedYield,
          yieldUnit: hasYieldUnit ? yieldUnit : null,
          primaryMediaAssetId: primaryMediaAssetId || undefined,
          ingredients: ingredients,
          steps: steps,
        },
        0
      );

      setRecipe(updated);
      setIngredients(updated.ingredients);
      setSteps(updated.steps);
      setSuccessMsg('Đã lưu bản nháp thành công!');
      touch();
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Lỗi khi lưu bản thảo công thức.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="mt-3 text-sm">Đang mở trình biên tập công thức...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <Alert type="error" message={errorMsg || 'Không tìm thấy công thức.'} />
        <Link href="/rnd/recipes">
          <Button variant="secondary">← Danh sách công thức</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1360px] space-y-6 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-medium text-foreground sm:text-4xl">Chỉnh sửa công thức</h1><p className="mt-2 text-sm text-muted-foreground">{recipe.code} · {recipe.versionLabel}</p></div>
        <div className="flex gap-2"><Link href={`/rnd/recipes/${recipe.id}`}><Button variant="secondary">Xem Chi Tiết</Button></Link><Button variant="gold" size="sm" isLoading={saving} disabled={generatingCode} onClick={handleSaveRecipe}><Save className="mr-1 h-4 w-4" strokeWidth={1.5} />Lưu Bản Nháp</Button></div>
      </header>
      {forkNotice && <Alert type="info" message={forkNotice} onClose={() => setForkNotice(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}
      {errorMsg && <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}
      <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)_200px]">
        <nav aria-label="Các phần công thức" className="flex gap-2 overflow-x-auto lg:flex-col lg:border-r lg:border-border lg:pr-5">
          <button type="button" aria-current={activePanel === 'basic' ? 'step' : undefined} aria-controls="edit-panel-basic" onClick={() => setActivePanel('basic')} className={`rounded-md border px-3 py-3 text-left text-sm hover:bg-accent ${activePanel === 'basic' ? 'border-primary bg-accent font-medium text-foreground' : 'border-border'}`}>01&nbsp; Thông tin cơ bản</button>
          <button type="button" aria-current={activePanel === 'ingredients' ? 'step' : undefined} aria-controls="edit-panel-ingredients" onClick={() => setActivePanel('ingredients')} className={`rounded-md border px-3 py-3 text-left text-sm hover:bg-accent ${activePanel === 'ingredients' ? 'border-primary bg-accent font-medium text-foreground' : 'border-border'}`}>02&nbsp; Thành phần &amp; định lượng</button>
          <button type="button" aria-current={activePanel === 'sop' ? 'step' : undefined} aria-controls="edit-panel-sop" onClick={() => setActivePanel('sop')} className={`rounded-md border px-3 py-3 text-left text-sm hover:bg-accent ${activePanel === 'sop' ? 'border-primary bg-accent font-medium text-foreground' : 'border-border'}`}>03&nbsp; Quy trình SOP</button>
          <p className="hidden border-t border-border pt-4 text-xs text-muted-foreground lg:block">{recipe.versionLabel}<br />{ingredients.length} nguyên liệu · {steps.length} bước</p>
        </nav>
        <main className="min-w-0 space-y-10">
          <div id="edit-panel-basic" hidden={activePanel !== 'basic'}>
            <EditRecipeBasic code={code} setCode={setCode} onGenerate={handleGenerateCode} generating={generatingCode} canGenerate={!!session} immutable={codeImmutable} saving={saving} codeError={codeError} name={name} setName={setName} description={description} setDescription={setDescription} targetYield={targetYield} setTargetYield={setTargetYield} yieldUnit={yieldUnit} setYieldUnit={setYieldUnit} availableUnits={availableUnits} />
          </div>
          <div id="edit-panel-ingredients" hidden={activePanel !== 'ingredients'}>
            <EditRecipeIngredients ingredients={ingredients} availableIngredients={availableIngredients} onAdd={handleAddIngredient} onRemove={handleRemoveIngredient} onUpdate={handleUpdateIngredient} />
          </div>
          <div id="edit-panel-sop" hidden={activePanel !== 'sop'}>
            <EditRecipeSop steps={steps} coverPreviews={coverPreviews} onAdd={handleAddStep} onRemove={handleRemoveStep} onUpdate={handleUpdateStep} onMove={handleMoveStep} onPick={handleOpenMediaPicker} onAi={handleOpenAiImage} />
          </div>
        </main>
        <EditRecipeImageRail imageUrl={primaryMediaAssetId ? coverPreviews[primaryMediaAssetId] : undefined} hasImage={!!primaryMediaAssetId} onPick={handleOpenHeroMediaPicker} onAi={handleOpenHeroAiModal} onRemove={() => setPrimaryMediaAssetId(null)} version={recipe.versionLabel} ingredientCount={ingredients.length} stepCount={steps.length} />
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4"><Link href={`/rnd/recipes/${recipe.id}`}><Button variant="secondary">Quay Lại Chi Tiết</Button></Link><Button variant="gold" size="lg" isLoading={saving} disabled={generatingCode} onClick={handleSaveRecipe}><Save className="mr-1.5 h-4 w-4" strokeWidth={1.5} />Lưu Bản Nháp</Button></div>
      <EditRecipeAiDialog isAiImageModalOpen={isAiImageModalOpen} setIsAiImageModalOpen={setIsAiImageModalOpen} isGeneratingAiImage={isGeneratingAiImage} aiTargetType={aiTargetType} activeStepForImage={activeStepForImage} generatedCandidate={generatedCandidate} handleAcceptCandidate={handleAcceptCandidate} aiImageError={aiImageError} imagePrompt={imagePrompt} setImagePrompt={setImagePrompt} generateSuggestedPrompt={generateSuggestedPrompt} handleGenerateAiImage={handleGenerateAiImage} aiProgressStatus={aiProgressStatus} candidateAssetUrl={candidateAssetUrl} handleDiscardCandidate={handleDiscardCandidate} getRemainingMinutes={getRemainingMinutes} activeDrafts={activeDrafts} handleSelectDraft={handleSelectDraft} />
      <EditRecipeMediaDialog isOpen={isMediaPickerOpen} isPickingHeroCover={isPickingHeroCover} onClose={() => { setIsMediaPickerOpen(false); setIsPickingHeroCover(false); }} onSelect={handleSelectMediaForStep} />
    </div>
  );
}
