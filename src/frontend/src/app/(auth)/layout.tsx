import React from 'react';
import { ToastProvider } from '@/components/workspace/toast';
import { DemoProvider } from '@/lib/demo/provider';
import '@/components/workspace/workspace.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <ToastProvider>
        <main className="auth-root flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground sm:px-6">{children}</main>
      </ToastProvider>
    </DemoProvider>
  );
}
