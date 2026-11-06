'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './fields';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'gold';
  isConfirming?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

const maxWidthMap: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};
export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  onConfirm,
  confirmLabel = 'Xác nhận',
  confirmVariant = 'gold',
  isConfirming = false,
  maxWidth = 'lg',
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center p-4 sm:p-6 bg-zinc-950/70 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* Backdrop click outside */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        className={`relative z-10 w-full ${maxWidthMap[maxWidth] || 'max-w-lg'} max-h-[88vh] flex flex-col min-h-0 bg-white border border-[#E8E2D9] rounded-2xl shadow-2xl p-6 text-[#1A1917]`}
      >
        <div className="flex items-start justify-between shrink-0 mb-3">
          <div>
            <h3 id="dialog-title" className="text-lg font-bold text-[#1A1917]">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-xs text-[#706E68]">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#706E68] hover:text-[#1A1917] p-1 rounded transition text-sm"
            aria-label="Đóng hộp thoại"
          >
            ✕
          </button>
        </div>

        <div className="py-2 text-sm text-[#1A1917] overflow-y-auto flex-1 min-h-0 pr-1 space-y-4">{children}</div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E2D9] shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={isConfirming}>
            Hủy bỏ
          </Button>
          {onConfirm && (
            <Button
              variant={confirmVariant}
              onClick={onConfirm}
              isLoading={isConfirming}
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
