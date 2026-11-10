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
import { QuizAttemptBadge } from '@/components/workspace/status-badge';
import { interactiveCardClass, stretchedLinkClass } from '@/components/workspace/interactive-card';
import {
  ManagementFrame,
  Message,
  errorText,
  Pagination,
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



  return (
    <ManagementFrame
      title="Kết quả làm bài"
      description="Theo dõi điểm số và tiến bộ của nhân viên theo từng bộ đề."
      actions={<Link href={base} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-control focus-visible:ring-2 focus-visible:ring-ring">Về bộ đề</Link>}
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

        {loading ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground" role="status">
            Đang tải kết quả…
          </div>
        ) : data?.items.length ? (
          <>
            <div className="space-y-3">
              {data.items.map((item) => {
                const user = usersMap[item.userRef];
                const displayName = user?.fullName || user?.email || 'Nhân viên (Không xác định)';
                const roleLabel = user?.role === 'viewer' ? 'Barista'
                  : user?.role === 'rnd' ? 'R&D'
                  : user?.role === 'admin' ? 'Quản trị'
                  : user?.role || 'Chưa cập nhật';
                const date = new Date(item.submittedAt || item.startedAt);
                const isSuccess = item.isPassed ?? (item.score !== null && item.score >= item.passingScore);
                return (
                  <article key={item.attemptId} className={`grid items-center gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_auto_auto] ${interactiveCardClass}`}>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{user?.email || 'Tài khoản nội bộ'} · {roleLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {date.toLocaleDateString('vi-VN')} · {item.submittedAt
                          ? `Nộp bài lúc ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                          : 'Bắt đầu làm bài'}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        <Link href={`${base}/results/${item.attemptId}`} className={stretchedLinkClass}>{item.quizTitle}</Link>
                      </p>
                      <p className="text-xs text-muted-foreground">{item.quizCode} · v{item.versionNumber}.0</p>
                    </div>
                    <div className="text-sm tabular-nums">
                      {!item.submittedAt || item.score === null ? (
                        <span className="text-muted-foreground">Đang thực hiện</span>
                      ) : (
                        <>
                          <p className={`font-semibold ${isSuccess ? 'text-success' : 'text-destructive'}`}>{item.score}%</p>
                          <p className="text-xs text-muted-foreground">Ngưỡng đạt: {item.passingScore}%</p>
                        </>
                      )}
                    </div>
                    <QuizAttemptBadge isSubmitted={!!item.submittedAt} isPassed={item.isPassed} />
                  </article>
                );
              })}
            </div>
            <Pagination page={page} total={data.total} pageSize={pageSize} onPage={setPage} />
          </>
        ) : (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <h2 className="font-display text-panel font-medium">Chưa có kết quả làm bài nào</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Kết quả sẽ hiển thị ngay khi nhân viên hoàn thành bài kiểm tra SOP.
            </p>
          </div>
        )}
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
        <div className="p-12 text-center text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full motion-safe:animate-spin mx-auto mb-3" />
          <p className="text-xs">Đang tải chi tiết bài làm...</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Summary Panel */}
          <section className="bg-card border border-border rounded-lg p-6 shadow-soft grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block mb-1">
                KẾT QUẢ TỔNG QUAN
              </span>
              <h2 className="font-display text-h2 font-medium text-foreground">
                {data.submittedAt
                  ? `${data.score}% • ${data.isPassed ? 'Đạt yêu cầu' : 'Chưa đạt'}`
                  : 'Đang làm bài'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tiêu chuẩn đạt: tối thiểu {data.passingScore}%
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
              <div>
                <span className="text-muted-foreground block">Nhân viên</span>
                <span className="font-semibold text-sm text-foreground block mt-0.5">
                  {candidateName}
                </span>
                {userInfo?.email && (
                  <span className="text-muted-foreground block mt-0.5">
                    {userInfo.email} {userInfo.role ? `• ${userInfo.role}` : ''}
                  </span>
                )}
              </div>

              <div>
                <span className="text-muted-foreground block">Thời gian nộp</span>
                <span className="font-medium text-foreground block mt-0.5">
                  {data.submittedAt
                    ? new Date(data.submittedAt).toLocaleString('vi-VN')
                    : 'Chưa nộp bài'}
                </span>
                <span className="text-muted-foreground block mt-0.5">
                  Bắt đầu: {new Date(data.startedAt).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
          </section>

          {/* Question Review */}
          <div className="space-y-4">
            <h3 className="font-display text-panel font-medium text-foreground">Đối chiếu câu trả lời</h3>

            <div className="space-y-4">
              {data.answers.map((answer, index) => (
                <article
                  className="bg-card border border-border rounded-lg p-5 shadow-soft space-y-3"
                  key={answer.questionId}
                >
                  <header className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded-md bg-secondary border border-border text-xs font-bold text-muted-foreground">
                        Câu {String(index + 1).padStart(2, '0')}
                      </span>
                      <h4 className="text-sm text-foreground font-medium font-display">{answer.content}</h4>
                    </div>

                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        answer.isCorrect
                          ? 'bg-success-soft text-success border border-success'
                          : 'bg-destructive-soft text-destructive border border-destructive-border'
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
                                ? 'bg-success-soft border-success text-success font-medium'
                                : isSelected
                                ? 'bg-destructive-soft border-destructive-border text-destructive font-medium'
                                : 'bg-secondary border-border text-muted-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center font-bold text-[10px] shrink-0">
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              <span>{option.content}</span>
                            </div>

                            <div className="text-[11px] shrink-0 font-medium">
                              {isSelected && !isCorrect && (
                                <span className="text-destructive">Đã chọn</span>
                              )}
                              {isCorrect && (
                                <span className="text-success">✓ Đáp án đúng</span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                  </ol>

                  {answer.explanation && (
                    <div className="p-3 bg-info-soft border border-border rounded-lg text-xs text-info mt-2">
                      <strong className="font-semibold">Giải thích chi tiết:</strong>{' '}
                      {answer.explanation}
                    </div>
                  )}
                </article>
              ))}
            </div>

            {!data.answers.length && (
              <div className="p-8 text-center text-xs text-muted-foreground bg-card border border-border rounded-lg">
                Chưa có dữ liệu câu trả lời cho bài kiểm tra này.
              </div>
            )}
          </div>
        </div>
      )}
    </ManagementFrame>
  );
}
