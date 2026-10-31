import React from 'react';

export default function PlatformLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-[#E8E2D9] rounded-md" />
          <div className="h-7 w-48 bg-[#E8E2D9] rounded-md" />
          <div className="h-4 w-72 bg-[#F5F0E8] rounded-md" />
        </div>
        <div className="h-9 w-32 bg-[#E8E2D9] rounded-md" />
      </div>

      {/* Content skeleton card */}
      <div className="bg-white rounded-xl border border-[#E8E2D9] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#F5F0E8]">
          <div className="h-9 w-64 bg-[#F5F0E8] rounded-lg" />
          <div className="h-9 w-36 bg-[#F5F0E8] rounded-lg" />
        </div>
        <div className="space-y-3 pt-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-[#FAF9F5] rounded-lg border border-[#F5F0E8]" />
          ))}
        </div>
      </div>
    </div>
  );
}
