import { Suspense } from 'react';
import { ManagementResults } from '@/components/quizzes/management-results';
export default function Page() { return <Suspense fallback={<p role="status">Đang tải kết quả…</p>}><ManagementResults /></Suspense>; }
