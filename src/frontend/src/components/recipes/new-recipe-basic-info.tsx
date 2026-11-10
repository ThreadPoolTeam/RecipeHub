'use client';

import { TextInput, TextArea, Select } from '@/components/workspace/fields';
import { CodeInput } from '@/components/workspace/code-input';
import { UnitItem } from '@/lib/api/backend-repository';

type Props = {
  code: string; setCode: (value: string) => void; generatingCode: boolean;
  codeError: string | null; handleGenerateCode: () => void; hasSession: boolean;
  submitting: boolean; name: string; setName: (value: string) => void;
  description: string; setDescription: (value: string) => void;
  targetYield: number; setTargetYield: (value: number) => void;
  yieldUnit: string; setYieldUnit: (value: string) => void; availableUnits: UnitItem[];
};

export function NewRecipeBasicInfo({ code, setCode, generatingCode, codeError, handleGenerateCode, hasSession, submitting, name, setName, description, setDescription, targetYield, setTargetYield, yieldUnit, setYieldUnit, availableUnits }: Props) {
  return (
    <section id="basic-info" className="scroll-mt-24 space-y-5">
      <h2 className="text-lg font-semibold text-foreground"><span className="mr-3 text-primary">01</span>Thông tin cơ bản &amp; định mức</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <CodeInput label="Mã Công Thức" placeholder="VD: REC-001" value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())} onGenerate={handleGenerateCode}
          generateLabel="Tạo mã công thức" generating={generatingCode} generateDisabled={!hasSession}
          disabled={submitting} helper="Nhập mã riêng hoặc tạo mã REC-001, REC-002… Mã đã cấp có thể bị bỏ qua nếu không lưu."
          error={codeError} required />
        <TextInput label="Tên Công Thức Đồ Uống *" placeholder="VD: Trà Ô Long Sữa Nướng Trân Châu"
          value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Sản Lượng Mục Tiêu (Target Yield) *" type="number" min={1} value={targetYield}
          onChange={(e) => setTargetYield(Math.max(1, Number(e.target.value) || 1))} />
        <Select label="Đơn Vị Thành Phẩm *" value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value)}
          options={availableUnits.map((unit) => ({ value: unit.code, label: `${unit.name} (${unit.code})` }))} />
      </div>
      <TextArea label="Mô Tả & Đặc Tính Hương Vị" placeholder="Mô tả tóm tắt về gu vị, điểm nhấn nguyên liệu hoặc phân khúc đồ uống..."
        value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
    </section>
  );
}
