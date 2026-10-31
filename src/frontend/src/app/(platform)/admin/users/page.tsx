'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useDemo } from '@/lib/demo/provider';
import { User, Role } from '@/lib/demo/types';
import { Button, TextInput, Select, Alert, SearchInput } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';
import { RoleBadge } from '@/components/workspace/status-badge';
import { Dialog } from '@/components/workspace/dialog';
import { Users } from 'lucide-react';

export default function AdminUsersPage() {
  const { session, repo, dataVersion, touch } = useDemo();
  const [users, setUsers] = useState<User[]>([]);
  const [recipes, setRecipes] = useState<Array<{ id: string; recipeId: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
  const [newAllowedRecipes, setNewAllowedRecipes] = useState<string[]>([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<Role>('rnd');
  const [editAllowedRecipes, setEditAllowedRecipes] = useState<string[]>([]);
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
      setUsers(userResult.items);
      setTotal(userResult.total);
      setTotalPages(userResult.totalPages);
      if (page > userResult.totalPages) setPage(userResult.totalPages);
    } catch (err: unknown) {
      if (sequence === loadSequence.current) setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tải danh sách người dùng');
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    let active = true;
    // Recipe choices are independent of the Identity table load.
    const loadRecipes = async () => {
      const all: Array<{ id: string; recipeId: string; name: string; code: string }> = [];
      let recipePage = 1;
      let pages = 1;
      do {
        const result = await repo.getRecipes(session, { status: 'Published', page: recipePage, pageSize: 100 });
        all.push(...result.items);
        pages = result.totalPages;
        recipePage++;
      } while (recipePage <= pages && active);
      if (!active) return;
      // Group recipe by distinct recipeId
      const uniqueRecipes = new Map<string, { id: string; recipeId: string; name: string; code: string }>();
      for (const item of all) {
        if (!uniqueRecipes.has(item.recipeId)) {
          uniqueRecipes.set(item.recipeId, {
            id: item.id,
            recipeId: item.recipeId,
            name: item.name,
            code: item.code,
          });
        }
      }
      setRecipes(Array.from(uniqueRecipes.values()));
    };
    void loadRecipes().catch(err => { if (active) setErrorMsg(err instanceof Error ? err.message : 'Không tải được danh mục công thức.'); });
    return () => { active = false; };
  }, [session, repo, dataVersion]);

  useEffect(() => {
    const timer = window.setTimeout(() => { if (session) void loadData(); }, 250);
    return () => { window.clearTimeout(timer); loadSequence.current++; };
  }, [session, repo, dataVersion, searchTerm, filterRole, filterState, page]);

  // Handle Create User
  const handleCreateUser = async () => {
    if (!session) return;
    if (!newEmail.trim() || !newFullName.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ Email và Họ tên');
      return;
    }
    try {
      setCreateSubmitting(true);
      setErrorMsg(null);
      await repo.createUser(session, {
        email: newEmail.trim().toLowerCase(),
        fullName: newFullName.trim(),
        role: newRole,
        password: newPassword,
        isLocked: false,
        allowedRecipeIds: newRole === 'viewer' ? newAllowedRecipes : [],
      });
      setSuccessMsg(`Đã tạo tài khoản thành công: ${newEmail}`);
      setIsCreateOpen(false);
      // reset form
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
      setNewRole('rnd');
      setNewAllowedRecipes([]);
      touch();
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tạo người dùng');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit User Modal
  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditFullName(u.fullName);
    setEditRole(u.role);
    setEditAllowedRecipes(u.allowedRecipeIds || []);
    setErrorMsg(null);
  };

  // Handle Edit User
  const handleEditUser = async () => {
    if (!session || !editingUser) return;
    if (!editFullName.trim()) {
      setErrorMsg('Họ tên không được để trống');
      return;
    }
    try {
      setEditSubmitting(true);
      setErrorMsg(null);
      await repo.updateUser(session, editingUser.id, {
        fullName: editFullName.trim(),
        role: editRole,
        allowedRecipeIds: editRole === 'viewer' ? editAllowedRecipes : [],
      });
      setSuccessMsg(`Đã cập nhật thông tin tài khoản: ${editingUser.email}`);
      setEditingUser(null);
      touch();
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi cập nhật người dùng');
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
      setSuccessMsg(
        isLocked
          ? `Đã khóa tài khoản [${targetUser.email}] và thu hồi mọi session.`
          : `Đã mở khóa tài khoản [${targetUser.email}].`
      );
      touch();
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi thao tác khóa/mở khóa');
    } finally {
      setLockingUserId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!session || !passwordUser) return;
    try {
      setResetSubmitting(true); setErrorMsg(null);
      await repo.resetUserPassword(session, passwordUser.id, resetPassword);
      setSuccessMsg(`Đã đổi mật khẩu cho ${passwordUser.email} và thu hồi mọi session.`);
      setPasswordUser(null); setResetPassword(''); touch();
    } catch (err) { setErrorMsg(err instanceof Error ? err.message : 'Không thể đổi mật khẩu.'); }
    finally { setResetSubmitting(false); }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1917] flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#B47820]" />
            Quản lý Tài khoản &amp; Phân quyền
          </h1>
          <p className="text-[#706E68] text-sm mt-1">
            Quản lý tài khoản, vai trò R&amp;D / Barista Viewer và quyền truy cập công thức.
          </p>
        </div>
        <Button variant="gold" onClick={() => setIsCreateOpen(true)}>
          + Thêm người dùng mới
        </Button>
      </div>

      {errorMsg && (
        <Alert variant="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert variant="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* Filter toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs">
        <div className="sm:col-span-2">
          <SearchInput
            placeholder="Tìm theo email hoặc họ tên..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            onClear={() => { setSearchTerm(''); setPage(1); }}
          />
        </div>
        <div>
          <Select
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

      {/* Users DataTable */}
      <DataTable<User>
        data={users}
        keyExtractor={(u) => u.id}
        isLoading={loading}
        emptyTitle="Không tìm thấy người dùng"
        emptyMessage="Hãy điều chỉnh từ khóa tìm kiếm hoặc bấm Thêm người dùng mới."
        columns={[
          {
            header: 'Họ tên & Email',
            render: (u) => (
              <div>
                <div className="font-semibold text-[#1A1917] flex items-center gap-2">
                  {u.fullName}
                  {u.isLocked && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      BỊ KHÓA
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400 font-mono mt-0.5">{u.email}</div>
              </div>
            ),
          },
          {
            header: 'Vai trò (Role)',
            render: (u) => <RoleBadge role={u.role} />,
          },
          {
            header: 'Phạm vi công thức',
            render: (u) => {
              if (u.role !== 'viewer') {
                return <span className="text-xs text-[#706E68]">Toàn bộ công thức (theo vai trò)</span>;
              }
              const count = u.allowedRecipeIds ? u.allowedRecipeIds.length : 0;
              return (
                <div className="text-xs">
                  <span className="font-mono text-[#B47820] font-semibold">{count}</span> công thức cho phép xem
                </div>
              );
            },
          },
          {
            header: 'Thao tác',
            className: 'text-right',
            render: (u) => (
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" disabled={u.id === session?.userId} onClick={() => { setPasswordUser(u); setResetPassword(''); setErrorMsg(null); }}>Đổi mật khẩu</Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEditModal(u)}
                >
                  Sửa
                </Button>
                <Button
                  size="sm"
                  variant={u.isLocked ? 'gold' : 'danger'}
                  isLoading={lockingUserId === u.id}
                  disabled={u.id === session?.userId}
                  onClick={() => handleToggleLock(u)}
                  title={u.id === session?.userId ? 'Không thể tự khóa chính mình' : undefined}
                >
                  {u.isLocked ? 'Mở khóa' : 'Khóa'}
                </Button>
              </div>
            ),
          },
        ]}
      />

      <div className="flex items-center justify-between gap-3 text-xs text-[#706E68]">
        <span>{total} tài khoản · Trang {page}/{totalPages}</span>
        <div className="flex gap-2">
          <Button size="sm" disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
          <Button size="sm" disabled={loading || page >= totalPages} onClick={() => setPage(p => p + 1)}>Sau</Button>
        </div>
      </div>

      <Dialog isOpen={!!passwordUser} onClose={() => { if (!resetSubmitting) { setPasswordUser(null); setResetPassword(''); } }}
        title={`Đổi mật khẩu: ${passwordUser?.email ?? ''}`} description="Mọi session của tài khoản này sẽ bị thu hồi."
        onConfirm={handleResetPassword} confirmLabel="Lưu mật khẩu" isConfirming={resetSubmitting}>
        {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
        <TextInput label="Mật khẩu mới" type="password" autoComplete="new-password" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
          helper="8–128 ký tự, gồm chữ hoa, chữ thường và số." />
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
          {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
          <TextInput
            label="Email tài khoản"
            required
            placeholder="barista.demo@beveragelab.vn"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />

          <TextInput label="Mật khẩu ban đầu" type="password" autoComplete="new-password" required value={newPassword}
            onChange={e => setNewPassword(e.target.value)} helper="8–128 ký tự, gồm chữ hoa, chữ thường và số." />

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
              { label: 'Barista Viewer (Xem SOP & tra cứu vận hành quầy)', value: 'viewer' },
              { label: 'System Admin (Quản trị hệ thống toàn quyền)', value: 'admin' },
            ]}
          />

          {/* Cho phép chọn recipeIds nếu là Viewer */}
          {newRole === 'viewer' && (
            <div className="p-3 bg-[#FAF9F5] border border-[#E8E2D9] rounded-xl space-y-2">
              <div className="text-xs font-semibold text-[#1A1917]">
                Phân quyền xem công thức (Viewer Scope)
              </div>
              <p className="text-[11px] text-[#706E68]">
                Chọn danh sách công thức đã phát hành mà Barista này được quyền tra cứu:
              </p>
              {recipes.length === 0 ? (
                <div className="text-xs text-amber-700">Chưa có công thức đã phát hành nào trong hệ thống.</div>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
                  {recipes.map((rcp) => {
                    const checked = newAllowedRecipes.includes(rcp.recipeId);
                    return (
                      <label
                        key={rcp.recipeId}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-[#FAF9F5] text-xs text-[#1A1917] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewAllowedRecipes([...newAllowedRecipes, rcp.recipeId]);
                            } else {
                              setNewAllowedRecipes(newAllowedRecipes.filter((id) => id !== rcp.recipeId));
                            }
                          }}
                          className="w-3.5 h-3.5 accent-[#C9A84C]"
                        />
                        <span className="font-mono text-[11px] text-[#B47820] font-semibold">{rcp.code}</span>
                        <span>{rcp.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Dialog>

      {/* Modal Chỉnh sửa người dùng */}
      <Dialog
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Chỉnh sửa: ${editingUser?.email}`}
        description="Cập nhật quyền hạn và phạm vi công thức cho tài khoản."
        confirmLabel="Lưu thay đổi"
        confirmVariant="gold"
        onConfirm={handleEditUser}
        isConfirming={editSubmitting}
      >
        <div className="space-y-4">
          {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
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

          {editRole === 'viewer' && (
            <div className="p-3 bg-[#FAF9F5] border border-[#E8E2D9] rounded-xl space-y-2">
              <div className="text-xs font-semibold text-[#1A1917]">
                Phân quyền xem công thức (Viewer Scope)
              </div>
              <p className="text-[11px] text-[#706E68]">
                Chỉ định các công thức Barista này được phép mở và xem SOP:
              </p>
              {recipes.length === 0 ? (
                <div className="text-xs text-amber-700">Chưa có công thức đã phát hành nào.</div>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
                  {recipes.map((rcp) => {
                    const checked = editAllowedRecipes.includes(rcp.recipeId);
                    return (
                      <label
                        key={rcp.recipeId}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-[#FAF9F5] text-xs text-[#1A1917] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditAllowedRecipes([...editAllowedRecipes, rcp.recipeId]);
                            } else {
                              setEditAllowedRecipes(editAllowedRecipes.filter((id) => id !== rcp.recipeId));
                            }
                          }}
                          className="w-3.5 h-3.5 accent-[#C9A84C]"
                        />
                        <span className="font-mono text-[11px] text-[#B47820] font-semibold">{rcp.code}</span>
                        <span>{rcp.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
