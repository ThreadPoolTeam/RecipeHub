import ViewerResult from '@/components/quizzes/viewer-result';

type Props = { params: Promise<{ attemptId: string }> };

export default async function ViewerQuizResultPage({ params }: Props) {
  const { attemptId } = await params;
  return <ViewerResult key={attemptId} attemptId={attemptId} />;
}
