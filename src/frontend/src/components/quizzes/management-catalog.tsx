'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Plus, ArrowUpRight } from 'lucide-react';
import { quizManagement, type QuizPage, type QuizSummary } from '@/lib/api/quiz-management';
import { SearchInput, Select, Button } from '@/components/workspace/fields';
import { ManagementFrame, Message, Pagination, QuizStatus, errorText, useManagementContext } from './management-shared';
export function ManagementCatalog() {
  const { session, base } = useManagementContext();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<QuizPage<QuizSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!session || session.role === 'viewer') return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      quizManagement.list(session.userId, { title: title.trim(), code: code.trim(), state, page, pageSize: 12 }, controller.signal).then(setData).catch(e => { if (!controller.signal.aborted) { setError(errorText(e)); setData(null); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [session, title, code, state, page, retry]);
  return (
    <ManagementFrame
      title="Bộ đề kiểm tra"
      description="Soạn bộ đề theo công thức, ban hành cho cửa hàng và theo dõi kết quả làm bài."
      actions={<div className="flex flex-wrap gap-2">
        <Link href={`${base}/results`} className="inline-flex h-9 items-center rounded-md border border-input bg-card px-4 text-sm font-semibold shadow-control focus-visible:ring-2 focus-visible:ring-ring">Kết quả làm bài</Link>
        <Link href={`${base}/new`}>
          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1" strokeWidth={1.5} /> Tạo bộ đề mới
          </Button>
        </Link>
      </div>}
    >
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <SearchInput
            placeholder="Tìm theo tên bộ đề..."
            value={title}
            onChange={event => { setTitle(event.target.value); setPage(1); }}
            onClear={() => { setTitle(''); setPage(1); }}
          />
        </div>
        <div>
          <SearchInput
            placeholder="Tìm theo mã bộ đề..."
            value={code}
            onChange={event => { setCode(event.target.value); setPage(1); }}
            onClear={() => { setCode(''); setPage(1); }}
          />
        </div>
        <div>
          <Select
            value={state}
            onChange={event => { setState(event.target.value); setPage(1); }}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'draft', label: 'Bản nháp' },
              { value: 'published', label: 'Đã ban hành' },
              { value: 'archived', label: 'Đã lưu trữ' },
            ]}
          />
        </div>
      </div>
      <Message error={error} />
      {error && <Button onClick={() => setRetry(value => value + 1)}>Thử lại</Button>}
      <div aria-busy={loading}>
        {loading ? (
          <div className="grid gap-6 motion-safe:animate-pulse md:grid-cols-2" role="status">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4 rounded-lg border border-border bg-card p-6">
                <div className="h-5 w-20 rounded bg-muted" />
                <div className="h-6 w-3/4 rounded bg-muted" />
                <div className="h-10 w-full rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : data?.items.length ? (
          <div className="grid gap-6 md:grid-cols-2">
            {data.items.map(item => {
              const version = [...item.versions].sort((a, b) => b.versionNumber - a.versionNumber).find(v => !state || v.state === state);
              return (
                <article key={item.quizId} className="space-y-3 rounded-lg border border-border bg-card p-6 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><BookOpen size={22} strokeWidth={1.5} /></span>
                    {version && <QuizStatus state={version.state} />}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.code}</p>
                  <h2 className="font-display text-card-title font-medium">{item.title}</h2>
                  <p className="text-sm text-muted-foreground">{item.description || 'Chưa có mô tả.'}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{item.versions.length} phiên bản</span>
                    {version && <><span>{version.questionsCount} câu hỏi</span><span>Đạt từ {version.passingScore}%</span></>}
                  </div>
                  {version && (
                    <Link className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline" href={`${base}/${item.quizId}?version=${version.versionNumber}`}>
                      Mở phiên bản v{version.versionNumber}<ArrowUpRight size={17} />
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        ) : !error && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <BookOpen className="mx-auto mb-3" size={32} strokeWidth={1.5} />
            <h2 className="font-display text-panel text-foreground">Chưa có bộ đề phù hợp</h2>
            <p>Thay bộ lọc hoặc tạo bộ đề đầu tiên từ công thức đã ban hành.</p>
          </div>
        )}
      </div>
      {data && <Pagination page={page} total={data.total} pageSize={12} onPage={setPage} disabled={loading} />}
    </ManagementFrame>
  );
}
