'use client';

import { useEffect, useState } from 'react';
import { quizManagement, type RecipeChoice, type RecipeVersionChoice } from '@/lib/api/quiz-management';
import { errorText, Message, Pagination } from './management-shared';

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
  return <fieldset className="qm-picker" disabled={disabled}><legend>Công thức liên kết</legend>{value && <p className="qm-muted">Phiên bản đang chọn: <code>{value}</code></p>}{!disabled && <><label className="qm-field">Tìm công thức đã ban hành<input type="search" value={search} placeholder="Tên hoặc mã công thức…" onChange={event => { setSearch(event.target.value); setPage(1); }} /></label><label className="qm-field">Công thức<select value={recipe} onChange={event => { setRecipe(event.target.value); setVersions([]); }} disabled={loading}><option value="">{loading ? 'Đang tải…' : 'Chọn công thức'}</option>{recipes.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>{!loading && !recipes.length && <p className="qm-muted">Không có công thức đã ban hành phù hợp.</p>}<Pagination page={page} total={total} pageSize={12} onPage={setPage} disabled={loading} />{recipe && <label className="qm-field">Phiên bản đã ban hành<select value={versions.some(item => item.id === value) ? value : ''} disabled={versionLoading} onChange={event => onChange(event.target.value)}><option value="">{versionLoading ? 'Đang tải phiên bản…' : 'Chọn phiên bản'}</option>{versions.map(item => <option key={item.id} value={item.id}>v{item.versionNumber} · {item.name}</option>)}</select></label>}<Message error={error} />{error && <button type="button" className="qm-btn" onClick={() => setRetry(value => value + 1)}>Thử lại tải công thức</button>}<p className="qm-muted">Chỉ dùng công thức đang hoạt động, phiên bản đã ban hành. Backend kiểm tra lại khi lưu.</p></>}</fieldset>;
}
