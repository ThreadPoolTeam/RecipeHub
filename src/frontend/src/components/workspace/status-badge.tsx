import React from 'react';
import { Sparkles, Camera, AlertTriangle, Check, Archive } from 'lucide-react';
import { RecipeStatus, MediaSource, MediaState, Role } from '@/lib/demo/types';

export function StatusBadge({ status, dot = false }: { status: RecipeStatus; dot?: boolean }) {
  switch (status) {
    case 'Draft':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-info-soft px-2.5 py-1 text-pill font-medium text-info">
          <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
          Bản nháp
        </span>
      );
    case 'Published':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-success-soft px-2.5 py-1 text-pill font-medium text-success">
          {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : <Check className="h-3 w-3" strokeWidth={1.5} />}
          Đã phát hành
        </span>
      );
    case 'Archived':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-pill font-medium text-muted-foreground">
          <Archive className="h-3 w-3" strokeWidth={1.5} />
          Lưu trữ
        </span>
      );
  }
}

export function MediaSourceBadge({ source }: { source: MediaSource }) {
  if (source === 'AiIllustration') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2.5 py-1 text-pill font-medium text-primary">
        <Sparkles className="h-3 w-3" strokeWidth={1.5} />
        Ảnh AI
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-info-soft px-2.5 py-1 text-pill font-medium text-info">
      <Camera className="h-3 w-3" strokeWidth={1.5} />
      Ảnh chụp thực tế
    </span>
  );
}

export function MediaStateBadge({ state }: { state: MediaState }) {
  if (state === 'DeleteFailed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive-soft px-2.5 py-1 text-pill font-medium text-destructive">
        <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
        Lỗi xóa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-success-soft px-2.5 py-1 text-pill font-medium text-success">
      <Check className="h-3 w-3" strokeWidth={1.5} />
      Khả dụng
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  let roleText = 'Người dùng';
  let roleColor = 'bg-secondary text-muted-foreground';

  if (role === 'rnd') {
    roleText = 'Chuyên viên R&D';
    roleColor = 'bg-success-medium text-success';
  } else if (role === 'viewer') {
    roleText = 'Nhân viên pha chế';
    roleColor = 'bg-info-soft text-info';
  } else if (role === 'admin') {
    roleText = 'Quản trị hệ thống';
    roleColor = 'bg-ink text-ink-foreground';
  }
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-pill font-medium ${roleColor}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {roleText}
      </span>
    </div>
  );
}

export function QuizAttemptBadge({ isSubmitted, isPassed }: { isSubmitted: boolean; isPassed?: boolean | null }) {
  if (!isSubmitted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-info-soft px-2.5 py-1 text-pill font-medium text-info">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        Đang làm
      </span>
    );
  }
  if (isPassed === true) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-success-soft px-2.5 py-1 text-pill font-medium text-success">
        <Check className="h-3 w-3" strokeWidth={1.5} />
        Đạt yêu cầu
      </span>
    );
  }
  if (isPassed === false) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive-soft px-2.5 py-1 text-pill font-medium text-destructive">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        Chưa đạt
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-pill font-medium text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      Đã nộp
    </span>
  );
}
