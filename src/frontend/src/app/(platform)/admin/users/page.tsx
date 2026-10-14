'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { User, Role } from '@/lib/demo/types';
import { Button, TextInput, Select, Alert } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';
import { RoleBadge } from '@/components/workspace/status-badge';
import { Dialog } from '@/components/workspace/dialog';

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

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<Role>('rnd');
  const [newCanApprove, setNewCanApprove] = useState(false);
  const [newAllowedRecipes, setNewAllowedRecipes] = useState<string[]>([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<Role>('rnd');
  const [editCanApprove, setEditCanApprove] = useState(false);
  const [editAllowedRecipes, setEditAllowedRecipes] = useState<string[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Toggle lock state
  const [lockingUserId, setLockingUserId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userList, recipeResult] = await Promise.all([
        repo.getUsers(),
        session
          ? repo.getRecipes(session, { status: 'Approved', pageSize: 100 })
          : Promise.resolve({ items: [], total: 0 }),
      ]);
      setUsers(userList);
      // Group recipe by distinct recipeId
      const uniqueRecipes = new Map<string, { id: string; recipeId: string; name: string; code: string }>();
      for (const item of recipeResult.items) {
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
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session, repo, dataVersion]);

  // Handle Create User
  const handleCreateUser = async () => {
    if (!session) return;
    if (!newEmail.trim() || !newFullName.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ Email và Họ tên');
      return;
    }
    if (newRole === 'viewer' && newCanApprove) {
      setErrorMsg('Quy tắc nghiệp vụ: Vai trò Viewer không thể có quyền Phê duyệt (canApprove)');
      return;
    }

    try {
      setCreateSubmitting(true);
      setErrorMsg(null);
      await repo.createUser(session, {
        email: newEmail.trim().toLowerCase(),
        fullName: newFullName.trim(),
        role: newRole,
        canApprove: newRole === 'viewer' ? false : newCanApprove,
        isLocked: false,
        allowedRecipeIds: newRole === 'viewer' ? newAllowedRecipes : [],
      });
      setSuccessMsg(`Đã tạo tài khoản demo thành công: ${newEmail}`);
      setIsCreateOpen(false);
      // reset form
      setNewEmail('');
      setNewFullName('');
      setNewRole('rnd');
      setNewCanApprove(false);
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
    setEditCanApprove(u.canApprove);
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
    if (editRole === 'viewer' && editCanApprove) {
      setErrorMsg('Không thể cấp quyền Phê duyệt cho vai trò Viewer');
      return;
    }

    try {
      setEditSubmitting(true);
      setErrorMsg(null);
      await repo.updateUser(session, editingUser.id, {
        fullName: editFullName.trim(),
        role: editRole,
        canApprove: editRole === 'viewer' ? false : editCanApprove,
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
      const isLocked = await repo.toggleUserLock(session, targetUser.id);
      setSuccessMsg(
        isLocked
          ? `Đã khóa tài khoản [${targetUser.email}]. Người này không thể đăng nhập demo.`
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

  // Filtered User list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = filterRole === 'all' || u.role === filterRole;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || u.email.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  }, [users, filterRole, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2DDD2]">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Quản lý Tài khoản &amp; Phân quyền Demo</h1>
          <p className="text-[#78716C] text-xs mt-1">
            Thiết lập danh tính người dùng mô phỏng, phân bổ vai trò R&amp;D / Barista Viewer và cấp phép truy cập công thức.
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white border border-[#E2DDD2] rounded-xl shadow-xs">
        <div className="sm:col-span-2">
          <TextInput
            placeholder="Tìm theo email hoặc họ tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <Select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as 'all' | Role)}
            options={[
              { label: 'Tất cả vai trò', value: 'all' },
              { label: 'System Admin', value: 'admin' },
              { label: 'R&D Specialist', value: 'rnd' },
              { label: 'Barista Viewer', value: 'viewer' },
            ]}
          />
        </div>
      </div>

      {/* Users DataTable */}
      <DataTable<User>
        data={filteredUsers}
        keyExtractor={(u) => u.id}
        isLoading={loading}
        emptyTitle="Không tìm thấy người dùng"
        emptyMessage="Hãy điều chỉnh từ khóa tìm kiếm hoặc bấm Thêm người dùng mới."
        columns={[
          {
            header: 'Họ tên & Email',
            render: (u) => (
              <div>
                <div className="font-semibold text-zinc-100 flex items-center gap-2">
                  {u.fullName}
                  {u.isLocked && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-700">
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
            render: (u) => <RoleBadge role={u.role} canApprove={u.canApprove} />,
          },
          {
            header: 'Quyền phê duyệt',
            render: (u) => (
              <div>
                {u.role === 'viewer' ? (
                  <span className="text-xs text-zinc-400 italic">Không áp dụng (Viewer)</span>
                ) : u.canApprove ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5" /> Có quyền duyệt SOP
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400">Chỉ soạn thảo / Đọc</span>
                )}
              </div>
            ),
          },
          {
            header: 'Phạm vi công thức',
            render: (u) => {
              if (u.role !== 'viewer') {
                return <span className="text-xs text-zinc-400">Toàn bộ công thức (theo vai trò)</span>;
              }
              const count = u.allowedRecipeIds ? u.allowedRecipeIds.length : 0;
              return (
                <div className="text-xs">
                  <span className="font-mono text-[#DEBF64] font-semibold">{count}</span> công thức cho phép xem
                </div>
              );
            },
          },
          {
            header: 'Thao tác',
            className: 'text-right',
            render: (u) => (
              <div className="flex items-center justify-end gap-2">
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

      {/* Modal Thêm người dùng mới */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Thêm người dùng Demo mới"
        description="Tạo tài khoản để kiểm thử phân quyền RBAC và trải nghiệm các vai trò trong hệ thống."
        confirmLabel="Lưu tài khoản"
        confirmVariant="gold"
        onConfirm={handleCreateUser}
        isConfirming={createSubmitting}
      >
        <div className="space-y-4">
          <TextInput
            label="Email tài khoản"
            required
            placeholder="barista.demo@beveragelab.vn"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            helper="Mật khẩu demo mặc định là 'demo123'"
          />

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
              if (r === 'viewer') {
                setNewCanApprove(false);
              }
            }}
            options={[
              { label: 'R&D Specialist (Nghiên cứu & phát triển công thức)', value: 'rnd' },
              { label: 'Barista Viewer (Xem SOP & tra cứu vận hành quầy)', value: 'viewer' },
              { label: 'System Admin (Quản trị hệ thống toàn quyền)', value: 'admin' },
            ]}
          />

          {/* Toggle canApprove */}
          <div className="p-3 bg-[#FAF8F2] border border-[#E2DDD2] rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#1C1917]">Cấp quyền Phê duyệt SOP (canApprove)</div>
                <div className="text-[11px] text-[#78716C]">
                  {newRole === 'viewer'
                    ? 'Bị khóa: Viewer tuyệt đối không thể phê duyệt bản nháp R&D.'
                    : 'Cho phép người dùng này duyệt hoặc từ chối các công thức ở trạng thái Chờ duyệt.'}
                </div>
              </div>
              <input
                type="checkbox"
                disabled={newRole === 'viewer'}
                checked={newCanApprove}
                onChange={(e) => setNewCanApprove(e.target.checked)}
                className="w-4 h-4 accent-[#C9A84C] cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>

          {/* Cho phép chọn recipeIds nếu là Viewer */}
          {newRole === 'viewer' && (
            <div className="p-3 bg-[#FAF8F2] border border-[#E2DDD2] rounded-lg space-y-2">
              <div className="text-xs font-semibold text-[#1C1917]">
                Phân quyền xem công thức (Viewer Scope)
              </div>
              <p className="text-[11px] text-[#78716C]">
                Chọn danh sách công thức đã phê duyệt mà Barista này được quyền tra cứu:
              </p>
              {recipes.length === 0 ? (
                <div className="text-xs text-amber-400">Chưa có công thức Approved nào trong hệ thống.</div>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
                  {recipes.map((rcp) => {
                    const checked = newAllowedRecipes.includes(rcp.recipeId);
                    return (
                      <label
                        key={rcp.recipeId}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-[#FAF8F2] text-xs text-[#1C1917] cursor-pointer"
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
        description="Cập nhật quyền hạn và phạm vi công thức cho tài khoản demo."
        confirmLabel="Lưu thay đổi"
        confirmVariant="gold"
        onConfirm={handleEditUser}
        isConfirming={editSubmitting}
      >
        <div className="space-y-4">
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
              if (r === 'viewer') {
                setEditCanApprove(false);
              }
            }}
            options={[
              { label: 'R&D Specialist', value: 'rnd' },
              { label: 'Barista Viewer', value: 'viewer' },
              { label: 'System Admin', value: 'admin' },
            ]}
          />

          <div className="p-3 bg-[#FAF8F2] border border-[#E2DDD2] rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#1C1917]">Quyền Phê duyệt (canApprove)</div>
                <div className="text-[11px] text-[#78716C]">
                  {editRole === 'viewer'
                    ? 'Bị khóa: Viewer không thể có quyền Phê duyệt.'
                    : 'Quyền phê duyệt các bản nháp chờ duyệt trong quy trình R&D.'}
                </div>
              </div>
              <input
                type="checkbox"
                disabled={editRole === 'viewer'}
                checked={editCanApprove}
                onChange={(e) => setEditCanApprove(e.target.checked)}
                className="w-4 h-4 accent-[#C9A84C] cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>

          {editRole === 'viewer' && (
            <div className="p-3 bg-[#FAF8F2] border border-[#E2DDD2] rounded-lg space-y-2">
              <div className="text-xs font-semibold text-[#1C1917]">
                Phân quyền xem công thức (Viewer Scope)
              </div>
              <p className="text-[11px] text-[#78716C]">
                Chỉ định các công thức Barista này được phép mở và xem SOP:
              </p>
              {recipes.length === 0 ? (
                <div className="text-xs text-amber-400">Chưa có công thức Approved nào.</div>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
                  {recipes.map((rcp) => {
                    const checked = editAllowedRecipes.includes(rcp.recipeId);
                    return (
                      <label
                        key={rcp.recipeId}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-[#FAF8F2] text-xs text-[#1C1917] cursor-pointer"
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
