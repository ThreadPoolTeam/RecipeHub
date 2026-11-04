'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  quizManagement,
  type ManagementResult,
  type ManagementResultDetail,
  type QuizPage,
} from '@/lib/api/quiz-management';
import { User } from '@/lib/demo/types';
import { Button, Select } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';
import { QuizAttemptBadge } from '@/components/workspace/status-badge';
import {
  ManagementFrame,
  Message,
  errorText,
  useManagementContext,
} from './management-shared';

export function ManagementResults() {
  const { session, repo, base } = useManagementContext();
  const params = useSearchParams();
  const initialQuiz = params.get('quizId') ?? '';
  const initialVersion = params.get('version') ?? '';

  const [quizId, setQuizId] = useState(initialQuiz);
  const [version, setVersion] = useState(initialVersion);
  const [userRef, setUserRef] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [data, setData] = useState<QuizPage<ManagementResult> | null>(null);
  const [quizzes, setQuizzes] = useState<{ quizId: string; code: string; title: string; versions: number[] }[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  // Load Quizzes and Users metadata
  useEffect(() => {
    if (!session || session.role === 'viewer') return;

    quizManagement
      .list(session.userId, { pageSize: 100 })
      .then((res) =>
        setQuizzes(
          res.items.map((q) => ({
            quizId: q.quizId,
            code: q.code,
            title: q.title,
            versions: q.versions.map((v) => v.versionNumber),
          }))
        )
      )
      .catch(() => {});

    repo
      .getUsers()
      .then((uList) => {
        if (Array.isArray(uList)) {
          setUsers(uList);
          const map: Record<string, User> = {};
          uList.forEach((u) => {
            if (u && u.id) map[u.id] = u;
          });
          setUsersMap(map);
        }
      })
      .catch(() => {});
  }, [session, repo]);

  // Fetch Attempt Results
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
          pageSize,
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

  const versionOptions = useMemo(() => {
    if (quizId) {
      const selected = quizzes.find((q) => q.quizId === quizId);
      return selected?.versions ?? [];
    }
    return Array.from(new Set(quizzes.flatMap((q) => q.versions))).sort((a, b) => a - b);
  }, [quizId, quizzes]);


  // Human-first table columns (Zero raw UUIDs)
  const columns = [
    {
      header: 'Bộ đề Quiz',
      render: (item: ManagementResult) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-sm text-[#1A1917]">{item.quizTitle}</div>
          <div className="text-xs text-[#706E68] font-mono flex items-center gap-1.5">
            <span>{item.quizCode}</span>
            <span>•</span>
            <span>v{item.versionNumber}.0</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Nhân viên / Thí sinh',
      render: (item: ManagementResult) => {
        const user = usersMap[item.userRef];
        const displayName = user?.fullName || user?.email || 'Nhân viên (Không xác định)';
        const roleLabel =
          user?.role === 'viewer'
            ? 'Barista'
            : user?.role === 'rnd'
            ? 'R&D'
            : user?.role === 'admin'
            ? 'Quản trị'
            : user?.role
            ? user.role
            : 'Chưa cập nhật';

        return (
          <div className="space-y-0.5">
            <div className="font-semibold text-sm text-[#1A1917]">{displayName}</div>
            <div className="text-xs text-[#706E68] flex items-center gap-1.5">
              <span>{user?.email || 'Tài khoản nội bộ'}</span>
              <span>•</span>
              <span className="text-[#8C887F]">{roleLabel}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Điểm số',
      render: (item: ManagementResult) => {
        if (!item.submittedAt || item.score === null) {
          return <span className="text-xs text-[#8C887F]">Đang thực hiện</span>;
        }

        const isSuccess = item.isPassed ?? item.score >= item.passingScore;
        return (
          <div className="space-y-0.5">
            <div
              className={`font-bold text-sm tabular-nums ${
                isSuccess ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {item.score}%
            </div>
            <div className="text-[11px] text-[#706E68] tabular-nums">
              Ngưỡng đạt: {item.passingScore}%
            </div>
          </div>
        );
      },
    },
    {
      header: 'Kết quả',
      render: (item: ManagementResult) => (
        <QuizAttemptBadge isSubmitted={!!item.submittedAt} isPassed={item.isPassed} />
      ),
    },
    {
      header: 'Thời gian',
      render: (item: ManagementResult) => {
        const dateObj = new Date(item.submittedAt || item.startedAt);
        return (
          <div className="text-xs text-[#706E68] space-y-0.5">
            <div className="text-[#1A1917] font-medium">
              {dateObj.toLocaleDateString('vi-VN')}
            </div>
            <div className="text-[11px] text-[#8C887F]">
              {item.submittedAt
                ? `Nộp bài lúc ${dateObj.toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Bắt đầu làm bài'}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Thao tác',
      className: 'text-right',
      render: (item: ManagementResult) => (
        <div className="flex items-center justify-end">
          <Link href={`${base}/results/${item.attemptId}`}>
            <Button variant="secondary" size="sm">
              Xem bài làm
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <ManagementFrame
      title="Kết quả làm bài Quiz"
      description="Theo dõi điểm số, đánh giá năng lực và kiểm tra chi tiết bài làm của nhân viên."
    >
      <div className="space-y-4">
        {/* Server-Backed Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <Select
              aria-label="Lọc theo bộ đề"
              value={quizId}
              onChange={(e) => {
                setQuizId(e.target.value);
                setVersion('');
                setPage(1);
              }}
            >
              <option value="">Tất cả bộ đề Quiz</option>
              {quizzes.map((q) => (
                <option key={q.quizId} value={q.quizId}>
                  {q.code} · {q.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-48">
            <Select
              aria-label="Lọc theo phiên bản"
              value={version}
              onChange={(e) => {
                setVersion(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả phiên bản</option>
              {versionOptions.map((v) => (
                <option key={v} value={String(v)}>
                  Phiên bản v{v}.0
                </option>
              ))}
            </Select>
          </div>

          <div className="flex-1 min-w-[220px]">
            <Select
              aria-label="Lọc theo nhân viên"
              value={userRef}
              onChange={(e) => {
                setUserRef(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả nhân viên làm bài</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || u.email} (
                  {u.role === 'viewer'
                    ? 'Barista'
                    : u.role === 'rnd'
                    ? 'R&D'
                    : u.role === 'admin'
                    ? 'Quản trị'
                    : u.role}
                  )
                </option>
              ))}
            </Select>
          </div>

          {(quizId || version || userRef) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuizId('');
                setVersion('');
                setUserRef('');
                setPage(1);
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        <Message error={error} />
        {error && (
          <Button variant="secondary" size="sm" onClick={() => setRetry((v) => v + 1)}>
            Thử lại
          </Button>
        )}

        {/* Human-Friendly Data Table */}
        <DataTable
          columns={columns}
          data={data?.items || []}
          keyExtractor={(item) => item.attemptId}
          isLoading={loading}
          emptyTitle="Chưa có kết quả làm bài nào"
          emptyMessage="Kết quả sẽ hiển thị ngay khi nhân viên hoàn thành bài kiểm tra SOP."
          pagination={{
            page,
            total: data?.total || 0,
            totalPages: Math.max(1, Math.ceil((data?.total || 0) / pageSize)),
            onPageChange: (newPage) => setPage(newPage),
          }}
        />
      </div>
    </ManagementFrame>
  );
}

export function ManagementResultView({ attemptId }: { attemptId: string }) {
  const { session, base, repo } = useManagementContext();
  const [data, setData] = useState<ManagementResultDetail | null>(null);
  const [userInfo, setUserInfo] = useState<{ name: string; email?: string; role?: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!session || session.role === 'viewer') return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);

    quizManagement
      .result(session.userId, attemptId, controller.signal)
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorText(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [session, attemptId, retry]);

  useEffect(() => {
    if (!data?.userRef) return;
    repo
      .getUsers()
      .then((users) => {
        if (Array.isArray(users)) {
          const u = users.find((x) => x.id === data.userRef);
          if (u) {
            setUserInfo({
              name: u.fullName || u.email,
              email: u.email,
              role:
                u.role === 'viewer'
                  ? 'Barista'
                  : u.role === 'rnd'
                  ? 'R&D'
                  : u.role === 'admin'
                  ? 'Quản trị'
                  : u.role,
            });
            return;
          }
        }
        setUserInfo({ name: 'Nhân viên (Không xác định)' });
      })
      .catch(() => setUserInfo({ name: 'Nhân viên (Không xác định)' }));
  }, [data?.userRef, repo]);

  const candidateName = userInfo?.name || 'Nhân viên (Không xác định)';

  return (
    <ManagementFrame
      title={data?.quizTitle ?? 'Chi tiết bài làm Quiz'}
      description={data ? `${data.quizCode} • Phiên bản v${data.versionNumber}.0` : undefined}
      actions={
        <Link href={`${base}/results`}>
          <Button variant="secondary" size="sm">
            ← Quay lại danh sách
          </Button>
        </Link>
      }
    >
      <Message error={error} />
      {error && (
        <Button variant="secondary" size="sm" onClick={() => setRetry((v) => v + 1)}>
          Thử lại
        </Button>
      )}

      {loading && (
        <div className="p-12 text-center text-[#706E68]">
          <div className="w-8 h-8 border-2 border-[#B47820] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Đang tải chi tiết bài làm...</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Summary Panel */}
          <section className="bg-white border border-[#E8E2D9] rounded-2xl p-6 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B47820] block mb-1">
                KẾT QUẢ TỔNG QUAN
              </span>
              <h2 className="text-2xl font-bold text-[#1A1917]">
                {data.submittedAt
                  ? `${data.score}% • ${data.isPassed ? 'Đạt yêu cầu' : 'Chưa đạt'}`
                  : 'Đang làm bài'}
              </h2>
              <p className="text-sm text-[#706E68] mt-1">
                Tiêu chuẩn đạt: tối thiểu {data.passingScore}%
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs border-t md:border-t-0 md:border-l border-[#E8E2D9] pt-4 md:pt-0 md:pl-6">
              <div>
                <span className="text-[#8C887F] block">Nhân viên</span>
                <span className="font-semibold text-sm text-[#1A1917] block mt-0.5">
                  {candidateName}
                </span>
                {userInfo?.email && (
                  <span className="text-[#706E68] block mt-0.5">
                    {userInfo.email} {userInfo.role ? `• ${userInfo.role}` : ''}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[#8C887F] block">Thời gian nộp</span>
                <span className="font-medium text-[#1A1917] block mt-0.5">
                  {data.submittedAt
                    ? new Date(data.submittedAt).toLocaleString('vi-VN')
                    : 'Chưa nộp bài'}
                </span>
                <span className="text-[#8C887F] block mt-0.5">
                  Bắt đầu: {new Date(data.startedAt).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
          </section>

          {/* Question Review */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#1A1917]">Đối chiếu câu trả lời</h3>

            <div className="space-y-4">
              {data.answers.map((answer, index) => (
                <article
                  className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-xs space-y-3"
                  key={answer.questionId}
                >
                  <header className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#E8E2D9] text-xs font-bold text-[#706E68]">
                        Câu {String(index + 1).padStart(2, '0')}
                      </span>
                      <h4 className="font-semibold text-sm text-[#1A1917]">{answer.content}</h4>
                    </div>

                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        answer.isCorrect
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {answer.selectedOptionId === null
                        ? 'Chưa trả lời'
                        : answer.isCorrect
                        ? '✓ Đúng'
                        : '× Chưa đúng'}
                    </span>
                  </header>

                  <ol className="space-y-2 pt-2">
                    {[...answer.options]
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((option, optionIndex) => {
                        const isSelected = option.id === answer.selectedOptionId;
                        const isCorrect = option.isCorrect;

                        return (
                          <li
                            key={option.id}
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                              isCorrect
                                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-medium'
                                : isSelected
                                ? 'bg-rose-50/70 border-rose-300 text-rose-900 font-medium'
                                : 'bg-[#FAF9F5] border-[#E8E2D9] text-[#706E68]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-white border border-[#E8E2D9] flex items-center justify-center font-bold text-[10px] shrink-0">
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              <span>{option.content}</span>
                            </div>

                            <div className="text-[11px] shrink-0 font-medium">
                              {isSelected && !isCorrect && (
                                <span className="text-rose-700">Đã chọn</span>
                              )}
                              {isCorrect && (
                                <span className="text-emerald-700">✓ Đáp án đúng</span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                  </ol>

                  {answer.explanation && (
                    <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 mt-2">
                      <strong className="font-semibold">Giải thích chi tiết:</strong>{' '}
                      {answer.explanation}
                    </div>
                  )}
                </article>
              ))}
            </div>

            {!data.answers.length && (
              <div className="p-8 text-center text-xs text-[#706E68] bg-white border border-[#E8E2D9] rounded-2xl">
                Chưa có dữ liệu câu trả lời cho bài kiểm tra này.
              </div>
            )}
          </div>
        </div>
      )}
    </ManagementFrame>
  );
}
