'use client';

import React, { useEffect, useRef } from 'react';
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
}

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
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg bg-white border border-[#E2DDD2] rounded-lg shadow-xl p-6 text-[#1C1917] space-y-4"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 id="dialog-title" className="text-lg font-bold text-[#1C1917]">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-xs text-[#78716C]">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#78716C] hover:text-[#1C1917] p-1 rounded transition text-sm"
            aria-label="Đóng hộp thoại"
          >
            ✕
          </button>
        </div>

        <div className="py-2 text-sm text-[#1C1917]">{children}</div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2DDD2]">
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
    </div>
  );
}
