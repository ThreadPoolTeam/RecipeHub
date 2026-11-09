'use client';

import { CheckCircle2, AlertTriangle, Server } from 'lucide-react';
import { DataTable } from '@/components/workspace/data-table';

interface ServiceHealth {
  key: string;
  name: string;
  roleLabel: string;
  dbName: string;
  status: 'Ready' | 'Degraded' | 'Unreachable';
  database: 'Connected' | 'Unreachable';
  latencyMs: number;
  checkedAt: string;
}

export function ServiceHealthTable({ services, loading }: { services: ServiceHealth[]; loading: boolean }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-medium text-foreground">
          <Server className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          Trạng thái Dịch vụ &amp; Cơ sở dữ liệu
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Mỗi dịch vụ tự kiểm tra kết nối tới schema PostgreSQL độc lập của dịch vụ đó.</p>
      </div>
      <DataTable<ServiceHealth>
        data={services}
        keyExtractor={(item) => item.key}
        isLoading={loading}
        emptyTitle="Chưa có dữ liệu thăm dò dịch vụ"
        emptyMessage="Bấm Kiểm tra toàn hệ thống để thăm dò trạng thái các microservices."
        columns={[
          { header: 'Dịch vụ (Microservice)', render: (item) => <div><div className="text-sm font-semibold text-foreground">{item.name}</div><div className="text-xs text-muted-foreground">{item.roleLabel}</div></div> },
          { header: 'CSDL Độc lập', render: (item) => <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">{item.dbName}</span> },
          { header: 'Trạng thái API', render: (item) => item.status === 'Ready' ? <span className="inline-flex items-center gap-1.5 rounded-md bg-success-soft px-2.5 py-1 text-xs font-medium text-success"><CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động tốt</span> : <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive-soft px-2.5 py-1 text-xs font-medium text-destructive"><AlertTriangle className="w-3.5 h-3.5" /> Sự cố kết nối</span> },
          { header: 'Kết nối PostgreSQL', render: (item) => item.database === 'Connected' ? <span className="text-xs font-medium text-success">Đã kết nối</span> : <span className="text-xs font-medium text-destructive">Mất kết nối</span> },
          { header: 'Độ trễ', render: (item) => <span className="text-xs font-semibold tabular-nums text-foreground">{item.latencyMs} ms</span> },
          { header: 'Lần kiểm tra cuối', className: 'text-right', render: (item) => <span className="text-xs tabular-nums text-muted-foreground">{item.checkedAt}</span> },
        ]}
      />
    </div>
  );
}
