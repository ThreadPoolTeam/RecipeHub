'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FlaskConical, CheckSquare, Coffee, Settings, LogIn } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { getDefaultDashboardForRole, isPathAllowedForUser } from '@/lib/demo/permissions';
import { DEMO_PASSWORD } from '@/lib/demo/seed';
import { TextInput, Button, Alert } from '@/components/workspace/fields';
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '';

  const { login } = useDemo();
  const [email, setEmail] = useState('rd@recipehub.demo');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const session = await login(email, password);
      // Validate internal redirect
      if (nextParam.startsWith('/') && !nextParam.startsWith('//') && !nextParam.includes('\\') && isPathAllowedForUser(nextParam, session).allowed) {
        router.push(nextParam);
      } else {
        router.push(getDefaultDashboardForRole(session.role));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập không thành công';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const setPresetUser = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword(DEMO_PASSWORD);
    setErrorMsg(null);
  };

  return (
    <div className="w-full max-w-md bg-white border border-[#E8E2D9] rounded-xl p-8 shadow-xs space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-bold text-[#1A1917] tracking-tight">
          Đăng Nhập RecipeHub
        </h2>
        <p className="text-xs text-[#706E68]">
          Chọn một tài khoản mẫu kiểm thử nhanh hoặc nhập thông tin.
        </p>
      </div>
      {errorMsg && (
        <Alert variant="error" title="Đăng nhập thất bại">
          {errorMsg}
        </Alert>
      )}

      {/* Preset Accounts Picker */}
      <div className="space-y-2 pt-1">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#706E68]">
          Tài khoản kiểm thử nhanh (Bấm để chọn):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setPresetUser('rd@recipehub.demo')}
            className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
              email === 'rd@recipehub.demo'
                ? 'bg-[#F5F0E8] border-[#B47820] ring-1 ring-[#B47820]/40'
                : 'bg-white border-[#E8E2D9] hover:bg-[#FAF9F5]'
            }`}
          >
            <div className="font-semibold text-[#1A1917] flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-[#B47820]" /> R&amp;D
            </div>
            <div className="text-[10px] text-[#706E68] mt-1 font-mono truncate">rd@recipehub.demo</div>
            <span className="text-[9px] text-[#B47820] font-medium mt-0.5">Tạo &amp; Tự Duyệt</span>
          </button>

          <button
            type="button"
            onClick={() => setPresetUser('viewer@recipehub.demo')}
            className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
              email === 'viewer@recipehub.demo'
                ? 'bg-[#F5F0E8] border-[#B47820] ring-1 ring-[#B47820]/40'
                : 'bg-white border-[#E8E2D9] hover:bg-[#FAF9F5]'
            }`}
          >
            <div className="font-semibold text-[#1A1917] flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-emerald-600" /> Barista
            </div>
            <div className="text-[10px] text-[#706E68] mt-1 font-mono truncate">viewer@recipehub.demo</div>
            <span className="text-[9px] text-[#706E68] font-medium mt-0.5">Tra cứu SOP</span>
          </button>

          <button
            type="button"
            onClick={() => setPresetUser('admin@recipehub.demo')}
            className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
              email === 'admin@recipehub.demo'
                ? 'bg-[#F5F0E8] border-[#B47820] ring-1 ring-[#B47820]/40'
                : 'bg-white border-[#E8E2D9] hover:bg-[#FAF9F5]'
            }`}
          >
            <div className="font-semibold text-[#1A1917] flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-purple-600" /> Admin
            </div>
            <div className="text-[10px] text-[#706E68] mt-1 font-mono truncate">admin@recipehub.demo</div>
            <span className="text-[9px] text-[#706E68] font-medium mt-0.5">Toàn quyền</span>
          </button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <TextInput
          label="Địa chỉ Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@recipehub.demo"
        />

        <TextInput
          label="Mật khẩu"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="gold"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            isLoading={isLoading}
          >
            <LogIn className="w-4 h-4" /> Đăng Nhập Vào Hệ Thống
          </Button>
        </div>
      </form>

      <div className="text-center">
        <p className="text-[11px] text-[#706E68]">
          Mật khẩu chung cho các tài khoản demo:{' '}
          <code className="text-[#B47820] font-mono font-bold bg-[#F5F0E8] border border-[#E8E2D9] px-1.5 py-0.5 rounded">
            {DEMO_PASSWORD}
          </code>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-zinc-400 text-xs">Đang tải trang đăng nhập...</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
