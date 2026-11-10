'use client';

import { useMemo, useState } from 'react';
import { Plus, Ruler } from 'lucide-react';
import { Button, Alert, SearchInput } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';
import { UnitConversionModal } from '@/components/shared/UnitConversionModal';
import { pageTitleClass, panelTitleClass } from '@/components/workspace/page-header';
import type { UnitItem } from '@/lib/api/backend-repository';
import { CatalogueCategoryGrid } from './catalogue-category-grid';
import { CatalogueCategoryDetail } from './catalogue-category-detail';
import { CatalogueEditorDialog } from './catalogue-editor-dialog';
import { useCatalogueData } from './use-catalogue-data';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function RndCataloguePage() {
  const data = useCatalogueData();
  const { unitCategories, unitItems, loading, loadError, setLoadError, togglingId, editor, openEditor, toggleState } = data;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const filtersActive = searchQuery.trim() !== '' || statusFilter !== 'all';
  const groups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matchesStatus = (state: string) => statusFilter === 'all' || (statusFilter === 'active' ? state === 'active' : state !== 'active');
    return unitCategories.map(category => {
      const allUnits = unitItems.filter(unit => unit.categoryId === category.id);
      const categoryMatches = !query || category.name.toLowerCase().includes(query) || category.code.toLowerCase().includes(query);
      const units = allUnits.filter(unit => matchesStatus(unit.state) && (categoryMatches || unit.name.toLowerCase().includes(query) || unit.code.toLowerCase().includes(query)));
      const visible = !filtersActive || ((categoryMatches || units.length > 0) && (matchesStatus(category.state) || units.length > 0));
      return { category, units, baseUnit: allUnits.find(unit => unit.isBase), totalUnits: allUnits.length, visible };
    }).filter(group => group.visible);
  }, [unitCategories, unitItems, searchQuery, statusFilter, filtersActive]);
  const selected = groups.find(group => group.category.id === selectedCategoryId);
  if (selectedCategoryId && !loading && !selected) setSelectedCategoryId(null);
  const clearFilters = () => { setSearchQuery(''); setStatusFilter('all'); setSelectedCategoryId(null); };
  const editingUnitId = editor?.kind === 'unit' ? editor.item?.id : undefined;
  const selectedCategoryBase = unitItems.find(item => item.categoryId === data.unitCategoryId && item.isBase && item.id !== editingUnitId);
  const unitCodePreview = data.code.trim().toUpperCase() || 'KG';
  const baseCodePreview = data.unitIsBase ? unitCodePreview : selectedCategoryBase?.code ?? 'BASE';

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Danh mục</p>
        <h1 className={pageTitleClass}>Đại lượng &amp; đơn vị đo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Định nghĩa đại lượng, đơn vị cơ sở và hệ số quy đổi dùng cho toàn bộ công thức.</p>
      </div>
      <Button variant="gold" size="sm" onClick={() => openEditor({ kind: 'unit-category', item: null })}><Plus className="mr-1 h-4 w-4" /> Thêm đại lượng</Button>
    </header>
    {loadError && <Alert type="error" message={loadError} onClose={() => setLoadError(null)} />}
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-full sm:w-80"><SearchInput placeholder="Tìm theo mã hoặc tên đại lượng, đơn vị..." value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onClear={() => setSearchQuery('')} /></div>
      <div className="flex flex-wrap gap-2" aria-label="Lọc trạng thái đại lượng">
        {([['all', 'Tất cả'], ['active', 'Đang dùng'], ['inactive', 'Ngừng dùng']] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)} className={`rounded-full border px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${statusFilter === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-accent'}`}>
            {label} <span className="ml-1 tabular-nums">{value === 'all' ? unitCategories.length : unitCategories.filter(item => value === 'active' ? item.state === 'active' : item.state !== 'active').length}</span>
          </button>
        ))}
      </div>
      <div className="sm:ml-auto"><UnitConversionModal /></div>
    </div>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(220px,0.9fr)_minmax(0,2fr)_minmax(240px,1fr)]">
      <div className="space-y-3">
        {loading || groups.length === 0 ? <DataTable<UnitItem> data={[]} columns={[]} keyExtractor={item => item.id} isLoading={loading} emptyTitle={filtersActive ? 'Không tìm thấy kết quả' : 'Chưa có đại lượng đo'} emptyMessage={filtersActive ? 'Không có đại lượng hoặc đơn vị nào khớp với bộ lọc.' : 'Tạo đại lượng đầu tiên rồi thêm đơn vị.'} emptyAction={filtersActive ? <Button variant="secondary" size="sm" onClick={clearFilters}>Xóa bộ lọc</Button> : <Button variant="gold" size="sm" onClick={() => openEditor({ kind: 'unit-category', item: null })}>Thêm đại lượng</Button>} /> : <CatalogueCategoryGrid groups={groups} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} />}
        <Button variant="secondary" size="sm" className="w-full" onClick={() => openEditor({ kind: 'unit-category', item: null })}><Plus className="mr-1 h-4 w-4" /> Thêm đại lượng</Button>
      </div>
      {selected ? <CatalogueCategoryDetail group={selected} togglingId={togglingId} onToggle={async (kind, item) => { await toggleState(kind, item); }} onEditCategory={category => openEditor({ kind: 'unit-category', item: category })} onEditUnit={unit => openEditor({ kind: 'unit', item: unit })} onAddUnit={id => openEditor({ kind: 'unit', item: null }, id)} /> : <section className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-border bg-card p-6 text-center shadow-soft">
        <Ruler aria-hidden="true" className="mb-4 h-8 w-8 text-muted-foreground" />
        <h2 className={panelTitleClass}>Chưa chọn đại lượng</h2>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">Chọn một đại lượng ở bên trái để xem và chỉnh sửa đơn vị.</p>
      </section>}
      <UnitConversionModal inline />
    </div>
    <CatalogueEditorDialog {...data} selectedCategoryBase={selectedCategoryBase} unitCodePreview={unitCodePreview} baseCodePreview={baseCodePreview} />
  </div>;
}
