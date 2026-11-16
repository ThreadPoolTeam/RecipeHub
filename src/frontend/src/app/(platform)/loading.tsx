import React from 'react';

export default function PlatformLoading() {
  return (
    <div role="status" aria-label="Đang tải nội dung" className="mx-auto max-w-7xl space-y-8 motion-safe:animate-pulse">
      <div className="space-y-3">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-10 w-64 max-w-full rounded bg-muted" />
        <div className="h-4 w-80 max-w-full rounded bg-muted" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="space-y-5 rounded-lg border border-border bg-card p-6 shadow-soft">
            <div className="h-6 w-6 rounded bg-muted" />
            <div className="h-6 w-40 max-w-full rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
