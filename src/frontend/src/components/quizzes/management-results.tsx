'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { quizManagement, type ManagementResult, type ManagementResultDetail, type QuizPage } from '@/lib/api/quiz-management';
import { User } from '@/lib/demo/types';
import { Select, SearchInput } from '@/components/workspace/fields';
import { QuizAttemptBadge } from '@/components/workspace/status-badge';
import { ManagementFrame, Message, Pagination, errorText, useManagementContext } from './management-shared';

export function ManagementResults() {
  const { session, repo, base } = useManagementContext();
  const params = useSearchParams();
  const initialQuiz = params.get('quizId') ?? '';
  const initialVersion = params.get('version') ?? '';
  const [quizId, setQuizId] = useState(initialQuiz);
  const [userRef, setUserRef] = useState('');
  const [version, setVersion] = useState(initialVersion);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<QuizPage<ManagementResult> | null>(null);
  const [quizzes, setQuizzes] = useState<{ quizId: string; code: string; title: string; versions: number[] }[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!session || session.role === 'viewer') return;
    quizManagement.list(session.userId, { pageSize: 100 })
      .then(res => setQuizzes(res.items.map(q => ({ quizId: q.quizId, code: q.code, title: q.title, versions: q.versions.map(v => v.versionNumber) }))))
      .catch(() => {});

    repo.getUsers('', 'all', '', 1, 100)
      .then(uList => {
        setUsers(uList);
        const map: Record<string, User> = {};
        uList.forEach(u => { map[u.id] = u; });
        setUsersMap(map);
      })
      .catch(() => {});
  }, [session, repo]);

  useEffect(() => {
    if (!session || session.role === 'viewer') return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    quizManagement
      .results(
        session.userId,
        {
          quizId: quizId || undefined,
          userRef: userRef || undefined,
          version: version ? Number(version) : undefined,
          page,
          pageSize: 10,
        },
        controller.signal
      )
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(errorText(e));
          setData(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [session, quizId, userRef, version, page, retry]);

  const displayItems = useMemo(() => {
    if (!data?.items) return [];
    if (!searchQuery.trim()) return data.items;
    const q = searchQuery.toLowerCase().trim();
    return data.items.filter(item => {
      const u = usersMap[item.userRef];
      const matchQuiz = item.quizTitle?.toLowerCase().includes(q) || item.quizCode?.toLowerCase().includes(q);
      const matchUser = u?.email?.toLowerCase().includes(q) || u?.fullName?.toLowerCase().includes(q) || item.userRef?.toLowerCase().includes(q);
      return matchQuiz || matchUser;
    });
  }, [data?.items, searchQuery, usersMap]);
  return (
    <ManagementFrame title="Kết quả làm bài Quiz" description="Theo dõi lượt làm và đối chiếu từng câu trả lời. R&D chỉ xem kết quả bộ đề do mình tạo.">
      {/* Filter toolbar - exact match with admin/users and rnd/recipes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs mb-6 items-center">
        <div>
          <SearchInput
            placeholder="Tìm theo tên đề, mã đề, nhân viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
          />
        </div>
        <div>
          <Select
            aria-label="Lọc theo bộ đề"
            value={quizId}
            onChange={(e) => {
              setQuizId(e.target.value);
              setVersion('');
              setPage(1);
            }}
            options={[
              { label: 'Tất cả bộ đề Quiz', value: '' },
              ...quizzes.map((q) => ({ label: `${q.code} · ${q.title}`, value: q.quizId })),
            ]}
          />
        </div>
        <div>
          <Select
            aria-label="Lọc theo phiên bản"
            value={version}
            onChange={(e) => {
              setVersion(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'Tất cả phiên bản', value: '' },
              ...(quizzes.find((q) => q.quizId === quizId)?.versions ?? Array.from(new Set(quizzes.flatMap((q) => q.versions))).sort((a, b) => a - b)).map((v) => ({
                label: `Phiên bản v${v}`,
                value: String(v),
              })),
            ]}
          />
        </div>
        <div>
          <Select
            aria-label="Lọc theo nhân viên"
            value={userRef}
            onChange={(e) => {
              setUserRef(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'Tất cả nhân viên', value: '' },
              ...users.map((u) => ({
                label: `${u.fullName || u.email} (${u.role === 'viewer' ? 'Barista' : u.role})`,
                value: u.id,
              })),
            ]}
          />
        </div>
      </div>
      <Message error={error} />
      {error && <button className="qm-btn" onClick={() => setRetry(value => value + 1)}>Thử lại</button>}
      {loading ? (
        <div className="qm-table-wrap p-6 space-y-3 animate-pulse" role="status">
          <div className="h-6 w-48 bg-[#F5F0E8] rounded" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-[#FAF9F5] rounded border border-[#E8E2D9]" />
          ))}
        </div>
      ) : data?.items.length ? (
        <div className="qm-table-wrap">
          <table className="qm-table">
            <thead>
              <tr>
                <th>Bộ đề</th>
                <th>Nhân viên</th>
                <th>Trạng thái</th>
                <th>Điểm / Ngưỡng đạt</th>
                <th>Bắt đầu / Nộp bài</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map(item => {
                const user = usersMap[item.userRef];
                return (
                  <tr key={item.attemptId}>
                    <td>
                      <strong className="font-semibold text-sm text-[#1A1917]">{item.quizTitle}</strong>
                      <small className="block text-[#706E68] text-xs mt-0.5">{item.quizCode} · v{item.versionNumber}</small>
                    </td>
                    <td>
                      <div className="font-semibold text-sm text-[#1A1917]">
                        {user ? (user.fullName || user.email) : (item.userRef.slice(0, 8) + '...')}
                      </div>
                      <small className="block text-[#706E68] text-xs">
                        {user ? `${user.email} · ${user.role === 'viewer' ? 'Barista' : user.role}` : item.userRef}
                      </small>
                    </td>
                    <td>
                      <QuizAttemptBadge isSubmitted={!!item.submittedAt} isPassed={item.isPassed} />
                    </td>
                    <td className="tabular-nums font-medium">
                      {item.score === null ? '—' : `${item.score}%`} / {item.passingScore}%
                    </td>
                    <td>
                      <small className="block text-[#706E68]">{new Date(item.startedAt).toLocaleString('vi-VN')}</small>
                      <small className="block text-[#8C887F]">{item.submittedAt ? new Date(item.submittedAt).toLocaleString('vi-VN') : 'Chưa nộp'}</small>
                    </td>
                    <td><Link className="qm-btn" href={`${base}/results/${item.attemptId}`}>Xem</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : !error && (
        <div className="qm-empty">
          <h2 className="font-bold text-lg text-[#1A1917]">Chưa có lượt làm phù hợp</h2>
          <p>Kết quả xuất hiện sau khi nhân viên bắt đầu làm bài.</p>
        </div>
      )}
      {data && <Pagination page={page} total={data.total} pageSize={10} onPage={setPage} disabled={loading} />}
    </ManagementFrame>
  );
}

export function ManagementResultView({ attemptId }: { attemptId: string }) {
  const { session, base, repo } = useManagementContext();
  const [data, setData] = useState<ManagementResultDetail | null>(null);
  const [userInfo, setUserInfo] = useState<{ name: string; email?: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!session || session.role === 'viewer') return;
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    quizManagement.result(session.userId, attemptId, controller.signal).then(setData).catch(e => { if (!controller.signal.aborted) setError(errorText(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session, attemptId, retry]);
  useEffect(() => {
    if (!data?.userRef) return;
    repo.getUsers().then((users) => {
      const u = users.find((x) => x.id === data.userRef);
      if (u) {
        setUserInfo({ name: u.fullName, email: u.email });
      } else {
        setUserInfo({ name: data.userRef });
      }
    }).catch(() => setUserInfo({ name: data.userRef }));
  }, [data?.userRef, repo]);
  return <ManagementFrame title={data?.quizTitle ?? 'Chi tiết lượt làm'} description={data ? `${data.quizCode} · Phiên bản v${data.versionNumber}` : undefined} actions={<Link className="qm-btn" href={`${base}/results`}>Về kết quả</Link>}><Message error={error} />{error && <button className="qm-btn" onClick={() => setRetry(value => value + 1)}>Thử lại</button>}{loading && <p role="status" className="qm-empty">Đang tải lượt làm…</p>}{data && <><section className="qm-result-summary qm-panel"><div><span className="qm-eyebrow">KẾT QUẢ</span><h2>{data.submittedAt ? `${data.score}% · ${data.isPassed ? 'Đạt' : 'Chưa đạt'}` : 'Đang làm bài'}</h2><p>Ngưỡng đạt: {data.passingScore}%</p></div><dl><dt>Nhân viên</dt><dd>{userInfo ? <span className="font-semibold text-[#1A1917]">{userInfo.name} {userInfo.email && <span className="text-[#706E68] font-normal text-xs">({userInfo.email})</span>}</span> : <span className="inline-flex items-center gap-1.5"><span className="font-medium text-[#1A1917]">Nhân viên #{data.userRef.slice(0, 8)}</span><code className="text-xs text-[#706E68] bg-[#FAF9F5] px-1.5 py-0.5 rounded border border-[#E8E2D9]">{data.userRef}</code></span>}</dd><dt>Bắt đầu</dt><dd>{new Date(data.startedAt).toLocaleString('vi-VN')}</dd><dt>Nộp bài</dt><dd>{data.submittedAt ? new Date(data.submittedAt).toLocaleString('vi-VN') : 'Chưa nộp'}</dd></dl></section><h2 className="qm-section-heading">Đối chiếu câu trả lời</h2>{data.answers.map((answer, index) => <article className="qm-question" key={answer.questionId}><header className="qm-question-head"><span className="qm-question-number">{String(index + 1).padStart(2, '0')}</span><h3>{answer.content}</h3><span className={`qm-status ${answer.isCorrect ? 'qm-status-published' : 'qm-result-failed'}`}>{answer.selectedOptionId === null ? 'Chưa trả lời' : answer.isCorrect ? '✓ Đúng' : '× Sai'}</span></header><ol className="qm-answers">{[...answer.options].sort((a, b) => a.sortOrder - b.sortOrder).map((option, optionIndex) => <li key={option.id} className={`qm-answer ${option.isCorrect ? 'qm-correct' : option.id === answer.selectedOptionId ? 'qm-incorrect' : ''}`}><span>{String.fromCharCode(65 + optionIndex)}</span><div>{option.content}</div><strong>{option.id === answer.selectedOptionId && 'Đã chọn '}{option.isCorrect && '✓ Đúng'}</strong></li>)}</ol>{answer.explanation && <p className="qm-explanation"><strong>Giải thích:</strong> {answer.explanation}</p>}</article>)}{!data.answers.length && <p className="qm-empty">Chưa có dữ liệu câu trả lời.</p>}</>}</ManagementFrame>;
}
