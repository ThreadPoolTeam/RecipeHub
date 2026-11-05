'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { UnitItem } from '@/lib/api/backend-repository';
import { Alert, Button, Select, TextInput } from '@/components/workspace/fields';
import { Dialog } from '@/components/workspace/dialog';

export function UnitConversionModal() {
  const { repo, touch } = useDemo();
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [value, setValue] = useState('1000');
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const sourceUnit = units.find(unit => unit.code === source);
  const targets = units.filter(unit => unit.categoryId === sourceUnit?.categoryId);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setCatalogLoading(true);
    setError('');
    repo.getUnits().then(list => {
      if (!active) return;
      const available = list.filter(unit => unit.state === 'active');
      setUnits(available);
      const first = available.find(unit => unit.code.toLowerCase() === 'ml') ?? available[0];
      setSource(first?.code ?? '');
      setTarget(available.find(unit => unit.categoryId === first?.categoryId && unit.code.toLowerCase() === 'l')?.code ?? first?.code ?? '');
      if (!available.length) setError('Chưa có đơn vị đang hoạt động.');
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Không thể tải đơn vị.'); })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [open, repo]);

  useEffect(() => {
    setResult(null);
    if (!open || catalogLoading || !source || !target) return;
    const number = Number(value);
    if (!value.trim() || !Number.isFinite(number) || number < 0) {
      setError('Nhập giá trị hữu hạn, lớn hơn hoặc bằng 0.');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = window.setTimeout(async () => {
      try {
        const converted = await repo.convertUnit(number, source, target, controller.signal);
        if (!controller.signal.aborted) setResult(converted);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Không thể quy đổi.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, catalogLoading, value, source, target, repo]);

  return <>
    <Button size="sm" onClick={() => { touch(); setOpen(true); }}><ArrowRightLeft className="w-4 h-4 mr-1.5" />Quy đổi đơn vị</Button>
    <Dialog isOpen={open} onClose={() => setOpen(false)} title="Quy đổi đơn vị"
      description="Hỗ trợ mg/g/kg và ml/cl/dl/l cùng nhóm. Các đơn vị khác chỉ đổi sang chính nó.">
      <div className="space-y-4">
        <TextInput label="Giá trị cần đổi" type="number" min="0" step="any" value={value} onChange={e => { setValue(e.target.value); touch(); }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Đơn vị gốc" value={source} disabled={catalogLoading} options={units.map(unit => ({ value: unit.code, label: `${unit.code} — ${unit.name}` }))}
            onChange={e => {
              setSource(e.target.value);
              const next = units.find(unit => unit.code === e.target.value);
              if (!units.some(unit => unit.code === target && unit.categoryId === next?.categoryId)) setTarget(next?.code ?? '');
            }} />
          <Select label="Đơn vị đích" value={target} disabled={catalogLoading} options={targets.map(unit => ({ value: unit.code, label: `${unit.code} — ${unit.name}` }))}
            onChange={e => setTarget(e.target.value)} />
        </div>
        {error && <Alert variant="error">{error}</Alert>}
        <div role="status" aria-live="polite" className="rounded-xl border border-[#E8E2D9] bg-[#FAF9F5] p-4 text-sm text-[#1A1917]">
          {catalogLoading ? 'Đang tải đơn vị...' : loading ? 'Đang quy đổi...' : result !== null ?
            <><span>{value} {source} = </span><strong>{result.toLocaleString('vi-VN', { maximumSignificantDigits: 15 })} {target}</strong></> : 'Nhập giá trị và chọn đơn vị để quy đổi.'}
        </div>
      </div>
    </Dialog>
  </>;
}
