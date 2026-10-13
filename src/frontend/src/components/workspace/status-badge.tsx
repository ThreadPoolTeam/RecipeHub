import React from 'react';
import { Sparkles, Camera, AlertTriangle, Check, ShieldCheck, Clock, Archive } from 'lucide-react';
import { RecipeStatus, MediaSource, MediaState, Role } from '@/lib/demo/types';

export function StatusBadge({ status }: { status: RecipeStatus }) {
  switch (status) {
    case 'Draft':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Nháp (Draft)
        </span>
      );
    case 'PendingApproval':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
          <Clock className="w-3 h-3 text-blue-600 animate-pulse" />
          Chờ duyệt
        </span>
      );
    case 'Approved':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Check className="w-3 h-3 text-emerald-600" />
          Đã duyệt
        </span>
      );
    case 'Archived':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
          <Archive className="w-3 h-3 text-zinc-500" />
          Lưu trữ
        </span>
      );
  }
}

export function MediaSourceBadge({ source }: { source: MediaSource }) {
  if (source === 'AiIllustration') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
        <Sparkles className="w-3 h-3 text-purple-600" />
        AI Concept
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
      <Camera className="w-3 h-3 text-sky-600" />
      Thực tế (Real)
    </span>
  );
}

export function MediaStateBadge({ state }: { state: MediaState }) {
  if (state === 'DeleteFailed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
        <AlertTriangle className="w-3 h-3 text-rose-600" />
        Lỗi xóa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <Check className="w-3 h-3 text-emerald-600" />
      Khả dụng
    </span>
  );
}

export function RoleBadge({ role, canApprove }: { role: Role; canApprove?: boolean }) {
  let roleText = 'Người dùng';
  let roleColor = 'bg-zinc-100 text-zinc-700 border-zinc-200';

  if (role === 'rnd') {
    roleText = 'R&D Specialist';
    roleColor = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (role === 'viewer') {
    roleText = 'Barista Viewer';
    roleColor = 'bg-blue-50 text-blue-800 border-blue-200';
  } else if (role === 'admin') {
    roleText = 'System Admin';
    roleColor = 'bg-purple-50 text-purple-800 border-purple-200';
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${roleColor}`}>
        {roleText}
      </span>
      {canApprove && (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          Quyền Duyệt
        </span>
      )}
    </div>
  );
}
