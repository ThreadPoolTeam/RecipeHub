'use client';

interface QuizStatsProps {
  published: number;
  attempts: number;
  passRate?: number;
  average?: number;
}

function StatCell({ label, value, caption }: { label: string; value: string | number; caption?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-stat font-normal tabular-nums text-foreground">{value}</p>
      {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

export function QuizStats({ published, attempts, passRate, average }: QuizStatsProps) {
  return (
    <section aria-label="Số liệu bộ đề" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCell label="Bộ đề đã ban hành" value={published} />
      <StatCell label="Lượt làm bài" value={attempts} />
      <StatCell label="Tỉ lệ đạt" value={passRate === undefined ? 'Chưa có' : `${passRate}%`} caption="Tính trên 100 lượt gần nhất" />
      <StatCell label="Điểm trung bình" value={average === undefined ? 'Chưa có' : average} caption="Tính trên 100 lượt gần nhất" />
    </section>
  );
}
