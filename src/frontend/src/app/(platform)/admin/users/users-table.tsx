import React from 'react';
import { User } from '@/lib/demo/types';
import { Button } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';
import { RoleBadge } from '@/components/workspace/status-badge';

interface UsersTableProps {
  users: User[];
  loading: boolean;
  currentUserId?: string;
  lockingUserId: string | null;
  onResetPassword: (user: User) => void;
  onEdit: (user: User) => void;
  onToggleLock: (user: User) => void;
}

export function UsersTable({ users, loading, currentUserId, lockingUserId, onResetPassword, onEdit, onToggleLock }: UsersTableProps) {
  return (
    <DataTable<User>
      data={users}
      keyExtractor={(u) => u.id}
      isLoading={loading}
      emptyTitle="Không tìm thấy người dùng"
      emptyMessage="Hãy điều chỉnh từ khóa tìm kiếm hoặc tạo tài khoản mới."
      columns={[
        {
          header: 'Người dùng',
          render: (u) => (
            <div>
              <div className="font-semibold text-foreground">{u.fullName}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{u.email}</div>
            </div>
          ),
        },
        { header: 'Vai trò', render: (u) => <RoleBadge role={u.role} /> },
        {
          header: 'Phạm vi truy cập',
          render: (u) => {
            if (u.role === 'admin') {
              return <span className="text-xs text-muted-foreground">Quản trị hệ thống, tài khoản &amp; nhật ký Audit</span>;
            }
            if (u.role === 'rnd') {
              return <span className="text-xs text-muted-foreground">Toàn bộ công thức, nguyên liệu, danh mục &amp; bộ đề</span>;
            }
            return <span className="text-xs font-medium text-muted-foreground">Toàn bộ công thức đã phát hành</span>;
          },
        },
        {
          header: 'Trạng thái',
          render: (u) => (
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${u.isLocked ? 'bg-secondary text-muted-foreground' : 'bg-success-soft text-success'}`}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
              {u.isLocked ? 'Đã khóa' : 'Đang hoạt động'}
            </span>
          ),
        },
        {
          header: 'Thao tác',
          className: 'text-right',
          render: (u) => (
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" disabled={u.id === currentUserId} onClick={() => onResetPassword(u)}>Đổi mật khẩu</Button>
              <Button size="sm" variant="secondary" onClick={() => onEdit(u)}>Sửa</Button>
              <Button
                size="sm"
                variant="secondary"
                isLoading={lockingUserId === u.id}
                disabled={u.id === currentUserId}
                onClick={() => onToggleLock(u)}
                title={u.id === currentUserId ? 'Không thể tự khóa chính mình' : undefined}
              >
                {u.isLocked ? 'Mở khóa' : 'Khóa'}
              </Button>
            </div>
          ),
        },
      ]}
    />
  );
}
