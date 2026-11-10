'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';
import { quizViewerApi } from '@/lib/api/quiz-viewer';
import { detailUrl, useViewerResource, ViewerEmpty, ViewerError, ViewerFrame, ViewerLoading, ViewerPagination, viewerQuizRoot } from './viewer-shared';
import { QuizCard } from './quiz-card';

export default function ViewerCatalog() {
  const [page, setPage] = useState(1);
  const load = useCallback((actorId: string, signal: AbortSignal) => quizViewerApi.catalog(actorId, page, signal), [page]);
  const { data, loading, error, retry } = useViewerResource(load);
  return (
    <ViewerFrame
      eyebrow="Đào tạo"
      title="Bài kiểm tra dành cho bạn"
      description="Làm bài ngắn để xác nhận bạn nắm đúng công thức chuẩn."
      actions={
        <Link
          href={`${viewerQuizRoot}/history`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-control hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <History size={16} strokeWidth={1.5} /> Lịch sử làm bài
        </Link>
      }
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-panel font-medium">Bộ đề đã ban hành</h2>
        {data && <span className="text-sm text-muted-foreground">{data.total} bộ đề</span>}
      </div>
      {loading ? (
        <ViewerLoading />
      ) : error ? (
        <ViewerError message={error} retry={retry} />
      ) : data && data.items.length === 0 ? (
        <ViewerEmpty title="Chưa có bài kiểm tra khả dụng">
          <p className="text-muted-foreground">Bộ đề đã ban hành theo quyền xem công thức sẽ xuất hiện tại đây.</p>
        </ViewerEmpty>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {data?.items.map((quiz) => (
            <QuizCard
              key={`${quiz.quizId}-${quiz.versionNumber}`}
              code={quiz.code}
              title={quiz.title}
              description={quiz.description}
              version={quiz.versionNumber}
              state="published"
              recipeLabel={quiz.recipeTitle}
              questionsCount={quiz.questionsCount}
              passingScore={quiz.passingScore}
              href={detailUrl(quiz.quizId, quiz.versionNumber)}
            />
          ))}
        </div>
      )}
      {data && <ViewerPagination page={data.page} total={data.total} pageSize={data.pageSize} onChange={setPage} />}
    </ViewerFrame>
  );
}
