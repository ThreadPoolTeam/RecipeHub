'use client';

import React, { useState } from 'react';
import { Settings, Bell, Palette, Globe, Shield, Save, Check } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Button } from '@/components/workspace/fields';

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
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="pb-4 border-b border-[#E8E2D9]">
        <h1 className="text-2xl font-bold text-[#1A1917]">Cài đặt Tài khoản &amp; Hệ thống</h1>
        <p className="text-xs text-[#706E68] mt-1">
          Tùy chỉnh giao diện, thông báo phát hành SOP và cấu hình phiên làm việc R&amp;D.
        </p>
      </div>

      {/* Interface Settings */}
      <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#1A1917]">
          <Palette className="w-4 h-4 text-[#B47820]" />
          <span>Giao diện &amp; Chủ đề hiển thị</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9]">
            <div>
              <div className="text-xs font-semibold text-[#1A1917]">Chủ đề Warm Editorial (Cà phê &amp; Đồ uống)</div>
              <div className="text-[11px] text-[#706E68]">Nền kem ấm #FAF9F5, viền hairline #E8E2D9, điểm nhấn vàng mật ong.</div>
            </div>
            <span className="text-xs font-bold text-[#B47820] bg-white px-2.5 py-1 rounded-full border border-[#B47820]/30 shadow-xs">
              Mặc định
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9]">
            <div>
              <div className="text-xs font-semibold text-[#1A1917]">Phông chữ hệ thống</div>
              <div className="text-[11px] text-[#706E68]">Khóa phông Google Sans tiếng Việt tiêu chuẩn toàn nền tảng.</div>
            </div>
            <span className="text-xs font-mono font-semibold text-[#1A1917]">Google Sans</span>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#1A1917]">
          <Bell className="w-4 h-4 text-[#B47820]" />
          <span>Thông báo công thức</span>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9] cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-[#1A1917]">Thông báo khi công thức được phát hành</div>
              <div className="text-[11px] text-[#706E68]">Nhận cảnh báo trực tiếp trên giao diện khi SOP chuyển sang trạng thái phát hành.</div>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-4 h-4 accent-[#B47820]"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9] cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-[#1A1917]">Tự động lưu nháp công thức (Auto-save)</div>
              <div className="text-[11px] text-[#706E68]">Tự động lưu lại nguyên liệu và định mức khi đang chỉnh sửa trong R&amp;D Editor.</div>
            </div>
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className="w-4 h-4 accent-[#B47820]"
            />
          </label>
        </div>
      </div>

      {/* Security & Role Details */}
      <div className="p-5 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#1A1917]">
          <Shield className="w-4 h-4 text-[#B47820]" />
          <span>Thông tin Tài khoản &amp; Phân quyền</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9]">
            <span className="text-[#706E68]">Họ và tên:</span>{' '}
            <span className="font-semibold text-[#1A1917]">{currentUser?.fullName || session?.fullName}</span>
          </div>
          <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9]">
            <span className="text-[#706E68]">Email đăng nhập:</span>{' '}
            <span className="font-mono text-[#1A1917]">{session?.email}</span>
          </div>
          <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9]">
            <span className="text-[#706E68]">Vai trò:</span>{' '}
            <span className="font-bold text-[#B47820] uppercase">{session?.role} Specialist</span>
          </div>
          <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E2D9]">
            <span className="text-[#706E68]">Phạm vi công thức:</span>{' '}
            <span className="font-semibold text-emerald-700">Theo vai trò {session?.role}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="gold" onClick={handleSave} className="gap-2 px-6">
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              <span>Đã lưu cài đặt</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Lưu thay đổi</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
