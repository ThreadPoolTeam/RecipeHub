'use client';

import React from 'react';
import { DemoProvider } from '@/lib/demo/provider';
import { WorkspaceShell } from '@/components/workspace/workspace-shell';

export default function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DemoProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </DemoProvider>
  );
}
