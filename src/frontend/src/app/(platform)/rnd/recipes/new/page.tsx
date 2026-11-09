'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDemo } from '@/lib/demo/provider';
import { Ingredient, RecipeIngredient, RecipeStep } from '@/lib/demo/types';
import { Button, Alert } from '@/components/workspace/fields';
import { UnitItem } from '@/lib/api/backend-repository';
import { NewRecipeBasicInfo } from '@/components/recipes/new-recipe-basic-info';
import { NewRecipeIngredients } from '@/components/recipes/new-recipe-ingredients';
import { NewRecipeSop } from '@/components/recipes/new-recipe-sop';
import { NewRecipeStepper } from '@/components/recipes/new-recipe-stepper';
export default function NewRecipePage() {
  const router = useRouter();
  const { session, repo, touch } = useDemo();

  // Basic Info
  const [code, setCode] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetYield, setTargetYield] = useState<number>(1);
  const [yieldUnit, setYieldUnit] = useState('');
  const [availableUnits, setAvailableUnits] = useState<UnitItem[]>([]);

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
    Promise.all([repo.getIngredients('', '', true), repo.getUnits()])
      .then(([items, units]) => {
        if (!isMounted) return;
        const activeUnits = units.filter((unit) => unit.state === 'active');
        setAvailableIngredients(items);
        setAvailableUnits(activeUnits);
        setYieldUnit((current) => current || activeUnits[0]?.code || '');
      })
      .catch((error: unknown) => {
        if (isMounted) setErrorMsg(error instanceof Error ? error.message : 'Không thể tải danh mục Recipe Service.');
      });
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

  const handleGenerateCode = async () => {
    if (!session || generatingCode || submitting) return;
    setGeneratingCode(true);
    setCodeError(null);
    try {
      const generatedCode = await repo.generateRecipeCode(session);
      setCode(generatedCode);
      touch();
    } catch (error: unknown) {
      setCodeError(error instanceof Error ? error.message : 'Không thể tạo mã công thức.');
    } finally {
      setGeneratingCode(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || generatingCode || submitting) return;
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
    if (!yieldUnit) {
      setErrorMsg('Recipe Service chưa có đơn vị thành phẩm khả dụng.');
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
        yieldUnit,
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
    <form onSubmit={handleSubmit} className="mx-auto max-w-7xl space-y-8 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tạo công thức</p>
          <h1 className="mt-2 text-3xl font-medium text-foreground sm:text-4xl">Tạo công thức mới</h1>
          <p className="mt-2 text-sm text-muted-foreground">Bắt đầu một hương vị mới, hoàn thiện thành một tiêu chuẩn.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/rnd/recipes"><Button type="button" variant="secondary">Hủy Bỏ</Button></Link>
          <Button type="submit" variant="primary" isLoading={submitting} disabled={generatingCode}>Hoàn Tất &amp; Lưu Bản Nháp</Button>
        </div>
      </header>

      {errorMsg && <Alert type="error" message={errorMsg} />}

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <NewRecipeStepper ingredientCount={recipeIngredients.length} stepCount={steps.length} />
        <div className="min-w-0 space-y-8">
          <NewRecipeBasicInfo code={code} setCode={setCode} generatingCode={generatingCode} codeError={codeError}
            handleGenerateCode={handleGenerateCode} hasSession={!!session} submitting={submitting}
            name={name} setName={setName} description={description} setDescription={setDescription}
            targetYield={targetYield} setTargetYield={setTargetYield} yieldUnit={yieldUnit}
            setYieldUnit={setYieldUnit} availableUnits={availableUnits} />
          <NewRecipeIngredients availableIngredients={availableIngredients} recipeIngredients={recipeIngredients}
            handleAddIngredient={handleAddIngredient} handleRemoveIngredient={handleRemoveIngredient}
            handleUpdateIngredient={handleUpdateIngredient} />
          <NewRecipeSop steps={steps} handleAddStep={handleAddStep} handleRemoveStep={handleRemoveStep}
            handleUpdateStep={handleUpdateStep} handleMoveStep={handleMoveStep} />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        <Link href="/rnd/recipes"><Button type="button" variant="secondary">Hủy Bỏ</Button></Link>
        <Button type="submit" variant="primary" size="lg" isLoading={submitting} disabled={generatingCode}>Lưu Bản Nháp &amp; Chuyển Đến Chi Tiết</Button>
      </div>
    </form>
  );
}
