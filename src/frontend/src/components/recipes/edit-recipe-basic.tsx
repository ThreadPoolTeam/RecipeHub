import { CodeInput } from '@/components/workspace/code-input';
import { Select, TextArea, TextInput } from '@/components/workspace/fields';
import type { UnitItem } from '@/lib/api/backend-repository';

type Props = {
  code: string; setCode: (value: string) => void; onGenerate: () => void;
  generating: boolean; canGenerate: boolean; immutable: boolean; saving: boolean; codeError: string | null;
  name: string; setName: (value: string) => void; description: string; setDescription: (value: string) => void;
  targetYield: string; setTargetYield: (value: string) => void; yieldUnit: string; setYieldUnit: (value: string) => void;
  availableUnits: UnitItem[];
};

export function EditRecipeBasic(p: Props) {
  return <section id="recipe-basic" className="scroll-mt-24 space-y-5">
    <h2 className="text-lg font-medium font-display"><span className="mr-3 text-primary">01</span>Thông tin cơ bản &amp; định mức</h2>
    <div className="grid gap-4 md:grid-cols-2">
      <CodeInput label="Mã Công Thức" value={p.code} onChange={(e) => p.setCode(e.target.value.toUpperCase())}
        onGenerate={p.onGenerate} generateLabel="Tạo mã công thức" generating={p.generating}
        generateDisabled={!p.canGenerate} disabled={p.immutable || p.saving}
        helper={p.immutable ? 'Mã được giữ cố định sau lần phát hành đầu tiên; không thể sửa hoặc tạo mã mới.' : 'Nhập mã riêng hoặc tạo mã REC-001, REC-002… Mã đã cấp có thể bị bỏ qua nếu không lưu.'}
        error={p.codeError} required />
      <TextInput label="Tên Công Thức *" value={p.name} onChange={(e) => p.setName(e.target.value)} />
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <TextInput label="Sản Lượng Mục Tiêu" type="number" min={1} value={p.targetYield} onChange={(e) => p.setTargetYield(e.target.value)} />
      <Select label="Đơn Vị Thành Phẩm" value={p.yieldUnit} onChange={(e) => p.setYieldUnit(e.target.value)} options={[{ value: '', label: 'Chưa thiết lập' }, ...p.availableUnits.map((unit) => ({ value: unit.code, label: `${unit.name} (${unit.code})` }))]} />
    </div>
    <TextArea label="Mô Tả & Cảm Quan Vị" value={p.description} onChange={(e) => p.setDescription(e.target.value)} rows={3} />
  </section>;
}
