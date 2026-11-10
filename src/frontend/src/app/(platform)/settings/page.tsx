'use client';

import React, { useState } from 'react';
import { Bell, Palette, Shield, Save, Check } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Button } from '@/components/workspace/fields';
import { Switch } from '@/components/workspace/switch';

export default function SettingsPage() {
  const { session, currentUser } = useDemo();
  const [themeMode, setThemeMode] = useState<'warm' | 'system'>('warm');
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tài khoản</p>
        <h1 className="font-display text-3xl font-medium text-foreground sm:text-4xl">Cài đặt Tài khoản &amp; Hệ thống</h1>
        <p className="text-sm text-muted-foreground">Tùy chỉnh giao diện, thông báo phát hành SOP và cấu hình phiên làm việc R&amp;D.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-lg font-medium text-card-foreground">
            <Bell className="h-5 w-5 text-primary" strokeWidth={1.5} /> Thông báo công thức
          </h2>
          <div className="mt-4 divide-y divide-border">
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <label htmlFor="notifications" className="text-sm font-medium text-foreground">Thông báo khi công thức được phát hành</label>
                <p id="notifications-description" className="mt-1 text-xs text-muted-foreground">Nhận cảnh báo trực tiếp trên giao diện khi SOP chuyển sang trạng thái phát hành.</p>
              </div>
              <Switch id="notifications" aria-describedby="notifications-description" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <label htmlFor="auto-save" className="text-sm font-medium text-foreground">Tự động lưu nháp công thức (Auto-save)</label>
                <p id="auto-save-description" className="mt-1 text-xs text-muted-foreground">Tự động lưu lại nguyên liệu và định mức khi đang chỉnh sửa trong R&amp;D Editor.</p>
              </div>
              <Switch id="auto-save" aria-describedby="auto-save-description" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-lg font-medium text-card-foreground">
            <Palette className="h-5 w-5 text-primary" strokeWidth={1.5} /> Giao diện &amp; Chủ đề hiển thị
          </h2>
          <div className="mt-4 divide-y divide-border">
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">Chủ đề giao diện</p>
                <p className="mt-1 text-xs text-muted-foreground">Giao diện mặc định của nền tảng.</p>
              </div>
              <span className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-foreground">Mặc định</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">Phông chữ hệ thống</p>
                <p className="mt-1 text-xs text-muted-foreground">Google Sans hỗ trợ các ký tự tiếng Việt trên nền tảng.</p>
              </div>
              <span className="text-xs font-medium text-foreground">Outfit / Figtree / Google Sans</span>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-lg font-medium text-card-foreground">
          <Shield className="h-5 w-5 text-primary" strokeWidth={1.5} /> Thông tin Tài khoản &amp; Phân quyền
        </h2>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-md bg-secondary p-4"><span className="text-muted-foreground">Họ và tên:</span>{' '}<span className="font-medium text-foreground">{currentUser?.fullName || session?.fullName}</span></div>
          <div className="rounded-md bg-secondary p-4"><span className="text-muted-foreground">Email đăng nhập:</span>{' '}<span className="break-all text-foreground">{session?.email}</span></div>
          <div className="rounded-md bg-secondary p-4"><span className="text-muted-foreground">Vai trò:</span>{' '}<span className="font-medium text-foreground">{session?.role} Specialist</span></div>
          <div className="rounded-md bg-secondary p-4"><span className="text-muted-foreground">Phạm vi công thức:</span>{' '}<span className="font-medium text-foreground">Theo vai trò {session?.role}</span></div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button variant="gold" onClick={handleSave} className="gap-2 px-6">
          {saved ? <><Check className="h-4 w-4" strokeWidth={1.5} /><span>Đã lưu cài đặt</span></> : <><Save className="h-4 w-4" strokeWidth={1.5} /><span>Lưu thay đổi</span></>}
        </Button>
      </div>
    </div>
  );
}
