'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Save,
  Plus,
  Trash2,
  Sparkles,
  Camera,
  Check,
  X,
  FileText,
  FlaskConical,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Clock,
  Thermometer,
  CheckCircle2,
  Utensils,
  History,
  Image as ImageIcon,
} from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion, Ingredient, RecipeIngredient, RecipeStep, AiCandidate, MediaAsset } from '@/lib/demo/types';
import { Button, TextInput, TextArea, Select, Alert } from '@/components/workspace/fields';
import { CodeInput } from '@/components/workspace/code-input';
import { MediaLibrary } from '@/components/workspace/media-library';
import { Dialog } from '@/components/workspace/dialog';
import { UnitItem } from '@/lib/api/backend-repository';
import {
  PersistentAiDraft,
  getStoredAiDrafts,
  saveStoredAiDraft,
  removeStoredAiDraft,
  syncBackendAiDrafts,
} from '@/lib/ai-draft-storage';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PROMPT_CHIPS = [
  'Ly thủy tinh cao cấp',
  'Tách sứ bọt kem latte art',
  'Góc chụp cận cảnh 45°',
  'Ánh sáng studio ấm áp',
  'Phân tầng màu sắc nghệ thuật',
  'Trang trí lát cam sấy & lá hương thảo',
  'Đá viên pha lê trong suốt',
  'Bọt kem cheese bồng bềnh',
];

export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { session, repo, touch } = useDemo();

  // Recipe State
  const [recipe, setRecipe] = useState<RecipeVersion | null>(null);
  const [loading, setLoading] = useState(true);

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

    Promise.all([
      repo.getRecipeVersion(session, id),
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

  const handleSelectDraft = (draft: PersistentAiDraft) => {
    setGeneratedCandidate({
      id: draft.id,
      stepId: draft.stepId || undefined,
      targetKind: draft.targetKind,
      prompt: draft.prompt,
      mediaAssetId: draft.mediaAssetId,
      previewUrl: draft.previewUrl,
      state: 'Generated',
      expiresAt: draft.expiresAt,
      createdAt: draft.createdAt,
    });
    setCandidateAssetUrl(draft.previewUrl);
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
      syncBackendAiDrafts(versionId, 'final_product').then((remote) => {
        if (remote.length > 0) {
          const refreshed = getStoredAiDrafts(versionId, 'final_product');
          setActiveDrafts(refreshed);
          if (!generatedCandidate && refreshed.length > 0) {
            handleSelectDraft(refreshed[0]);
          }
        }
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
      syncBackendAiDrafts(versionId, 'step_instruction', step.id).then((remote) => {
        if (remote.length > 0) {
          const refreshed = getStoredAiDrafts(versionId, 'step_instruction', step.id);
          setActiveDrafts(refreshed);
          if (!generatedCandidate && refreshed.length > 0) {
            handleSelectDraft(refreshed[0]);
          }
        }
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
      <div className="p-12 text-center text-[#706E68]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B47820]" />
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
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E2D9] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#706E68] mb-1">
            <Link href="/rnd/recipes" className="hover:text-[#1A1917]">
              Công Thức
            </Link>
            <span>/</span>
            <Link href={`/rnd/recipes/${recipe.id}`} className="hover:text-[#1A1917] font-mono">
              {recipe.code}
            </Link>
            <span>/</span>
            <span className="text-[#B47820] font-medium">Biên Tập</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#1A1917] flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-[#B47820]" /> Chỉnh Sửa Công Thức
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/rnd/recipes/${recipe.id}`}>
            <Button variant="secondary">Xem Chi Tiết</Button>
          </Link>
          <Button variant="gold" size="sm" isLoading={saving} disabled={generatingCode} onClick={handleSaveRecipe}>
            <Save className="w-3.5 h-3.5 mr-1" /> Lưu Bản Nháp
          </Button>
        </div>
      </div>

      {successMsg && (
        <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />
      )}
      {errorMsg && (
        <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />
      )}

      {/* 1. Basic Metadata */}
      <div className="bg-white border border-[#E8E2D9] rounded-xl p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-bold text-[#1A1917] flex items-center gap-2 border-b border-[#E8E2D9] pb-3">
          <FileText className="w-4 h-4 text-[#B47820]" /> 1. Thông Tin Chung &amp; Định Mức Mẻ
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CodeInput
            label="Mã Công Thức"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onGenerate={handleGenerateCode}
            generateLabel="Tạo mã công thức"
            generating={generatingCode}
            generateDisabled={!session}
            disabled={codeImmutable || saving}
            helper={codeImmutable
              ? 'Mã được giữ cố định sau lần phát hành đầu tiên; không thể sửa hoặc tạo mã mới.'
              : 'Nhập mã riêng hoặc tạo mã REC-001, REC-002… Mã đã cấp có thể bị bỏ qua nếu không lưu.'}
            error={codeError}
            required
          />
          <TextInput
            label="Tên Công Thức *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <TextArea
          label="Mô Tả & Cảm Quan Vị"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput
            label="Sản Lượng Mục Tiêu"
            type="number"
            min={1}
            value={targetYield}
            onChange={(e) => setTargetYield(e.target.value)}
          />
          <Select
            label="Đơn Vị Thành Phẩm"
            value={yieldUnit}
            onChange={(e) => setYieldUnit(e.target.value)}
            options={[
              { value: '', label: 'Chưa thiết lập' },
              ...availableUnits.map((unit) => ({
                value: unit.code,
                label: `${unit.name} (${unit.code})`,
              })),
            ]}
          />
        </div>

        {/* Cover Image / Hero Image */}
        <div className="pt-4 border-t border-[#E8E2D9]">
          <label className="block text-xs font-semibold text-[#1A1917] mb-2">
            Ảnh Bìa Thành Phẩm Đồ Uống (Hero Cover Image)
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E8E2D9]">
            <div className="w-28 h-28 rounded-xl bg-white border border-[#E8E2D9] overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
              {primaryMediaAssetId && coverPreviews[primaryMediaAssetId] ? (
                <img
                  src={coverPreviews[primaryMediaAssetId]}
                  alt="Ảnh bìa thành phẩm"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#8C887F] p-2 text-center">
                  <Camera className="w-6 h-6 mb-1 text-[#C9A84C]" />
                  <span className="text-[10px]">Chưa có ảnh</span>
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1 min-w-0">
              <p className="text-xs text-[#706E68]">
                Ảnh bìa đại diện cho thành phẩm đồ uống hiển thị trên thẻ menu, danh sách R&amp;D và tài liệu SOP chính thức.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleOpenHeroMediaPicker}
                >
                  <Camera className="w-3.5 h-3.5 mr-1 text-[#706E68]" /> Chọn Từ Thư Viện
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-purple-700 border-purple-300 hover:bg-purple-50"
                  onClick={handleOpenHeroAiModal}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" /> ✨ Tạo Bằng AI
                </Button>
                {primaryMediaAssetId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50"
                    onClick={() => setPrimaryMediaAssetId(null)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Gỡ ảnh
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 2. Ingredients Builder */}
      <div className="bg-white border border-[#E8E2D9] rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#1A1917] flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-[#B47820]" /> 2. Thành Phần Nguyên Liệu ({ingredients.length})
            </h2>
            <p className="text-xs text-[#706E68] mt-0.5">
              Thay đổi định lượng, đơn vị hoặc giai đoạn sử dụng nguyên liệu.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleAddIngredient}>
            + Thêm Nguyên Liệu
          </Button>
        </div>

        {ingredients.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-[#E8E2D9] bg-[#FAF9F5] rounded-xl text-[#706E68]">
            <p className="text-sm">Chưa có nguyên liệu nào.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={handleAddIngredient}
            >
              + Thêm Nguyên Liệu
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {ingredients.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 bg-[#FAF9F5] border border-[#E8E2D9] rounded-xl items-end shadow-2xs hover:border-[#C5BFB1] transition"
              >
                <div className="md:col-span-4">
                  <Select
                    label={`#${idx + 1} Nguyên Liệu`}
                    value={item.ingredientId}
                    onChange={(e) => handleUpdateIngredient(idx, { ingredientId: e.target.value })}
                    options={availableIngredients.map((ing) => ({
                      value: ing.id,
                      label: `${ing.code} - ${ing.name}`,
                    }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <TextInput
                    label="Định Lượng"
                    type="number"
                    min="0.1"
                    step="any"
                    value={item.quantity}
                    onChange={(e) =>
                      handleUpdateIngredient(idx, { quantity: Number(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <TextInput
                    label="Đơn Vị"
                    value={item.unit}
                    onChange={(e) => handleUpdateIngredient(idx, { unit: e.target.value })}
                  />
                </div>

                <div className="md:col-span-3">
                  <TextInput
                    label="Ghi chú giai đoạn"
                    placeholder="VD: Cốt trà nền..."
                    value={item.stageNote || ''}
                    onChange={(e) => handleUpdateIngredient(idx, { stageNote: e.target.value })}
                  />
                </div>

                <div className="md:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(idx)}
                    title="Xóa dòng"
                    className="w-full h-[38px] rounded-xl text-[#8C887F] hover:text-rose-600 hover:bg-rose-50 border border-[#E8E2D9] hover:border-rose-200 transition flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Steps Builder with AI & Media features */}
      <div className="bg-white border border-[#E8E2D9] rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#1A1917] flex items-center gap-2">
              <span className="text-[#B47820]">🪜</span> 3. Quy Trình Thao Tác &amp; Hỗ Trợ AI ({steps.length})
            </h2>
            <p className="text-xs text-[#706E68] mt-0.5">
              Sắp xếp thứ tự bước, nhờ AI gợi ý hoàn thiện mô tả hoặc sinh hình ảnh concept thao tác.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleAddStep}>
            + Thêm Bước
          </Button>
        </div>

        {steps.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-[#E8E2D9] bg-[#FAF9F5] rounded-xl text-[#706E68]">
            <p className="text-sm">Chưa có bước thao tác nào.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={handleAddStep}
            >
              + Tạo Bước Mới
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((step, idx) => {
              const coverUrl = step.coverMediaAssetId ? coverPreviews[step.coverMediaAssetId] : null;

              return (
                <div
                  key={step.id}
                  className="bg-white border border-[#E8E2D9] rounded-2xl shadow-xs overflow-hidden transition-all duration-200 hover:shadow-sm hover:border-[#D5CEBF]"
                >
                  {/* Step Header Bar */}
                  <div className="bg-[#FAF9F5] border-b border-[#E8E2D9] px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-[#B47820] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        className="bg-white border border-[#E8E2D9] rounded-xl px-3.5 py-1.5 text-sm font-semibold text-[#1A1917] w-full max-w-md focus:outline-none focus:border-[#B47820] focus:ring-2 focus:ring-[#B47820]/15 shadow-2xs transition placeholder:text-[#8C887F]"
                        value={step.title}
                        onChange={(e) => handleUpdateStep(idx, { title: e.target.value })}
                        placeholder="Tên bước (VD: Chiết xuất espresso, Đánh bọt sữa...)"
                      />
                    </div>

                    {/* Step Reorder & Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveStep(idx, 'up')}
                        title="Đẩy lên"
                        className="p-1.5 rounded-lg text-[#706E68] hover:text-[#1A1917] hover:bg-white border border-transparent hover:border-[#E8E2D9] disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === steps.length - 1}
                        onClick={() => handleMoveStep(idx, 'down')}
                        title="Đẩy xuống"
                        className="p-1.5 rounded-lg text-[#706E68] hover:text-[#1A1917] hover:bg-white border border-transparent hover:border-[#E8E2D9] disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        title="Xóa bước này"
                        className="p-1.5 rounded-lg text-[#8C887F] hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Step Body */}
                  <div className="p-4 space-y-4">
                    {/* Step instruction */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#1A1917] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#B47820]" />
                        <span>Hướng dẫn thao tác chi tiết <span className="text-rose-500">*</span></span>
                      </label>
                      <textarea
                        className="w-full bg-[#FAF9F5]/50 border border-[#E8E2D9] rounded-xl px-3.5 py-2.5 text-sm text-[#1A1917] placeholder:text-[#8C887F] focus:bg-white focus:border-[#B47820] focus:ring-2 focus:ring-[#B47820]/15 outline-none transition shadow-2xs"
                        value={step.instruction}
                        onChange={(e) => handleUpdateStep(idx, { instruction: e.target.value })}
                        placeholder="Mô tả kỹ thuật ủ trà, đánh bọt, rót tầng hoặc lắc shaker..."
                        rows={2}
                      />
                    </div>

                    {/* Step Attributes - Compact Grid with icons */}
                    <div className="bg-[#FAF9F5] border border-[#E8E2D9] rounded-xl p-3.5">
                      <div className="text-[11px] font-semibold text-[#706E68] uppercase tracking-wider mb-2.5">
                        Thông số kỹ thuật
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs font-medium text-[#706E68] flex items-center gap-1 mb-1">
                            <Clock className="w-3.5 h-3.5 text-[#B47820]" /> Thời gian (giây)
                          </label>
                          <input
                            type="number"
                            placeholder="VD: 30"
                            value={step.durationSeconds || ''}
                            onChange={(e) =>
                              handleUpdateStep(idx, {
                                durationSeconds: Number(e.target.value) || undefined,
                              })
                            }
                            className="w-full bg-white border border-[#E8E2D9] rounded-lg px-3 py-1.5 text-xs text-[#1A1917] placeholder:text-[#8C887F] focus:border-[#B47820] focus:ring-2 focus:ring-[#B47820]/15 outline-none transition shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-[#706E68] flex items-center gap-1 mb-1">
                            <Thermometer className="w-3.5 h-3.5 text-[#B47820]" /> Nhiệt độ (°C)
                          </label>
                          <input
                            type="number"
                            placeholder="VD: 85"
                            value={step.temperatureCelsius || ''}
                            onChange={(e) =>
                              handleUpdateStep(idx, {
                                temperatureCelsius: Number(e.target.value) || undefined,
                              })
                            }
                            className="w-full bg-white border border-[#E8E2D9] rounded-lg px-3 py-1.5 text-xs text-[#1A1917] placeholder:text-[#8C887F] focus:border-[#B47820] focus:ring-2 focus:ring-[#B47820]/15 outline-none transition shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-[#706E68] flex items-center gap-1 mb-1">
                            <Utensils className="w-3.5 h-3.5 text-[#B47820]" /> Dụng cụ cần dùng
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Bình ủ, nhiệt kế"
                            value={step.equipment || ''}
                            onChange={(e) => handleUpdateStep(idx, { equipment: e.target.value })}
                            className="w-full bg-white border border-[#E8E2D9] rounded-lg px-3 py-1.5 text-xs text-[#1A1917] placeholder:text-[#8C887F] focus:border-[#B47820] focus:ring-2 focus:ring-[#B47820]/15 outline-none transition shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-[#706E68] flex items-center gap-1 mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#B47820]" /> Tiêu chí hoàn thành
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Cốt trà sánh, thơm đậm"
                            value={step.completionCriteria || ''}
                            onChange={(e) =>
                              handleUpdateStep(idx, { completionCriteria: e.target.value })
                            }
                            className="w-full bg-white border border-[#E8E2D9] rounded-lg px-3 py-1.5 text-xs text-[#1A1917] placeholder:text-[#8C887F] focus:border-[#B47820] focus:ring-2 focus:ring-[#B47820]/15 outline-none transition shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                  {/* Media & AI Image actions for Step */}
                  <div className="border-t border-[#E2DDD2] pt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {coverUrl ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={coverUrl}
                            alt="Cover"
                            className="w-16 h-12 rounded-md object-cover border border-[#E2DDD2] shadow-2xs"
                          />
                          <div className="text-xs text-[#78716C]">
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-medium">Đã gắn ảnh thao tác</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUpdateStep(idx, { coverMediaAssetId: undefined })}
                              className="text-rose-600 hover:underline block text-[11px] mt-0.5"
                            >
                              Gỡ ảnh
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[#A8A29E] italic">Chưa gắn ảnh thao tác</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenMediaPicker(idx)}
                      >
                        <Camera className="w-3.5 h-3.5 mr-1" /> Chọn từ Thư Viện
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                        onClick={() => handleOpenAiImage(step)}
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" /> AI Tạo Ảnh Thao Tác
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* Bottom Floating Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E2DDD2]">
        <Link href={`/rnd/recipes/${recipe.id}`}>
          <Button variant="secondary">Quay Lại Chi Tiết</Button>
        </Link>
        <Button variant="gold" size="lg" isLoading={saving} disabled={generatingCode} onClick={handleSaveRecipe}>
          <Save className="w-4 h-4 mr-1.5" /> Lưu Bản Nháp
        </Button>
      </div>

      {/* AI Image Candidate Dialog */}
      <Dialog
        isOpen={isAiImageModalOpen}
        onClose={() => {
          if (!isGeneratingAiImage) setIsAiImageModalOpen(false);
        }}
        title={aiTargetType === 'hero' ? '✨ Tạo Ảnh Bìa Thành Phẩm Bằng AI' : '✨ Tạo Ảnh Minh Họa Concept Bằng AI'}
        description={
          aiTargetType === 'hero'
            ? 'Mô phỏng hình ảnh đồ uống thành phẩm hoàn chỉnh để làm ảnh đại diện công thức.'
            : `Mô phỏng ảnh thao tác cho bước: "${activeStepForImage?.title || 'bước'}". Ảnh lưu tạm 30 phút, tự động xóa khi hết hạn.`
        }
        confirmLabel={aiTargetType === 'hero' ? 'Chấp Nhận & Đặt Làm Ảnh Bìa' : 'Chấp Nhận & Gắn Ảnh Này'}
        confirmVariant="gold"
        isConfirming={isGeneratingAiImage}
        onConfirm={generatedCandidate ? handleAcceptCandidate : undefined}
        maxWidth="4xl"
      >
        <div className="py-1">
          {aiImageError && <Alert type="error" message={aiImageError} />}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-1">
            {/* Left Column: Prompt, suggestions & generation trigger */}
            <div className="lg:col-span-5 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#1A1917]">
                    Mô Tả Bối Cảnh Ảnh Cần Tạo (Prompt)
                  </label>
                  <button
                    type="button"
                    onClick={() => setImagePrompt(generateSuggestedPrompt(aiTargetType, activeStepForImage))}
                    className="text-xs text-[#B47820] hover:text-[#9E6714] font-medium flex items-center gap-1 hover:underline transition cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Gợi ý từ công thức
                  </button>
                </div>

                <TextArea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={4}
                  placeholder="Nhập mô tả bối cảnh hình ảnh..."
                />
              </div>

              {/* Quick Suggestion Chips */}
              <div>
                <div className="text-[11px] font-medium text-[#706E68] mb-1.5 flex items-center gap-1">
                  <span>Gợi ý chi tiết thêm:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setImagePrompt((prev) => (prev.trim() ? `${prev.trim()}, ${chip}` : chip));
                      }}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-[#FAF9F5] hover:bg-[#F5F0E8] text-[#706E68] hover:text-[#1A1917] border border-[#E8E2D9] transition cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trigger Generation Button */}
              <Button
                variant="gold"
                size="md"
                isLoading={isGeneratingAiImage}
                onClick={handleGenerateAiImage}
                className="w-full flex items-center justify-center font-semibold"
              >
                <Sparkles className="w-4 h-4 mr-2" /> Bắt Đầu Tạo Ảnh Với AI
              </Button>

              {/* Asynchronous Progress Indicator */}
              {isGeneratingAiImage && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-2.5 animate-pulse">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-900 flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#B47820]"></span>
                      </span>
                      {aiProgressStatus?.message || 'Đang gửi yêu cầu vào hàng đợi Redis Streams...'}
                    </span>
                    <span className="font-mono text-[#B47820] font-bold">{aiProgressStatus?.attempt || 0}s / 100s</span>
                  </div>
                  <div className="w-full bg-amber-200/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#B47820] h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(8, (aiProgressStatus?.attempt || 1)))}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#706E68] leading-relaxed">
                    Đang chạy qua Redis Streams & Worker. Tối đa 100 giây. Bạn có thể giữ mở hoặc refresh lại mà không mất ảnh đề xuất.
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Active Preview & Drafts Gallery */}
            <div className="lg:col-span-7 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1A1917] uppercase tracking-wider">
                  Xem Trước Ảnh Đề Xuất
                </span>
                {generatedCandidate && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[#B47820] font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Còn lại ~{getRemainingMinutes(generatedCandidate.expiresAt)} phút (auto xóa khi hết hạn)
                  </span>
                )}
              </div>

              {/* Main Preview Box */}
              <div className="rounded-xl border border-[#E8E2D9] bg-[#FAF9F5] p-3 overflow-hidden min-h-[260px] flex flex-col justify-center items-center relative">
                {candidateAssetUrl ? (
                  <div className="w-full space-y-2.5">
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-[#E2DDD2] bg-zinc-950 flex items-center justify-center shadow-inner">
                      <img
                        src={candidateAssetUrl}
                        alt="AI Concept"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        AI Concept • Chưa áp dụng
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-3 pt-1">
                      <p className="text-xs text-[#706E68] line-clamp-2 italic">
                        "{generatedCandidate?.prompt || imagePrompt}"
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDiscardCandidate(generatedCandidate?.id)}
                        className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 shrink-0 font-medium hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Bỏ đề xuất này
                      </button>
                    </div>
                  </div>
                ) : isGeneratingAiImage ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center animate-bounce">
                      <Sparkles className="w-6 h-6 text-[#B47820]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1A1917]">AI đang phác thảo hình ảnh...</div>
                      <div className="text-xs text-[#706E68] mt-0.5">Worker đang kết xuất chi tiết theo prompt</div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-[#8C887F]">
                    <ImageIcon className="w-10 h-10 opacity-40 stroke-1" />
                    <p className="text-xs max-w-xs">
                      Chưa có ảnh đề xuất nào cho mục này. Nhập prompt bên trái và bấm <strong>"Bắt Đầu Tạo Ảnh Với AI"</strong> để sinh ảnh mới.
                    </p>
                  </div>
                )}
              </div>

              {/* Kho ảnh đề xuất (Persistent across refresh, auto deleted when expired) */}
              {activeDrafts.length > 0 && (
                <div className="pt-2 border-t border-[#E8E2D9] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1A1917] flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#B47820]" />
                      Kho ảnh đề xuất tạm thời ({activeDrafts.length})
                    </span>
                    <span className="text-[10px] text-[#706E68]">
                      Lưu giữ 30 phút • Click để chọn
                    </span>
                  </div>

                  <div className="flex gap-2.5 overflow-x-auto py-1">
                    {activeDrafts.map((d) => {
                      const isSelected = candidateAssetUrl === d.previewUrl || generatedCandidate?.id === d.id;
                      const mins = getRemainingMinutes(d.expiresAt);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => handleSelectDraft(d)}
                          className={`w-20 h-16 rounded-xl border overflow-hidden shrink-0 transition cursor-pointer relative group ${
                            isSelected
                              ? 'ring-2 ring-[#B47820] border-[#B47820] shadow-sm'
                              : 'border-[#E8E2D9] hover:border-[#B47820] opacity-80 hover:opacity-100'
                          }`}
                          title={`Prompt: ${d.prompt}\nCòn lại: ~${mins} phút`}
                        >
                          <img src={d.previewUrl} alt={d.prompt} className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-mono py-0.5 text-center">
                            {mins}p
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#B47820] text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Dialog>

      {/* MediaLibrary Picker Dialog */}
      <Dialog
        isOpen={isMediaPickerOpen}
        onClose={() => {
          setIsMediaPickerOpen(false);
          setIsPickingHeroCover(false);
        }}
        title={isPickingHeroCover ? 'Chọn Ảnh Bìa Thành Phẩm Từ Thư Viện' : 'Chọn Ảnh Thao Tác Từ Kho Phương Tiện'}
        description="Chọn ảnh thực tế hoặc ảnh AI minh họa đã lưu trong thư viện."
      >
        <div className="max-h-[70vh] overflow-y-auto py-2">
          <MediaLibrary
            mode="picker"
            onSelect={handleSelectMediaForStep}
          />
        </div>
      </Dialog>
    </div>
  );
}
