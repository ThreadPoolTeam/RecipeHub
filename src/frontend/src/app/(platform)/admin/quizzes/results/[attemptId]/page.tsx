import { ManagementResultView } from '@/components/quizzes/management-results';
export default async function Page({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  return <ManagementResultView attemptId={attemptId} />;
}