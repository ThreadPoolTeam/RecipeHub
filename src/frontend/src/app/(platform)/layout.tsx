'use client';

import React from 'react';
import { DemoProvider } from '@/lib/demo/provider';
import { WorkspaceShell } from '@/components/workspace/workspace-shell';
import { ToastProvider } from '@/components/workspace/toast';

export default function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DemoProvider>
      <ToastProvider>
        <WorkspaceShell>{children}</WorkspaceShell>
      </ToastProvider>
    </DemoProvider>
  );
}
