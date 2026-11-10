import { SearchInput, Select } from '@/components/workspace/fields';

export function IngredientFilterBar({ search, group, status, groups, onSearch, onGroup, onStatus }: {
  search: string;
  group: string;
  status: 'all' | 'active' | 'inactive';
  groups: string[];
  onSearch: (value: string) => void;
  onGroup: (value: string) => void;
  onStatus: (value: 'all' | 'active' | 'inactive') => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <div className="md:col-span-2">
        <SearchInput placeholder="Tìm theo mã hoặc tên nguyên liệu..." value={search} onChange={(event) => onSearch(event.target.value)} onClear={() => onSearch('')} />
      </div>
      <Select value={group} onChange={(event) => onGroup(event.target.value)} options={[
        { value: 'all', label: 'Tất cả loại' },
        ...groups.map((name) => ({ value: name, label: name })),
      ]} />
      <Select value={status} onChange={(event) => onStatus(event.target.value as 'all' | 'active' | 'inactive')} options={[
        { value: 'all', label: 'Tất cả trạng thái' },
        { value: 'active', label: 'Đang dùng' },
        { value: 'inactive', label: 'Tạm khóa' },
      ]} />
    </div>
  );
}
