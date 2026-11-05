import { Suspense } from 'react';
import { ManagementEditor } from '@/components/quizzes/management-editor';
export default async function Page({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  return <Suspense fallback={<p role="status">Đang tải bộ đề…</p>}><ManagementEditor quizId={quizId} /></Suspense>;
}
