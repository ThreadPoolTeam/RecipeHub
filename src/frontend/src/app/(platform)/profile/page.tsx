'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Pencil, ArrowRight } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Button, TextInput, Alert } from '@/components/workspace/fields';
import { Dialog } from '@/components/workspace/dialog';
import { RoleBadge } from '@/components/workspace/status-badge';
import { ChangePasswordModal } from '@/components/shared/ChangePasswordModal';

export default function ProfilePage() {
  const { session, currentUser, repo, refresh } = useDemo();

  // Edit Name Modal State
  const [openEditName, setOpenEditName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');

  const fullName = currentUser?.fullName || session?.fullName || '';
  const email = session?.email || currentUser?.email || '';
  const role = session?.role || currentUser?.role || 'rnd';

  const initials = fullName
    ? fullName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : 'U';

  const handleOpenEditName = () => {
    setNameInput(fullName);
    setNameError('');
    setOpenEditName(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError('Họ và tên không được để trống.');
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 100) {
      setNameError('Họ và tên phải có độ dài từ 2 đến 100 ký tự.');
      return;
    }

    if (!session) {
      setNameError('Không tìm thấy phiên làm việc.');
      return;
    }

    setSavingName(true);
    setNameError('');
    try {
      await repo.updateProfile(session, trimmed);
      await refresh();
      setOpenEditName(false);
      setNameSuccess('Cập nhật họ tên thành công.');
      setTimeout(() => setNameSuccess(''), 3000);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Không thể cập nhật họ tên. Vui lòng thử lại.');
    } finally {
      setSavingName(false);
    }
  };

  const roleLabel = role === 'rnd' ? 'Chuyên viên R&D' : role === 'viewer' ? 'Barista Viewer' : 'Quản trị viên';
  const roleDescription =
    role === 'rnd'
      ? 'Soạn thảo và chuẩn hóa công thức đồ uống, tính toán định mức, xuất bản SOP và tài liệu kỹ thuật.'
      : role === 'viewer'
      ? 'Tra cứu quy trình pha chế chuẩn, quy đổi sản lượng thực tế và thực hiện bài kiểm tra SOP.'
      : 'Quản trị tài khoản, giám sát hệ thống và theo dõi nhật ký kiểm toán.';
  const workspaceUrl = role === 'viewer' ? '/viewer/recipes' : role === 'admin' ? '/admin' : '/rnd/recipes';
  const workspaceLabel =
    role === 'viewer' ? 'Mở Kho công thức vận hành' : role === 'admin' ? 'Mở Trung tâm Quản trị' : 'Mở Không gian R&D công thức';

  return (
    <div className="mx-auto space-y-8 pb-12">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tài khoản</p>
          <h1 className="mt-2 font-display text-3xl font-medium text-foreground sm:text-4xl">Hồ sơ cá nhân</h1>
          <p className="mt-2 text-sm text-muted-foreground">Thông tin hiển thị cho đồng nghiệp trong RecipeHub.</p>
        </div>
        <ChangePasswordModal />
      </header>

      {nameSuccess && <Alert variant="success">{nameSuccess}</Alert>}

      <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
        <section className="flex flex-col items-center rounded-lg border border-border bg-card p-8 text-center shadow-soft">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-2xl font-medium text-primary">
            {initials}
          </div>
          <h2 className="mt-6 font-display text-lg font-medium text-card-foreground">{fullName || 'Chưa thiết lập họ tên'}</h2>
          <div className="mt-1"><RoleBadge role={role} /></div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-4 w-4" strokeWidth={1.5} />
            {email || 'Chưa cập nhật'}
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-medium text-card-foreground">Thông tin</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <TextInput label="Họ và tên" value={fullName || 'Chưa cập nhật'} readOnly />
            <TextInput label="Email" value={email || 'Chưa cập nhật'} readOnly />
            <TextInput label="Vai trò" value={roleLabel} readOnly />
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{roleDescription}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="primary" size="sm" onClick={handleOpenEditName}>
              <Pencil className="mr-1.5 h-4 w-4" strokeWidth={1.5} />Sửa họ tên
            </Button>
            <Link href={workspaceUrl} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              {workspaceLabel}<ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </section>
      </div>

      <Dialog
        isOpen={openEditName}
        onClose={() => {
          if (!savingName) setOpenEditName(false);
        }}
        title="Chỉnh sửa họ và tên"
        description="Cập nhật tên hiển thị của bạn trong toàn bộ hệ thống RecipeHub."
        onConfirm={handleSaveName}
        confirmLabel="Lưu thay đổi"
        isConfirming={savingName}
      >
        <div className="space-y-3">
          {nameError && <Alert variant="error">{nameError}</Alert>}
          <TextInput
            label="Họ và tên hiển thị"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Ví dụ: Nguyễn Văn A"
            helper="Tối thiểu 2 ký tự, tối đa 100 ký tự."
            autoFocus
          />
        </div>
      </Dialog>
    </div>
  );
}
