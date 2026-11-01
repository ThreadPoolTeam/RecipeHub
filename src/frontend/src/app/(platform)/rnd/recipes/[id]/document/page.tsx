'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/workspace/fields';
import { useDemo } from '@/lib/demo/provider';

export default function RecipeDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { session, repo } = useDemo();
  const [targetUrl, setTargetUrl] = useState<string>(`/rnd/documents`);

  useEffect(() => {
    let isMounted = true;
    async function resolveTarget() {
      if (!id) return;
      if (session) {
        try {
          const item = await repo.getRecipeVersion(session, id);
          if (item && isMounted) {
            const url = `/rnd/documents?recipeId=${item.recipeId || item.id}&versionId=${item.versionId || item.id}`;
            setTargetUrl(url);
            router.replace(url);
            return;
          }
        } catch {
          // Fallback
        }
      }
      if (isMounted) {
        const fallback = `/rnd/documents?recipeId=${id}&versionId=${id}`;
        setTargetUrl(fallback);
        router.replace(fallback);
      }
    }
    resolveTarget();
    return () => {
      isMounted = false;
    };
  }, [id, session, repo, router]);
  return (
    <div className="p-12 text-center text-[#706E68] space-y-4 max-w-md mx-auto">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B47820]" />
      <h2 className="text-base font-semibold text-[#1A1917] flex items-center justify-center gap-2">
        <FileText className="w-5 h-5 text-[#B47820]" /> Đang chuyển sang Không Gian Quản Lý Ấn Phẩm PDF...
      </h2>
      <p className="text-xs text-[#706E68]">
        Nếu trình duyệt không tự chuyển hướng, vui lòng bấm nút bên dưới.
      </p>
      {id && (
        <Link href={targetUrl}>
          <Button variant="secondary" size="sm">
            Đi tới Không Gian Quản Lý Ấn Phẩm PDF <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      )}
    </div>
  );
}
