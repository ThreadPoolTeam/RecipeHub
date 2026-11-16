'use client';

import { useEffect } from 'react';

export function useUnsavedChangesGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link || link.getAttribute('href')?.startsWith('#')) return;
      if (!window.confirm('Có thay đổi chưa lưu. Bỏ các thay đổi này?')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', navigate, true);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', navigate, true);
    };
  }, [dirty]);
}

export function confirmLeave(hasUnsavedChanges: boolean) {
  return !hasUnsavedChanges || window.confirm('Có thay đổi chưa lưu. Bỏ các thay đổi này?');
}
