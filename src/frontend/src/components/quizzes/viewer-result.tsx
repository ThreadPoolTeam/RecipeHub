'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import { quizViewerApi } from '@/lib/api/quiz-viewer';
import { attemptUrl, detailUrl, useViewerResource, ViewerError, ViewerFrame, ViewerLoading, viewerDate, viewerQuizRoot } from './viewer-shared';

export default function ViewerResult({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const load = useCallback(async (actorId: string, signal: AbortSignal) => {
    const attempt = await quizViewerApi.resume(actorId, attemptId, signal);
    if (attempt.state !== 'submitted') { router.replace(attemptUrl(attemptId)); return null; }
    return quizViewerApi.result(actorId, attemptId, signal);
  }, [attemptId, router]);
  const { data, loading, error, retry } = useViewerResource(load);
  const answer = data?.answers[index];
  return <ViewerFrame title="Nhìn lại để pha chế tốt hơn." description="Kết quả và giải thích được trả về từ máy chủ sau khi nộp bài." back={{ href: `${viewerQuizRoot}/history`, label: 'Lịch sử của tôi' }}>
    {loading ? <ViewerLoading /> : error ? <ViewerError message={error} retry={retry} /> : !data ? <ViewerLoading /> : <>
      <section className="qv-panel qv-result-summary"><div><span className={`qv-tag ${data.isPassed ? 'qv-pass' : 'qv-fail'}`}>{data.isPassed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}{data.isPassed ? 'Đạt yêu cầu' : 'Chưa đạt yêu cầu'}</span><h2>{data.isPassed ? 'Một bước tiến đáng tự hào.' : 'Mỗi lần ôn lại, vững thêm một chút.'}</h2><p className="qv-muted">Phiên bản {data.versionNumber} · Ngưỡng đạt {data.passingScore}%</p><p className="qv-muted">Bắt đầu: {viewerDate(data.startedAt)}<br />Đã nộp: {viewerDate(data.submittedAt)}</p></div><div className="qv-score"><strong>{data.score}<span>%</span></strong><span>Điểm do máy chủ chấm</span></div></section>
      <div className="qv-result-actions"><Link className="qv-button" href={viewerQuizRoot}>Khám phá bài kiểm tra khác</Link><Link className="qv-button qv-primary" href={detailUrl(data.quizId, data.versionNumber)}>Về bộ đề & làm lại <ArrowRight size={16} /></Link></div>
      <div className="qv-section-heading"><h2>Xem lại từng câu</h2><span className="qv-muted">Chỉ đọc · Không thể thay đổi đáp án</span></div>
      {answer && <div className="qv-take-layout"><section><article className="qv-panel qv-question-card"><div className="qv-question-top"><span>CÂU {index + 1} / {data.answers.length}</span><span className={`qv-tag ${answer.isCorrect ? 'qv-pass' : answer.selectedOptionId === null ? '' : 'qv-fail'}`}>{answer.isCorrect ? <CheckCircle2 size={15} /> : answer.selectedOptionId === null ? <CircleHelp size={15} /> : <XCircle size={15} />}{answer.isCorrect ? 'Đúng' : answer.selectedOptionId === null ? 'Chưa trả lời' : 'Chưa đúng'}</span></div><div className="qv-question-body" key={answer.questionId}><h2>{answer.content}</h2><div className="qv-options qv-review-options">{answer.options.map((option, position) => <div key={option.id} className={`qv-option ${option.isCorrect ? 'qv-correct-option' : answer.selectedOptionId === option.id ? 'qv-wrong-option' : ''}`}><span className="qv-option-letter">{String.fromCharCode(65 + position)}</span><div><span>{option.content}</span><small className="qv-option-status">{option.isCorrect ? 'Đáp án đúng' : ''}{option.isCorrect && answer.selectedOptionId === option.id ? ' · ' : ''}{answer.selectedOptionId === option.id ? 'Bạn đã chọn' : ''}</small></div></div>)}</div><div className="qv-explanation"><strong>Giải thích chuyên môn</strong><p>{answer.explanation || 'Bộ đề chưa cung cấp giải thích cho câu hỏi này.'}</p></div></div></article><nav className="qv-question-nav" aria-label="Chuyển câu xem lại"><button className="qv-button" disabled={index === 0} onClick={() => setIndex(value => value - 1)}><ArrowLeft size={16} />Câu trước</button><button className="qv-button" disabled={index === data.answers.length - 1} onClick={() => setIndex(value => value + 1)}>Câu tiếp<ArrowRight size={16} /></button></nav></section>
        <aside className="qv-panel qv-progress-panel"><h3>Bản đồ kết quả</h3><nav className="qv-palette" aria-label="Chọn câu xem lại">{data.answers.map((item, position) => <button key={item.questionId} className={`qv-number ${item.isCorrect ? 'qv-result-correct' : 'qv-result-wrong'} ${position === index ? 'qv-review-current' : ''}`} aria-current={position === index ? 'step' : undefined} aria-label={`Câu ${position + 1}, ${item.isCorrect ? 'đúng' : item.selectedOptionId === null ? 'chưa trả lời' : 'sai'}`} onClick={() => setIndex(position)}>{position + 1}<span className="qv-number-result" aria-hidden="true">{item.isCorrect ? '✓' : item.selectedOptionId === null ? '–' : '×'}</span></button>)}</nav><p className="qv-muted qv-small">✓ Đúng · × Chưa đúng · – Bỏ trống</p></aside></div>}
    </>}
  </ViewerFrame>;
}
