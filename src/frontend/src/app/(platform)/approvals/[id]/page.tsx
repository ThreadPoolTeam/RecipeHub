'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ApprovalWorkspace } from '@/components/workspace/approval-workspace';

export default function ApprovalDetailPage() {
  const params = useParams();
  const recipeId = params?.id as string;

  if (!recipeId) {
    return <div className="p-8 text-center text-zinc-400">Không tìm thấy mã hồ sơ.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/approvals"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 transition"
        >
          <span>&larr;</span>
          <span>Quay lại danh sách Hàng chờ phê duyệt</span>
        </Link>
      </div>

      <ApprovalWorkspace recipeId={recipeId} />
    </div>
  );
}
