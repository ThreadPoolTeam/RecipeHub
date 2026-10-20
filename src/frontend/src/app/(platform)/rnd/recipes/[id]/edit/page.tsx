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
} from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion, Ingredient, RecipeIngredient, RecipeStep, AiCandidate, MediaAsset } from '@/lib/demo/types';
import { Button, TextInput, TextArea, Select, Alert } from '@/components/workspace/fields';
import { MediaLibrary } from '@/components/workspace/media-library';
import { Dialog } from '@/components/workspace/dialog';
import { UnitItem } from '@/lib/api/backend-repository';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

  // AI Image Candidate Trigger
  const handleOpenAiImage = (step: RecipeStep) => {
    if (!UUID_PATTERN.test(step.id)) {
      setErrorMsg('Bước này chưa được lưu vào hệ thống. Bạn vui lòng bấm nút "Lưu Bản Nháp" ở góc dưới bên phải trang trước, sau đó bấm lại nút AI này nhé!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrorMsg(null);
    setActiveStepForImage(step);
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
            <h1 className="text-2xl font-bold text-[#1A1917]">Chỉnh Sửa Công Thức</h1>
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
      <div className="bg-white border border-[#E8E2D9] rounded-xl p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-bold text-[#1A1917] flex items-center gap-2 border-b border-[#E8E2D9] pb-3">
          <FileText className="w-4 h-4 text-[#B47820]" /> 1. Thông Tin Chung &amp; Định Mức Mẻ
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Mã Công Thức *"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={recipe.status === 'Published' || recipe.versionNumber > 1}
            helper={recipe.status === 'Published' || recipe.versionNumber > 1
              ? 'Mã được giữ cố định sau lần phát hành đầu tiên.'
              : 'Chữ hoa, duy nhất trên toàn hệ thống'}
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
        <Button variant="gold" size="lg" isLoading={saving} onClick={handleSaveRecipe}>
          <Save className="w-4 h-4 mr-1.5" /> Lưu Bản Nháp
        </Button>
      </div>

      {/* AI Image Candidate Dialog */}
      <Dialog
        isOpen={isAiImageModalOpen}
        onClose={() => {
          if (!isGeneratingAiImage) handleDiscardCandidate();
        }}
        title="✨ Tạo Ảnh Minh Họa Concept Bằng AI"
        description="Mô phỏng ảnh thao tác cho bước SOP. Ảnh được đánh dấu AI Concept và có hạn dùng 30 phút trước khi chấp nhận."
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
            <div className="p-4 bg-[#FAF9F5] border border-[#E2DDD2] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-700">
                  ✨ Ảnh Đề Xuất Mới (Candidate)
                </span>
                <span className="text-[11px] text-[#B47820] font-medium">Hạn duyệt: 30 phút</span>
              </div>

              <div className="flex justify-center bg-white p-3 rounded-lg border border-[#E2DDD2]">
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
