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
  const [targetUrl, setTargetUrl] = useState<string>(`/rnd/documents/new`);

  useEffect(() => {
    let isMounted = true;
    async function resolveTarget() {
      if (!id) return;
      if (session) {
        try {
          const item = await repo.getRecipeVersion(session, id);
          if (item && isMounted) {
            const url = `/rnd/documents/new?recipeId=${item.recipeId || item.id}&versionId=${item.versionId || item.id}`;
            setTargetUrl(url);
            router.replace(url);
            return;
          }
        } catch {
          // Fallback
        }
      }
      if (isMounted) {
        const fallback = `/rnd/documents/new?recipeId=${id}&versionId=${id}`;
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
    <div className="mx-auto max-w-md space-y-4 p-12 text-center text-muted-foreground">
      <div className="inline-block h-8 w-8 rounded-full border-b-2 border-primary motion-safe:animate-spin" />
      <h2 className="flex items-center justify-center gap-2 text-base text-foreground font-medium font-display">
        <FileText className="h-5 w-5 text-primary" strokeWidth={1.5} /> Đang chuyển sang Không Gian Quản Lý Ấn Phẩm PDF...
      </h2>
      <p className="text-xs text-muted-foreground">
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
