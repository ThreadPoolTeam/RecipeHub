'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { getDefaultDashboardForRole, isPathAllowedForUser } from '@/lib/demo/permissions';
import { TextInput, Button, Alert } from '@/components/workspace/fields';
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '';

  const { login } = useDemo();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="w-full max-w-md bg-white border border-[#E8E2D9] rounded-xl p-8 shadow-xs space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-bold text-[#1A1917] tracking-tight">
          Đăng Nhập RecipeHub
        </h2>
        <p className="text-xs text-[#706E68]">
          Nhập thông tin tài khoản để tiếp tục
        </p>
      </div>
      {errorMsg && (
        <Alert variant="error" title="Đăng nhập thất bại">
          {errorMsg}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
