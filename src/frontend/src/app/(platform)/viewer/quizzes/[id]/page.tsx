import ViewerDetail from '@/components/quizzes/viewer-detail';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
};

export default async function ViewerQuizDetailPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const version = typeof query.version === 'string' ? Number(query.version) : 0;
  return <ViewerDetail quizId={id} version={version} />;
}
