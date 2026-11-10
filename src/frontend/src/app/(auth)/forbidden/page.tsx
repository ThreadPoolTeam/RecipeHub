'use client';

import { pageTitleClass } from '@/components/workspace/page-header';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { getDefaultDashboardForRole } from '@/lib/demo/permissions';
import { Button } from '@/components/workspace/fields';

export default function ForbiddenPage() {
  const router = useRouter();
  const { session, logout } = useDemo();

  return (
    <div className="w-full max-w-lg space-y-8 text-center">
      <ShieldAlert aria-hidden="true" className="mx-auto h-7 w-7 text-primary" strokeWidth={1.5} />
      <div className="space-y-2">
        <h1 className={pageTitleClass}>
          Không đủ quyền truy cập
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Tài khoản của bạn không có quyền xem trang này. Hãy quay về khu vực làm việc của bạn hoặc liên hệ quản trị viên.
        </p>
      </div>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        {session && (
          <Link href={getDefaultDashboardForRole(session.role)}>
            <Button variant="gold" size="md">
              Về khu vực làm việc
            </Button>
          </Link>
        )}

        <Button
          variant="secondary"
          size="md"
          className="w-full sm:w-auto"
          onClick={async () => {
            await logout();
            router.push('/login');
          }}
        >
          Đăng nhập tài khoản khác
        </Button>
      </div>
    </div>
  );
}
