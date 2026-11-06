'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Shield,
  Pencil,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
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

  const roleDescription =
    role === 'rnd'
      ? 'Soạn thảo và chuẩn hóa công thức đồ uống, tính toán định mức, xuất bản SOP và tài liệu kỹ thuật.'
      : role === 'viewer'
      ? 'Tra cứu quy trình pha chế chuẩn, quy đổi sản lượng thực tế và thực hiện bài kiểm tra SOP.'
      : 'Quản trị hệ thống, điều phối danh mục, phân quyền tài khoản và giám sát toàn bộ hoạt động.';

  const workspaceUrl = role === 'viewer' ? '/viewer/recipes' : '/rnd/recipes';
  const workspaceLabel = role === 'viewer' ? 'Mở Kho công thức vận hành' : 'Mở Không gian R&D công thức';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Status */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
        <div className="text-xs text-[#706E68] font-medium">
          Tài khoản &amp; Hồ sơ cá nhân • RecipeHub Profile
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenEditName}
            className="rounded-full gap-1.5 text-xs"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Sửa họ tên</span>
          </Button>
          <ChangePasswordModal />
        </div>
      </div>

      {nameSuccess && (
        <Alert variant="success">
          {nameSuccess}
        </Alert>
      )}

      {/* Hero Profile Card */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#B47820] to-[#E5A84B] text-white flex items-center justify-center text-3xl font-extrabold shadow-sm border-4 border-[#FAF9F5] shrink-0">
            {initials}
          </div>

          {/* User Details */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1917] tracking-tight">
                {fullName || 'Chưa thiết lập họ tên'}
              </h1>
              <div className="flex justify-center">
                <RoleBadge role={role} />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-y-1 gap-x-4 text-xs text-[#706E68]">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#8C887F]" />
                <span className="font-mono">{email}</span>
              </span>
            </div>

            <p className="text-xs text-[#706E68] pt-1 leading-relaxed max-w-2xl">
              {roleDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Account Details & Security Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Security & Authentication */}
        <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#B47820]" />
            <h2 className="text-sm font-bold text-[#1A1917]">Bảo mật &amp; Đăng nhập</h2>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9]">
              <div>
                <span className="text-[#706E68] block">Mật khẩu tài khoản</span>
                <span className="font-mono text-[#1A1917] tracking-widest">••••••••••••</span>
              </div>
              <ChangePasswordModal />
            </div>
            <div className="flex items-center justify-between p-2.5 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9]">
              <span className="text-[#706E68]">Trạng thái tài khoản</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đang hoạt động</span>
              </span>
            </div>
          </div>
        </div>

        {/* Roles & System Access */}
        <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#B47820]" />
            <h2 className="text-sm font-bold text-[#1A1917]">Phân quyền &amp; Phạm vi truy cập</h2>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9] flex items-center justify-between">
              <span className="text-[#706E68]">Vai trò hệ thống</span>
              <span className="font-semibold text-[#1A1917] uppercase tracking-wide">
                {role === 'rnd' ? 'R&D Specialist' : role === 'viewer' ? 'Barista Viewer' : 'System Admin'}
              </span>
            </div>
            <div className="p-2.5 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9]">
              <span className="text-[#706E68] block mb-1">Quyền hạn chính</span>
              <span className="text-[#1A1917] leading-relaxed">
                {role === 'rnd'
                  ? 'Quyền tạo mới, biên tập công thức, quy đổi tỷ lệ và quản lý tài liệu SOP.'
                  : role === 'viewer'
                  ? 'Quyền tra cứu công thức chuẩn, quy đổi sản lượng và thực hiện bài đánh giá kiến thức.'
                  : 'Toàn quyền cấu hình hệ thống, quản lý tài khoản, nhật ký audit và dữ liệu nền tảng.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Shortcut to Workspace */}
      <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#B47820]" />
            <h2 className="text-sm font-bold text-[#1A1917]">Không gian làm việc</h2>
          </div>
          <p className="text-xs text-[#706E68]">
            Truy cập trực tiếp vào phân hệ chuyên môn của bạn để quản lý hoặc tra cứu công thức.
          </p>
        </div>
        <Link href={workspaceUrl}>
          <Button size="sm" className="rounded-full gap-1.5 text-xs whitespace-nowrap">
            <span>{workspaceLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* Edit Name Modal */}
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
