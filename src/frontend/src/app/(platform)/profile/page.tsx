'use client';

import { pageTitleClass } from '@/components/workspace/page-header';

import React, { useState } from 'react';
import { Mail, Save } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Button, TextInput, Alert } from '@/components/workspace/fields';
import { RoleBadge } from '@/components/workspace/status-badge';
import { ChangePasswordModal } from '@/components/shared/ChangePasswordModal';
import { useToast } from '@/components/workspace/toast';

export default function ProfilePage() {
  const { session, currentUser, repo, refresh } = useDemo();
  const { toast } = useToast();

  const [nameInput, setNameInput] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  const fullName = currentUser?.fullName || session?.fullName || '';
  const email = session?.email || currentUser?.email || '';
  const role = session?.role || currentUser?.role || 'rnd';
  const editedName = nameInput ?? fullName;
  const trimmedName = editedName.trim();
  const canSaveName = trimmedName.length >= 2 && trimmedName.length <= 100 && trimmedName !== fullName.trim();

  const initials = fullName
    ? fullName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : 'U';

  const handleSaveName = async () => {
    const trimmed = editedName.trim();
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
      setNameInput(null);
      toast({ type: 'success', title: 'Cập nhật họ tên thành công' });
    } catch {
      toast({ type: 'error', title: 'Không thể cập nhật họ tên', description: 'Vui lòng thử lại.' });
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
      : 'Quản trị tài khoản, giám sát hệ thống và theo dõi nhật ký hoạt động.';

  return (
    <div className="mx-auto space-y-8 pb-12">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tài khoản</p>
          <h1 className={`mt-2 ${pageTitleClass}`}>Hồ sơ cá nhân</h1>
          <p className="mt-2 text-sm text-muted-foreground">Thông tin hiển thị cho đồng nghiệp trong RecipeHub.</p>
        </div>
        <ChangePasswordModal />
      </header>

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
            <TextInput label="Họ và tên" value={editedName} onChange={(e) => { setNameInput(e.target.value); setNameError(''); }} disabled={savingName} helper="Tối thiểu 2 ký tự, tối đa 100 ký tự." />
            <TextInput label="Email" value={email || 'Chưa cập nhật'} readOnly />
            <TextInput label="Vai trò" value={roleLabel} readOnly />
          </div>
          {nameError && <div className="mt-5"><Alert variant="error">{nameError}</Alert></div>}
          <p className="mt-5 text-sm text-muted-foreground">{roleDescription}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="primary" size="sm" onClick={handleSaveName} disabled={!canSaveName} isLoading={savingName}>
              <Save className="mr-1.5 h-4 w-4" strokeWidth={1.5} />Lưu
            </Button>
          </div>
        </section>
      </div>

    </div>
  );
}
