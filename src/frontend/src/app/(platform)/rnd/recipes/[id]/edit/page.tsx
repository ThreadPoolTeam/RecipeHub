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
} from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion, Ingredient, RecipeIngredient, RecipeStep, AiCandidate, MediaAsset } from '@/lib/demo/types';
import { Button, TextInput, TextArea, Select, Alert } from '@/components/workspace/fields';
import { MediaLibrary } from '@/components/workspace/media-library';
import { Dialog } from '@/components/workspace/dialog';
export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { session, repo, touch } = useDemo();

  // Recipe State
  const [recipe, setRecipe] = useState<RecipeVersion | null>(null);
  const [expectedRevision, setExpectedRevision] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetYield, setTargetYield] = useState<number>(1);
  const [yieldUnit, setYieldUnit] = useState('ly (500ml)');

  // Dynamic Lists
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);

  // Notifications & State
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // AI Text Suggestion Modal State
  const [isAiTextModalOpen, setIsAiTextModalOpen] = useState(false);
  const [activeStepIndexForAi, setActiveStepIndexForAi] = useState<number | null>(null);
  const [aiPrompt, setAiPrompt] = useState('Chuẩn hóa câu văn mô tả kỹ thuật pha chế theo tiêu chuẩn Barista chuyên nghiệp.');
  const [originalText, setOriginalText] = useState('');
  const [suggestedText, setSuggestedText] = useState('');
  const [isGeneratingAiText, setIsGeneratingAiText] = useState(false);
  const [aiTextError, setAiTextError] = useState<string | null>(null);

  // AI Image Candidate State
  const [isAiImageModalOpen, setIsAiImageModalOpen] = useState(false);
  const [activeStepForImage, setActiveStepForImage] = useState<RecipeStep | null>(null);
  const [imagePrompt, setImagePrompt] = useState('Hình chụp thao tác rót sốt caramel thành hình hoa nghệ thuật trên ly đồ uống.');
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [generatedCandidate, setGeneratedCandidate] = useState<AiCandidate | null>(null);
  const [candidateAssetUrl, setCandidateAssetUrl] = useState<string | null>(null);
  const [aiImageError, setAiImageError] = useState<string | null>(null);

  // MediaLibrary Picker Dialog for Step Cover Image
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [pickingStepIndex, setPickingStepIndex] = useState<number | null>(null);

  // Step Cover Previews (mediaAssetId -> blob url)
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
    ])
      .then(([rec, ings, mediaList]) => {
        if (!isMounted) return;
        setRecipe(rec);
        setExpectedRevision(rec.revision);

        setCode(rec.code);
        setName(rec.name);
        setDescription(rec.description || '');
        setTargetYield(rec.targetYield || 1);
        setYieldUnit(rec.yieldUnit || 'ly (500ml)');
        setIngredients(rec.ingredients || []);
        setSteps(rec.steps || []);

        setAvailableIngredients(ings);

        const previews: Record<string, string> = {};
        mediaList.forEach((m) => {
          previews[m.id] = URL.createObjectURL(m.blob);
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

  // AI Text Suggestion Trigger
  const handleOpenAiText = (stepIndex: number) => {
    setActiveStepIndexForAi(stepIndex);
    const text = steps[stepIndex].instruction;
    setOriginalText(text);
    setSuggestedText('');
    setAiTextError(null);
    setIsAiTextModalOpen(true);
  };

  const handleGenerateAiText = async () => {
    if (!session) return;
    try {
      setIsGeneratingAiText(true);
      setAiTextError(null);
      const generated = await repo.generateAiText(session, aiPrompt, originalText);
      setSuggestedText(generated);
    } catch (err: unknown) {
      const e = err as Error;
      setAiTextError(e.message || 'Lỗi khi gọi mô phỏng AI Text.');
    } finally {
      setIsGeneratingAiText(false);
    }
  };

  const handleAcceptAiText = () => {
    if (activeStepIndexForAi === null) return;
    handleUpdateStep(activeStepIndexForAi, { instruction: suggestedText });
    setIsAiTextModalOpen(false);
  };

  // AI Image Candidate Trigger
  const handleOpenAiImage = (step: RecipeStep) => {
    setActiveStepForImage(step);
    setImagePrompt(`Hình minh họa bước: ${step.title} (${recipe?.name})`);
    setGeneratedCandidate(null);
    setCandidateAssetUrl(null);
    setAiImageError(null);
    setIsAiImageModalOpen(true);
  };

  const handleGenerateAiImage = async () => {
    if (!session || !activeStepForImage) return;
    try {
      setIsGeneratingAiImage(true);
      setAiImageError(null);
      const cand = await repo.generateAiImageCandidate(session, activeStepForImage.id, imagePrompt);
      setGeneratedCandidate(cand);

      // fetch candidate media asset blob
      const asset = await repo.getMediaById(cand.mediaAssetId);
      if (asset) {
        setCandidateAssetUrl(URL.createObjectURL(asset.blob));
      }
    } catch (err: unknown) {
      const e = err as Error;
      setAiImageError(e.message || 'Lỗi khi sinh ảnh AI Candidate.');
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  const handleAcceptCandidate = async () => {
    if (!session || !recipe || !generatedCandidate || !activeStepForImage) return;
    try {
      await repo.acceptAiCandidate(session, generatedCandidate.id, recipe.id, activeStepForImage.id);
      // update local step cover
      const updatedSteps = steps.map((s) => {
        if (s.id === activeStepForImage.id) {
          return {
            ...s,
            coverMediaAssetId: generatedCandidate.mediaAssetId,
            mediaAssetIds: Array.from(new Set([...(s.mediaAssetIds || []), generatedCandidate.mediaAssetId])),
          };
        }
        return s;
      });
      setSteps(updatedSteps);

      // Update cover previews map
      if (candidateAssetUrl) {
        setCoverPreviews((prev) => ({ ...prev, [generatedCandidate.mediaAssetId]: candidateAssetUrl }));
      }

      touch();
      setIsAiImageModalOpen(false);
    } catch (err: unknown) {
      const e = err as Error;
      setAiImageError(e.message || 'Không thể chấp nhận đề xuất ảnh AI.');
    }
  };

  const handleDiscardCandidate = async () => {
    if (!session || !generatedCandidate) {
      setIsAiImageModalOpen(false);
      return;
    }
    try {
      await repo.discardAiCandidate(session, generatedCandidate.id);
    } catch {
      // ignore
    } finally {
      setIsAiImageModalOpen(false);
    }
  };

  // MediaLibrary Picker
  const handleOpenMediaPicker = (stepIndex: number) => {
    setPickingStepIndex(stepIndex);
    setIsMediaPickerOpen(true);
  };

  const handleSelectMediaForStep = (asset: MediaAsset) => {
    if (pickingStepIndex === null) return;
    const url = URL.createObjectURL(asset.blob);
    setCoverPreviews((prev) => ({ ...prev, [asset.id]: url }));

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

  // Save Recipe Draft
  const handleSaveRecipe = async () => {
    if (!session || !recipe) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanCode || !cleanName) {
      setErrorMsg('Vui lòng nhập đầy đủ mã và tên công thức.');
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
          targetYield: Number(targetYield) || 1,
          yieldUnit: yieldUnit.trim() || 'ly (500ml)',
          ingredients: ingredients,
          steps: steps,
        },
        expectedRevision
      );

      setRecipe(updated);
      setExpectedRevision(updated.revision);
      setSuccessMsg(`Đã lưu bản nháp thành công! (Revision: #${updated.revision})`);
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
      <div className="p-12 text-center text-zinc-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]" />
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Link href="/rnd/recipes" className="hover:text-zinc-200">
              Công Thức
            </Link>
            <span>/</span>
            <Link href={`/rnd/recipes/${recipe.id}`} className="hover:text-zinc-200 font-mono">
              {recipe.code}
            </Link>
            <span>/</span>
            <span className="text-[#DEBF64]">Biên Tập</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100">Chỉnh Sửa Công Thức</h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800">
              Rev #{expectedRevision}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/rnd/recipes/${recipe.id}`}>
            <Button variant="secondary">Xem Chi Tiết</Button>
          </Link>
          <Button variant="gold" size="sm" isLoading={saving} onClick={handleSaveRecipe}>
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
      <div className="bg-white border border-[#E2DDD2] rounded-xl p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-bold text-[#1C1917] flex items-center gap-2 border-b border-[#E2DDD2] pb-3">
          <FileText className="w-4 h-4 text-[#B47820]" /> 1. Thông Tin Chung &amp; Định Mức Mẻ
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Mã Công Thức *"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            helper="Chữ hoa, duy nhất trên toàn hệ thống"
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
            label="Sản Lượng Mục Tiêu *"
            type="number"
            min={1}
            value={targetYield}
            onChange={(e) => setTargetYield(Math.max(1, Number(e.target.value) || 1))}
          />
          <TextInput
            label="Đơn Vị Thành Phẩm *"
            value={yieldUnit}
            onChange={(e) => setYieldUnit(e.target.value)}
          />
        </div>
      </div>

      {/* 2. Ingredients Builder */}
      <div className="bg-white border border-[#E2DDD2] rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#E2DDD2] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-[#B47820]" /> 2. Thành Phần Nguyên Liệu ({ingredients.length})
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Thay đổi định lượng, đơn vị hoặc giai đoạn sử dụng nguyên liệu.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleAddIngredient}>
            + Thêm Nguyên Liệu
          </Button>
        </div>

        {ingredients.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-zinc-800 rounded-lg text-zinc-400">
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
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg items-end"
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

                <div className="md:col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="w-full"
                    onClick={() => handleRemoveIngredient(idx)}
                    title="Xóa dòng"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Steps Builder with AI & Media features */}
      <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <span>🪜</span> 3. Quy Trình Thao Tác & Hỗ Trợ AI ({steps.length})
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sắp xếp thứ tự bước, nhờ AI gợi ý hoàn thiện mô tả hoặc sinh hình ảnh concept thao tác.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleAddStep}>
            + Thêm Bước
          </Button>
        </div>

        {steps.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-zinc-800 rounded-lg text-zinc-400">
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
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4.5 space-y-3.5 relative"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-6 h-6 rounded-full bg-[#C9A84C]/20 text-[#DEBF64] flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        className="bg-zinc-800/80 border border-zinc-700/60 rounded px-2.5 py-1 text-sm font-semibold text-zinc-100 w-full max-w-sm focus:outline-none focus:border-[#C9A84C]"
                        value={step.title}
                        onChange={(e) => handleUpdateStep(idx, { title: e.target.value })}
                        placeholder="Tiêu đề bước..."
                      />
                    </div>

                    {/* Step Reorder & Delete */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={idx === 0}
                        onClick={() => handleMoveStep(idx, 'up')}
                        title="Đẩy lên"
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={idx === steps.length - 1}
                        onClick={() => handleMoveStep(idx, 'down')}
                        title="Đẩy xuống"
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveStep(idx)}
                        title="Xóa bước này"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Instruction with AI Text Button */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-300">
                        Nội Dung Hướng Dẫn Kỹ Thuật:
                      </label>
                      <button
                        type="button"
                        onClick={() => handleOpenAiText(idx)}
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/60"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> AI Gợi Ý Văn Bản
                      </button>
                    </div>
                    <TextArea
                      value={step.instruction}
                      onChange={(e) => handleUpdateStep(idx, { instruction: e.target.value })}
                      placeholder="Mô tả chi tiết kỹ thuật thực hiện..."
                      rows={2}
                    />
                  </div>

                  {/* Step Attributes */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                    <TextInput
                      label="Thời gian (giây)"
                      type="number"
                      value={step.durationSeconds || ''}
                      onChange={(e) =>
                        handleUpdateStep(idx, {
                          durationSeconds: Number(e.target.value) || undefined,
                        })
                      }
                    />
                    <TextInput
                      label="Nhiệt độ (°C)"
                      type="number"
                      value={step.temperatureCelsius || ''}
                      onChange={(e) =>
                        handleUpdateStep(idx, {
                          temperatureCelsius: Number(e.target.value) || undefined,
                        })
                      }
                    />
                    <TextInput
                      label="Dụng cụ"
                      value={step.equipment || ''}
                      onChange={(e) => handleUpdateStep(idx, { equipment: e.target.value })}
                    />
                    <TextInput
                      label="Tiêu chí hoàn thành"
                      value={step.completionCriteria || ''}
                      onChange={(e) =>
                        handleUpdateStep(idx, { completionCriteria: e.target.value })
                      }
                    />
                  </div>

                  {/* Media & AI Image actions for Step */}
                  <div className="border-t border-zinc-800/80 pt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {coverUrl ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={coverUrl}
                            alt="Cover"
                            className="w-16 h-12 rounded object-cover border border-zinc-700"
                          />
                          <div className="text-xs text-[#78716C]">
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-medium">Đã gắn ảnh minh họa</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUpdateStep(idx, { coverMediaAssetId: undefined })}
                              className="text-rose-500 hover:underline block text-[11px] mt-0.5"
                            >
                              Gỡ ảnh
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500 italic">Chưa gắn ảnh thao tác</span>
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
                        <Sparkles className="w-3.5 h-3.5 mr-1" /> AI Tạo Ảnh Thao Tác
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Floating Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Link href={`/rnd/recipes/${recipe.id}`}>
          <Button variant="secondary">Quay Lại Chi Tiết</Button>
        </Link>
        <Button variant="gold" size="lg" isLoading={saving} onClick={handleSaveRecipe}>
          <Save className="w-4 h-4 mr-1.5" /> Lưu Bản Nháp
        </Button>
      </div>

      {/* AI Text Side-by-Side Comparison Dialog */}
      <Dialog
        isOpen={isAiTextModalOpen}
        onClose={() => {
          if (!isGeneratingAiText) setIsAiTextModalOpen(false);
        }}
        title="✨ Trợ Lý AI: Chuẩn Hóa Văn Bản Kỹ Thuật"
        description="So sánh trực quan giữa nội dung ban đầu và đề xuất hoàn thiện từ trợ lý AI trước khi áp dụng."
        confirmLabel="Áp Dụng Bản Gợi Ý"
        confirmVariant="gold"
        isConfirming={isGeneratingAiText}
        onConfirm={handleAcceptAiText}
      >
        <div className="space-y-4 py-2">
          {aiTextError && <Alert type="error" message={aiTextError} />}

          <div className="space-y-1.5">
            <TextInput
              label="Yêu cầu hiệu chỉnh cho AI (Prompt)"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="VD: Viết lại ngắn gọn, rõ ràng theo tiêu chuẩn barista..."
            />
            <div className="flex justify-end pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGenerateAiText}
                isLoading={isGeneratingAiText}
                className="text-purple-300 border-purple-800"
              >
                Gửi Yêu Cầu Tạo Đề Xuất
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Nội Dung Hiện Tại
              </h4>
              <p className="text-xs text-zinc-300 whitespace-pre-wrap min-h-[90px]">
                {originalText || <span className="italic text-zinc-500">(Đang trống)</span>}
              </p>
            </div>

            <div className="p-3 bg-purple-950/20 border border-purple-800/60 rounded-lg">
              <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Gợi Ý Chuẩn Hóa Từ AI</span>
                {suggestedText && <span className="text-[10px] text-emerald-400">Sẵn sàng</span>}
              </h4>
              <p className="text-xs text-zinc-100 whitespace-pre-wrap min-h-[90px]">
                {suggestedText || (
                  <span className="italic text-zinc-500">
                    Bấm &quot;Gửi Yêu Cầu&quot; để AI đề xuất nội dung chuẩn hóa.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </Dialog>

      {/* AI Image Candidate Dialog */}
      <Dialog
        isOpen={isAiImageModalOpen}
        onClose={() => {
          if (!isGeneratingAiImage) handleDiscardCandidate();
        }}
        title="✨ Tạo Ảnh Minh Họa Concept Bằng AI"
        description="Mô phỏng ảnh thao tác cho bước SOP. Ảnh sẽ được đánh dấu AI Concept với hạn dùng 30 phút trước khi thẩm định."
        confirmLabel="Chấp Nhận & Gắn Ảnh Này"
        confirmVariant="gold"
        isConfirming={isGeneratingAiImage}
        onConfirm={handleAcceptCandidate}
      >
        <div className="space-y-4 py-2">
          {aiImageError && <Alert type="error" message={aiImageError} />}

          <TextInput
            label="Mô Tả Bối Cảnh Ảnh Cần Tạo (Prompt)"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
          />

          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              isLoading={isGeneratingAiImage}
              onClick={handleGenerateAiImage}
              className="text-purple-300 border-purple-800"
            >
              Sinh Ảnh Đề Xuất
            </Button>
          </div>

          {candidateAssetUrl && (
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-300">
                  ✨ Ảnh Đề Xuất Mới (Candidate)
                </span>
                <span className="text-[11px] text-amber-400">Hạn duyệt: 30 phút</span>
              </div>

              <div className="flex justify-center bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                <img
                  src={candidateAssetUrl}
                  alt="Candidate Concept"
                  className="max-h-56 max-w-full rounded object-contain"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="danger" size="sm" onClick={handleDiscardCandidate}>
                  Hủy / Bỏ Qua
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* MediaLibrary Picker Dialog */}
      <Dialog
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        title="Chọn Ảnh Thao Tác Từ Kho Phương Tiện"
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
