'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Coffee, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="w-full max-w-[448px] space-y-8 border-y border-border py-10 [color-scheme:light]">
      <div className="flex items-center gap-2 font-display text-lg font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Coffee aria-hidden="true" size={20} strokeWidth={1.5} />
        </span>
        RecipeHub
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-medium text-foreground sm:text-[40px] sm:leading-[48px]">Chào mừng trở lại</h1>
        <p className="text-sm text-muted-foreground">Không gian nghiên cứu cà phê &amp; đồ uống.</p>
      </div>
      {errorMsg && (
        <Alert variant="error" title="Đăng nhập thất bại">
          {errorMsg}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextInput
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ban@beveragelab.vn"
        />

        <div className="relative">
          <TextInput
            label="Mật khẩu"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword} className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
            {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
          </button>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="gold"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            isLoading={isLoading}
          >
            Đăng nhập
          </Button>
        </div>
      </form>
      <p className="text-center text-xs text-muted-foreground">Gặp sự cố? Liên hệ quản trị viên hệ thống.</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-xs text-muted-foreground">Đang tải trang đăng nhập...</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
