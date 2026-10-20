'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { RecipeVersion } from '@/lib/demo/types';
import { DocumentWorkspace } from '@/components/workspace/document-workspace';
import { Button, Alert } from '@/components/workspace/fields';

export default function RecipeDocumentPage() {
  const params = useParams();
  const id = params?.id as string;
  const { session, repo } = useDemo();

  const [recipe, setRecipe] = useState<RecipeVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !id) return;
    let isMounted = true;
    setLoading(true);

    repo
      .getRecipeVersion(session, id)
      .then((rec) => {
        if (!isMounted) return;
        setRecipe(rec);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const e = err as Error;
        setErrorMsg(e.message || 'Không thể tải thông tin công thức.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session, repo, id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-[#706E68]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B47820]" />
        <p className="mt-3 text-sm">Đang nạp không gian biên tập tài liệu SOP...</p>
      </div>
    );
  }

  if (errorMsg || !recipe) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <Alert type="error" message={errorMsg || 'Không tìm thấy công thức.'} />
        <Link href="/rnd/recipes">
          <Button variant="secondary">← Quay về danh sách công thức</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E2D9] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#706E68] mb-1">
            <Link href="/rnd/recipes" className="hover:text-[#1A1917]">
              Công Thức R&amp;D
            </Link>
            <span>/</span>
            <Link href={`/rnd/recipes/${recipe.id}`} className="hover:text-[#1A1917] font-mono text-[#B47820]">
              {recipe.code}
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#1A1917]">Biên Tập Tài Liệu SOP</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1917] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#B47820]" /> Hồ Sơ &amp; Tài Liệu SOP: {recipe.name}
          </h1>
        </div>

        <Link href={`/rnd/recipes/${recipe.id}`}>
          <Button variant="secondary" size="sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Trở lại chi tiết công thức
          </Button>
        </Link>
      </div>

      {/* Shared Document Workspace */}
      <DocumentWorkspace recipe={recipe} />
    </div>
  );
}
