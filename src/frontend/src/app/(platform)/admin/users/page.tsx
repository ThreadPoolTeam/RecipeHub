'use client';

import { pageTitleClass } from '@/components/workspace/page-header';

import React, { useEffect, useState, useRef } from 'react';
import { useDemo } from '@/lib/demo/provider';
import { User, Role } from '@/lib/demo/types';
import { Button, TextInput, Select, Alert, SearchInput } from '@/components/workspace/fields';
import { Dialog } from '@/components/workspace/dialog';
import { useToast } from '@/components/workspace/toast';
import { UsersTable } from './users-table';

export default function AdminUsersPage() {
  const { session, repo, dataVersion, touch } = useDemo();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | Role>('all');
  const [filterState, setFilterState] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const loadSequence = useRef(0);

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('rnd');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<Role>('rnd');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Toggle lock state
  const [lockingUserId, setLockingUserId] = useState<string | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const loadData = async () => {
    const sequence = ++loadSequence.current;
    try {
      setLoading(true);
      const userResult = await repo.getUsersPage(searchTerm, filterRole, filterState, page, 10);
      if (sequence !== loadSequence.current) return;
      setErrorMsg(null);
      setUsers(userResult.items);
      setTotal(userResult.total);
      setTotalPages(userResult.totalPages);
      if (page > userResult.totalPages) setPage(userResult.totalPages);
    } catch {
      if (sequence === loadSequence.current) setErrorMsg('Không thể tải danh sách người dùng. Vui lòng thử lại.');
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { if (session) void loadData(); }, 250);
    return () => { window.clearTimeout(timer); loadSequence.current++; };
  }, [session, repo, dataVersion, searchTerm, filterRole, filterState, page]);

  // Handle Create User
  const handleCreateUser = async () => {
    if (!session) return;
    if (!newEmail.trim() || !newFullName.trim()) {
      setFormError('Vui lòng điền đầy đủ Email và Họ tên');
      return;
    }
    try {
      setCreateSubmitting(true);
      setFormError(null);
      await repo.createUser(session, {
        email: newEmail.trim().toLowerCase(),
        fullName: newFullName.trim(),
        role: newRole,
        password: newPassword,
        isLocked: false,
        allowedRecipeIds: [],
      });
      toast({ type: 'success', title: 'Đã tạo tài khoản', description: newEmail });
      setIsCreateOpen(false);
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
      setNewRole('rnd');
      touch();
      await loadData();
    } catch {
      toast({ type: 'error', title: 'Không thể tạo tài khoản', description: 'Vui lòng kiểm tra thông tin và thử lại.' });
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit User Modal
  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditFullName(u.fullName);
    setEditRole(u.role);
    setFormError(null);
  };

  // Handle Edit User
  const handleEditUser = async () => {
    if (!session || !editingUser) return;
    if (!editFullName.trim()) {
      setFormError('Họ tên không được để trống');
      return;
    }
    try {
      setEditSubmitting(true);
      setFormError(null);
      await repo.updateUser(session, editingUser.id, {
        fullName: editFullName.trim(),
        role: editRole,
        allowedRecipeIds: [],
      });
      toast({ type: 'success', title: 'Đã cập nhật tài khoản', description: editingUser.email });
      setEditingUser(null);
      touch();
      await loadData();
    } catch {
      toast({ type: 'error', title: 'Không thể cập nhật tài khoản', description: 'Vui lòng thử lại.' });
    } finally {
      setEditSubmitting(false);
    }
  };

  // Toggle Lock
  const handleToggleLock = async (targetUser: User) => {
    if (!session) return;
    if (targetUser.id === session.userId) {
      setErrorMsg('Không thể tự khóa tài khoản Admin đang đăng nhập');
      return;
    }
    try {
      setLockingUserId(targetUser.id);
      setErrorMsg(null);
      const updated = await repo.updateUserStatus(session, targetUser.id, targetUser.isLocked);
      const isLocked = updated.isLocked;
      toast({
        type: 'success',
        title: isLocked ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
        description: isLocked ? `${targetUser.email}. Các phiên đăng nhập đã bị thu hồi.` : targetUser.email,
      });
      touch();
      await loadData();
    } catch {
      toast({ type: 'error', title: 'Không thể thay đổi trạng thái tài khoản', description: 'Vui lòng thử lại.' });
    } finally {
      setLockingUserId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!session || !passwordUser) return;
    try {
      setResetSubmitting(true); setFormError(null);
      await repo.resetUserPassword(session, passwordUser.id, resetPassword);
      toast({ type: 'success', title: 'Đã đổi mật khẩu', description: `${passwordUser.email}. Các phiên đăng nhập đã bị thu hồi.` });
      setPasswordUser(null); setResetPassword(''); touch();
    } catch { toast({ type: 'error', title: 'Không thể đổi mật khẩu', description: 'Vui lòng kiểm tra mật khẩu và thử lại.' }); }
    finally { setResetSubmitting(false); }
  };

  return (
    <div className="mx-auto max-w-[1360px] space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quản trị</p>
          <h1 className={`mt-2 ${pageTitleClass}`}>
            Tài khoản &amp; phân quyền
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Mỗi tài khoản có đúng một vai trò: Admin, R&amp;D hoặc Viewer.
          </p>
        </div>
        <Button variant="primary" className="!h-10" onClick={() => { setFormError(null); setIsCreateOpen(true); }}>
          Tạo tài khoản
        </Button>
      </div>

      {errorMsg && (
        <Alert variant="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}


      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,320px)_minmax(160px,200px)_minmax(160px,200px)]">
        <div>
          <SearchInput
            aria-label="Tìm theo tên hoặc email"
            placeholder="Tìm theo tên hoặc email"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            onClear={() => { setSearchTerm(''); setPage(1); }}
          />
        </div>
        <div>
          <Select
            aria-label="Lọc vai trò"
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value as 'all' | Role); setPage(1); }}
            options={[
              { label: 'Tất cả vai trò', value: 'all' },
              { label: 'System Admin', value: 'admin' },
              { label: 'R&D Specialist', value: 'rnd' },
              { label: 'Barista Viewer', value: 'viewer' },
            ]}
          />
        </div>
        <Select aria-label="Lọc trạng thái tài khoản" value={filterState} onChange={e => { setFilterState(e.target.value); setPage(1); }}
          options={[{ label: 'Tất cả trạng thái', value: 'all' }, { label: 'Đang hoạt động', value: 'active' }, { label: 'Đã khóa', value: 'inactive' }]} />
      </div>

      <UsersTable
        users={users}
        loading={loading}
        currentUserId={session?.userId}
        lockingUserId={lockingUserId}
        onResetPassword={(u) => { setPasswordUser(u); setResetPassword(''); setFormError(null); setErrorMsg(null); }}
        onEdit={openEditModal}
        onToggleLock={handleToggleLock}
      />

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{total} tài khoản · Trang {page}/{totalPages}</span>
        <div className="flex gap-2">
          <Button size="sm" disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
          <Button size="sm" disabled={loading || page >= totalPages} onClick={() => setPage(p => p + 1)}>Sau</Button>
        </div>
      </div>

      <Dialog isOpen={!!passwordUser} onClose={() => { if (!resetSubmitting) { setPasswordUser(null); setResetPassword(''); } }}
        title={`Đổi mật khẩu: ${passwordUser?.email ?? ''}`} description="Mọi session của tài khoản này sẽ bị thu hồi."
        onConfirm={handleResetPassword} confirmLabel="Lưu mật khẩu" isConfirming={resetSubmitting}>
        <TextInput label="Mật khẩu mới" type="password" autoComplete="new-password" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
          helper="Từ 8 đến 128 ký tự, gồm chữ hoa, chữ thường và số." />
      </Dialog>

      {/* Modal Thêm người dùng mới */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Thêm người dùng mới"
        description="Tạo tài khoản và cấp vai trò trong hệ thống."
        confirmLabel="Lưu tài khoản"
        confirmVariant="gold"
        onConfirm={handleCreateUser}
        isConfirming={createSubmitting}
      >
        <div className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <TextInput
            label="Email tài khoản"
            required
            placeholder="barista.demo@beveragelab.vn"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />

          <TextInput label="Mật khẩu ban đầu" type="password" autoComplete="new-password" required value={newPassword}
            onChange={e => setNewPassword(e.target.value)} helper="Từ 8 đến 128 ký tự, gồm chữ hoa, chữ thường và số." />

          <TextInput
            label="Họ và tên"
            required
            placeholder="Nguyễn Văn A"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
          />

          <Select
            label="Vai trò (Role)"
            value={newRole}
            onChange={(e) => {
              const r = e.target.value as Role;
              setNewRole(r);
            }}
            options={[
              { label: 'R&D Specialist (Nghiên cứu & phát triển công thức)', value: 'rnd' },
              { label: 'Barista Viewer (Tra cứu toàn bộ SOP công thức đã phát hành)', value: 'viewer' },
              { label: 'System Admin (Quản trị hệ thống & giám sát vận hành)', value: 'admin' },
            ]}
          />
        </div>
      </Dialog>

      {/* Modal Chỉnh sửa người dùng */}
      <Dialog
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Chỉnh sửa: ${editingUser?.email}`}
        description="Cập nhật họ tên và vai trò cho tài khoản."
        confirmLabel="Lưu thay đổi"
        confirmVariant="gold"
        onConfirm={handleEditUser}
        isConfirming={editSubmitting}
      >
        <div className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}
          <TextInput
            label="Họ và tên"
            required
            value={editFullName}
            onChange={(e) => setEditFullName(e.target.value)}
          />

          <Select
            label="Vai trò (Role)"
            value={editRole}
            onChange={(e) => {
              const r = e.target.value as Role;
              setEditRole(r);
            }}
            options={[
              { label: 'R&D Specialist', value: 'rnd' },
              { label: 'Barista Viewer', value: 'viewer' },
              { label: 'System Admin', value: 'admin' },
            ]}
          />
        </div>
      </Dialog>
    </div>
  );
}
