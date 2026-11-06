import ViewerHistory from '@/components/quizzes/viewer-history';

type Props = { searchParams: Promise<{ quizId?: string | string[]; version?: string | string[] }> };

export default async function ViewerQuizHistoryPage({ searchParams }: Props) {
  const query = await searchParams;
  const quizId = typeof query.quizId === 'string' ? query.quizId : undefined;
  const parsed = typeof query.version === 'string' ? Number(query.version) : 0;
  const version = Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  return <ViewerHistory key={`${quizId ?? ''}-${version ?? ''}`} quizId={quizId} version={version} />;
}
