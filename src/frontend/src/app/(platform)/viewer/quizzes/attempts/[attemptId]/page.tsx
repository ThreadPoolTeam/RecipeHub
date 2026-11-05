import ViewerTake from '@/components/quizzes/viewer-take';

type Props = { params: Promise<{ attemptId: string }> };

export default async function ViewerQuizAttemptPage({ params }: Props) {
  const { attemptId } = await params;
  return <ViewerTake key={attemptId} attemptId={attemptId} />;
}
