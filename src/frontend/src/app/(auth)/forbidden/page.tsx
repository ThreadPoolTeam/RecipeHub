'use client';

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
    <div className="w-full max-w-md bg-white border border-[#E2DDD2] rounded-xl p-8 shadow-sm text-center space-y-6">
      <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
        <ShieldAlert className="w-6 h-6" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-[#1C1917]">
          403 — Không Đủ Quyền Truy Cập
        </h2>
        <p className="text-xs text-[#78716C] leading-relaxed">
          Tài khoản hiện tại của bạn{' '}
          {session ? (
            <strong className="text-zinc-200">({session.email})</strong>
          ) : (
            ''
          )}{' '}
          không có quyền truy cập vào đường dẫn hoặc tài nguyên nghiệp vụ được yêu cầu.
        </p>
      </div>

      <div className="p-3 bg-[#FAF8F2] rounded-lg border border-[#E2DDD2] text-xs text-[#78716C] text-left space-y-1">
        <div>
          Vai trò của bạn:{' '}
          <span className="font-semibold text-[#1C1917] uppercase">
            {session?.role || 'Chưa xác định'}
          </span>
        </div>
        <div>
          Quyền Phê Duyệt (canApprove):{' '}
          <span className="font-semibold text-[#B47820]">
            {session?.canApprove ? 'Có' : 'Không'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        {session && (
          <Link href={getDefaultDashboardForRole(session.role)} className="w-full">
            <Button variant="gold" size="md" className="w-full">
              Về Không Gian Của Bạn ({session.role.toUpperCase()})
            </Button>
          </Link>
        )}

        <Button
          variant="secondary"
          size="md"
          className="w-full"
          onClick={async () => {
            await logout();
            router.push('/login');
          }}
        >
          Đăng Xuất &amp; Đổi Tài Khoản Khác
        </Button>
      </div>
    </div>
  );
}
