'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  FlaskConical,
  ListOrdered,
  Plus,
  ArrowUp,
  ArrowDown,
  X,
  Sparkles,
  Check,
} from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Ingredient, RecipeIngredient, RecipeStep } from '@/lib/demo/types';
import { Button, TextInput, TextArea, Select, Alert } from '@/components/workspace/fields';
export default function NewRecipePage() {
  const router = useRouter();
  const { session, repo, touch } = useDemo();

  // Basic Info
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetYield, setTargetYield] = useState<number>(1);
  const [yieldUnit, setYieldUnit] = useState('ly (500ml)');

  // Ingredients State
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  // Steps State
  const [steps, setSteps] = useState<RecipeStep[]>([
    {
      id: `step_${Date.now()}_1`,
      stepNumber: 1,
      title: 'Chuẩn bị nguyên liệu & dụng cụ',
      instruction: 'Đo lường định lượng các nguyên vật liệu chính xác theo bảng thành phần.',
      durationSeconds: 60,
      equipment: 'Cân tiểu ly, ca đong',
      completionCriteria: 'Đầy đủ nguyên liệu theo định lượng',
    },
  ]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load available ingredients
  useEffect(() => {
    let isMounted = true;
    repo.getIngredients('', '', true).then((items) => {
      if (isMounted) setAvailableIngredients(items);
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [repo]);

  // Ingredient Helpers
  const handleAddIngredient = () => {
    if (availableIngredients.length === 0) return;
    const defaultItem = availableIngredients[0];
    const newEntry: RecipeIngredient = {
      ingredientId: defaultItem.id,
      quantity: 10,
      unit: defaultItem.defaultUnit || 'g',
      order: recipeIngredients.length + 1,
      notes: '',
      stageNote: '',
    };
    setRecipeIngredients([...recipeIngredients, newEntry]);
  };

  const handleRemoveIngredient = (index: number) => {
    const updated = recipeIngredients.filter((_, i) => i !== index).map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));
    setRecipeIngredients(updated);
  };

  const handleUpdateIngredient = (index: number, patch: Partial<RecipeIngredient>) => {
    const updated = [...recipeIngredients];
    updated[index] = { ...updated[index], ...patch };
    // If ingredientId changed, optionally update unit default
    if (patch.ingredientId) {
      const match = availableIngredients.find((ing) => ing.id === patch.ingredientId);
      if (match) {
        updated[index].unit = match.defaultUnit;
      }
    }
    setRecipeIngredients(updated);
  };

  // Step Helpers
  const handleAddStep = () => {
    const newStep: RecipeStep = {
      id: `step_${Date.now()}_${steps.length + 1}`,
      stepNumber: steps.length + 1,
      title: `Bước ${steps.length + 1}`,
      instruction: '',
      durationSeconds: 30,
      temperatureCelsius: undefined,
      equipment: '',
      completionCriteria: '',
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index).map((s, idx) => ({
      ...s,
      stepNumber: idx + 1,
    }));
    setSteps(updated);
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

    // re-index step numbers
    setSteps(updated.map((s, idx) => ({ ...s, stepNumber: idx + 1 })));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setErrorMsg(null);

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanCode) {
      setErrorMsg('Vui lòng nhập mã công thức (vd: REC-TEA-01).');
      return;
    }
    if (!cleanName) {
      setErrorMsg('Vui lòng nhập tên công thức.');
      return;
    }

    // Validate quantities
    for (let i = 0; i < recipeIngredients.length; i++) {
      if (!recipeIngredients[i].quantity || recipeIngredients[i].quantity <= 0) {
        setErrorMsg(`Nguyên liệu dòng #${i + 1} phải có định lượng lớn hơn 0.`);
        return;
      }
    }

    // Validate steps
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].instruction.trim()) {
        setErrorMsg(`Bước #${i + 1} (${steps[i].title}) chưa có nội dung thao tác chi tiết.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const newRecipe = await repo.createRecipe(session, {
        code: cleanCode,
        name: cleanName,
        description: description.trim(),
        targetYield: Number(targetYield) || 1,
        yieldUnit: yieldUnit.trim() || 'ly (500ml)',
        ingredients: recipeIngredients,
        steps: steps,
      });

      touch();
      router.push(`/rnd/recipes/${newRecipe.id}`);
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'Lỗi khi khởi tạo công thức.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Link href="/rnd/recipes" className="hover:text-zinc-200">
              Công Thức
            </Link>
            <span>/</span>
            <span className="text-[#DEBF64]">Tạo Mới Bản Nháp</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1C1917] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#B47820]" />
            <span>Tạo Bản Nháp Công Thức R&amp;D</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Khởi tạo phiên bản v1.0. Bạn có thể lưu nháp, thử nghiệm AI và hoàn thiện trước khi gửi thẩm định.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/rnd/recipes">
            <Button type="button" variant="secondary">
              Hủy Bỏ
            </Button>
          </Link>
          <Button type="submit" variant="gold" isLoading={submitting}>
            Hoàn Tất & Lưu Bản Nháp
          </Button>
        </div>
      </div>

      {errorMsg && <Alert type="error" message={errorMsg} />}

      {/* 1. Basic Metadata */}
      <div className="bg-white border border-[#E2DDD2] rounded-xl p-6 space-y-5 shadow-xs">
        <h2 className="text-base font-bold text-[#1C1917] flex items-center gap-2 border-b border-[#E2DDD2] pb-3">
          <FileText className="w-4 h-4 text-[#B47820]" /> 1. Thông Tin Cơ Bản &amp; Định Mức
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Mã Công Thức *"
            placeholder="VD: REC-OLO-01"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            helper="Mã định danh viết hoa duy nhất (VD: REC-MAT-02)"
          />

          <TextInput
            label="Tên Công Thức Đồ Uống *"
            placeholder="VD: Trà Ô Long Sữa Nướng Trân Châu"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <TextArea
          label="Mô Tả & Đặc Tính Hương Vị"
          placeholder="Mô tả tóm tắt về gu vị, điểm nhấn nguyên liệu hoặc phân khúc đồ uống..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput
            label="Sản Lượng Mục Tiêu (Target Yield) *"
            type="number"
            min={1}
            value={targetYield}
            onChange={(e) => setTargetYield(Math.max(1, Number(e.target.value) || 1))}
          />

          <TextInput
            label="Đơn Vị Thành Phẩm *"
            placeholder="VD: ly (500ml), bình (1.5L), mẻ..."
            value={yieldUnit}
            onChange={(e) => setYieldUnit(e.target.value)}
          />
        </div>
      </div>

      {/* 2. Ingredients Builder */}
      <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div>
            <h2 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-[#B47820]" /> 2. Thành Phần &amp; Định Lượng Nguyên Liệu ({recipeIngredients.length})
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Chọn nguyên liệu từ kho chuẩn, nhập định lượng (&gt; 0) và phân tách giai đoạn nếu cần.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddIngredient}
            disabled={availableIngredients.length === 0}
          >
            + Thêm Nguyên Liệu
          </Button>
        </div>

        {availableIngredients.length === 0 ? (
          <div className="p-4 bg-zinc-900/60 rounded-lg text-xs text-zinc-400 border border-zinc-800">
            Kho nguyên liệu đang trống. Hãy vào mục <Link href="/rnd/ingredients" className="text-[#C9A84C] underline">Kho Nguyên Liệu</Link> để tạo trước.
          </div>
        ) : recipeIngredients.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-zinc-800 rounded-lg text-zinc-400 space-y-2">
            <p className="text-sm">Chưa có nguyên liệu nào được thêm vào công thức này.</p>
            <Button type="button" variant="secondary" size="sm" onClick={handleAddIngredient}>
              + Thêm Nguyên Liệu Đầu Tiên
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recipeIngredients.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-lg items-end"
              >
                <div className="md:col-span-4">
                  <Select
                    label={`#${idx + 1} Nguyên Liệu`}
                    value={item.ingredientId}
                    onChange={(e) => handleUpdateIngredient(idx, { ingredientId: e.target.value })}
                    options={availableIngredients.map((ing) => ({
                      value: ing.id,
                      label: `${ing.code} - ${ing.name} (${ing.defaultUnit})`,
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
                    onChange={(e) => handleUpdateIngredient(idx, { quantity: Number(e.target.value) || 0 })}
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
                    label="Giai đoạn / Ghi chú"
                    placeholder="VD: Cốt trà nền / Topping sau cùng"
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
                    title="Xóa nguyên liệu"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Steps Builder */}
      <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div>
            <h2 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-[#B47820]" /> 3. Quy Trình Pha Chế &amp; Chuẩn Thao Tác SOP ({steps.length})
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Mô tả chi tiết từng thao tác, thời gian khuấy/ủ, nhiệt độ và tiêu chí hoàn thành.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleAddStep}>
            + Thêm Bước Thao Tác
          </Button>
        </div>

        {steps.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-zinc-800 rounded-lg text-zinc-400 space-y-2">
            <p className="text-sm">Chưa có bước thao tác nào.</p>
            <Button type="button" variant="secondary" size="sm" onClick={handleAddStep}>
              + Tạo Bước Đầu Tiên
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((step, idx) => (
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
                      placeholder="Tiêu đề bước..."
                      onChange={(e) => handleUpdateStep(idx, { title: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={idx === 0}
                      onClick={() => handleMoveStep(idx, 'up')}
                      title="Di chuyển lên"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={idx === steps.length - 1}
                      onClick={() => handleMoveStep(idx, 'down')}
                      title="Di chuyển xuống"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
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

                <TextArea
                  label="Hướng Dẫn Thao Tác Chi Tiết *"
                  placeholder="Mô tả kỹ thuật ủ trà, đánh bọt, rót tầng hoặc lắc shaker..."
                  value={step.instruction}
                  onChange={(e) => handleUpdateStep(idx, { instruction: e.target.value })}
                  rows={2}
                />

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                  <TextInput
                    label="Thời gian (giây)"
                    type="number"
                    placeholder="VD: 30"
                    value={step.durationSeconds || ''}
                    onChange={(e) =>
                      handleUpdateStep(idx, { durationSeconds: Number(e.target.value) || undefined })
                    }
                  />

                  <TextInput
                    label="Nhiệt độ (°C)"
                    type="number"
                    placeholder="VD: 85"
                    value={step.temperatureCelsius || ''}
                    onChange={(e) =>
                      handleUpdateStep(idx, { temperatureCelsius: Number(e.target.value) || undefined })
                    }
                  />

                  <TextInput
                    label="Dụng cụ cần dùng"
                    placeholder="VD: Bình ủ, nhiệt kế"
                    value={step.equipment || ''}
                    onChange={(e) => handleUpdateStep(idx, { equipment: e.target.value })}
                  />

                  <TextInput
                    label="Tiêu chí hoàn thành"
                    placeholder="VD: Cốt trà sánh, thơm đậm"
                    value={step.completionCriteria || ''}
                    onChange={(e) => handleUpdateStep(idx, { completionCriteria: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
        <Link href="/rnd/recipes">
          <Button type="button" variant="secondary">
            Hủy Bỏ
          </Button>
        </Link>
        <Button type="submit" variant="gold" size="lg" isLoading={submitting}>
          Lưu Bản Nháp & Chuyển Đến Chi Tiết
        </Button>
      </div>
    </form>
  );
}
