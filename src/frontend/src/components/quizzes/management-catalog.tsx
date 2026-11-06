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
      title="Quản lý bộ đề Quiz"
      description="Bộ đề đánh giá kiến thức, gắn với từng phiên bản công thức đã ban hành."
      actions={
        <Link href={`${base}/new`}>
          <Button variant="gold" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Tạo bộ đề mới
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-[#E8E2D9] p-3 rounded-2xl shadow-xs mb-6">
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
      {error && <button className="qm-btn" onClick={() => setRetry(value => value + 1)}>Thử lại</button>}
      <div aria-busy={loading}>
        {loading ? (
          <div className="qm-grid animate-pulse" role="status">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="qm-card space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-11 h-11 rounded-xl bg-[#F5F0E8]" />
                  <div className="w-20 h-5 rounded-full bg-[#F5F0E8]" />
                </div>
                <div className="h-4 w-24 bg-[#F5F0E8] rounded" />
                <div className="h-6 w-3/4 bg-[#E8E2D9] rounded" />
                <div className="h-10 w-full bg-[#FAF9F5] rounded" />
                <div className="h-4 w-1/2 bg-[#F5F0E8] rounded pt-2 border-t border-[#E8E2D9]" />
              </div>
            ))}
          </div>
        ) : data?.items.length ? (
          <div className="qm-grid">
            {data.items.map(item => {
              const version = [...item.versions].sort((a, b) => b.versionNumber - a.versionNumber).find(v => !state || v.state === state);
              return (
                <article key={item.quizId} className="qm-card">
                  <div className="qm-row">
                    <span className="qm-icon"><BookOpen size={22} /></span>
                    {version && <QuizStatus state={version.state} />}
                  </div>
                  <p className="qm-eyebrow">{item.code}</p>
                  <h2 className="font-bold text-lg sm:text-xl text-[#1A1917] tracking-tight">{item.title}</h2>
                  <p className="qm-description">{item.description || 'Chưa có mô tả.'}</p>
                  <div className="qm-card-meta">
                    <span>{item.versions.length} phiên bản</span>
                    {version && <><span>{version.questionsCount} câu hỏi</span><span>Đạt từ {version.passingScore}%</span></>}
                  </div>
                  {version && (
                    <Link className="qm-card-link font-semibold text-[#B47820] hover:text-[#9A6416] transition" href={`${base}/${item.quizId}?version=${version.versionNumber}`}>
                      Mở phiên bản v{version.versionNumber}<ArrowUpRight size={17} />
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        ) : !error && (
          <div className="qm-empty">
            <BookOpen size={32} />
            <h2 className="font-bold text-lg text-[#1A1917]">Chưa có bộ đề phù hợp</h2>
            <p>Thay bộ lọc hoặc tạo bộ đề đầu tiên từ công thức đã ban hành.</p>
          </div>
        )}
      </div>
      {data && <Pagination page={page} total={data.total} pageSize={12} onPage={setPage} disabled={loading} />}
    </ManagementFrame>
  );
}
