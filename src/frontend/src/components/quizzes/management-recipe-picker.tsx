'use client';

import { useEffect, useState } from 'react';
import { formatVersionLabel, quizManagement, resolveRecipeVersion, type RecipeChoice, type RecipeVersionChoice, type RecipeVersionInfo } from '@/lib/api/quiz-management';
import { errorText, Message, Pagination } from './management-shared';
import { Button, Select, TextInput } from '@/components/workspace/fields';

export function ManagementRecipePicker({ actor, value, onChange, disabled }: { actor: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [recipes, setRecipes] = useState<RecipeChoice[]>([]);
  const [total, setTotal] = useState(0);
  const [recipe, setRecipe] = useState('');
  const [versions, setVersions] = useState<RecipeVersionChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [versionLoading, setVersionLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [info, setInfo] = useState<(RecipeVersionInfo & { id: string }) | null>(null);
  const [resolving, setResolving] = useState(false);
  useEffect(() => {
    if (!value && !recipe && recipes.length) setRecipe(recipes[0].id);
  }, [value, recipe, recipes]);
  useEffect(() => {
    if (!value && versions.length) {
      const latest = [...versions].sort((a, b) => b.versionNumber - a.versionNumber)[0];
      onChange(latest.id);
    }
  }, [value, versions, onChange]);
  useEffect(() => {
    if (disabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      quizManagement.recipes(actor, search, page, controller.signal).then(data => { setRecipes(data.items); setTotal(data.totalCount); }).catch(e => { if (!controller.signal.aborted) setError(errorText(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [actor, search, page, disabled, retry]);
  useEffect(() => {
    if (!recipe || disabled) return;
    const controller = new AbortController();
    setVersionLoading(true); setError('');
    quizManagement.recipeVersions(actor, recipe, controller.signal).then(data => setVersions(data.filter(item => item.status === 'published'))).catch(e => { if (!controller.signal.aborted) setError(errorText(e)); }).finally(() => { if (!controller.signal.aborted) setVersionLoading(false); });
    return () => controller.abort();
  }, [actor, recipe, disabled, retry]);
  useEffect(() => {
    if (!value || info?.id === value) return;
    const picked = recipes.find(item => item.id === recipe);
    const version = versions.find(item => item.id === value);
    if (picked && version) { setInfo({ id: value, code: picked.code, name: picked.name, versionNumber: version.versionNumber }); return; }
    const controller = new AbortController();
    setResolving(true);
    resolveRecipeVersion(actor, value, controller.signal).then(found => { if (found) setInfo({ id: value, ...found }); }).catch(() => undefined).finally(() => { if (!controller.signal.aborted) setResolving(false); });
    return () => controller.abort();
  }, [actor, value, info, recipe, recipes, versions]);
  const selectedText = !value ? '' : info?.id === value ? `${info.code} · ${info.name} · ${formatVersionLabel(info.versionNumber)}` : resolving ? 'Đang tải thông tin công thức…' : 'Chưa xác định';
  return <fieldset className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-soft" disabled={disabled}>
    <legend className="font-display text-panel font-medium">Công thức liên kết</legend>
    {value && <p className="text-sm text-muted-foreground">Phiên bản đang chọn: <strong>{selectedText}</strong></p>}
    {!disabled && <>
      <TextInput label="Tìm công thức đã ban hành" type="search" value={search} placeholder="Tên hoặc mã công thức…" onChange={event => { setSearch(event.target.value); setPage(1); }} />
      <Select label="Công thức" value={recipe} onChange={event => { setRecipe(event.target.value); setVersions([]); }} disabled={loading}>
        <option value="">{loading ? 'Đang tải…' : 'Chọn công thức'}</option>
        {recipes.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
      </Select>
      {!loading && !recipes.length && <p className="text-sm text-muted-foreground">Không có công thức đã ban hành phù hợp.</p>}
      <Pagination page={page} total={total} pageSize={12} onPage={setPage} disabled={loading} />
      {recipe && <Select label="Phiên bản đã ban hành" value={versions.some(item => item.id === value) ? value : ''} disabled={versionLoading} onChange={event => onChange(event.target.value)}>
        <option value="">{versionLoading ? 'Đang tải phiên bản…' : 'Chọn phiên bản'}</option>
        {versions.map(item => <option key={item.id} value={item.id}>{formatVersionLabel(item.versionNumber)} · {item.name}</option>)}
      </Select>}
      <Message error={error} />
      {error && <Button type="button" onClick={() => setRetry(value => value + 1)}>Thử lại tải công thức</Button>}
      <p className="text-sm text-muted-foreground">Chỉ dùng công thức đang hoạt động, phiên bản đã ban hành. Backend kiểm tra lại khi lưu.</p>
    </>}
  </fieldset>;
}
