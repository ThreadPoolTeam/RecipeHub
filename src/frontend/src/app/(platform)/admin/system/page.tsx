'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  BarChart3,
  Server,
} from 'lucide-react';
import { requestJson } from '@/lib/api/client';
import { listAuditLogs, getActionLabel, AuditLogDto } from '@/lib/api/audit';
import { Button } from '@/components/workspace/fields';
import { DataTable } from '@/components/workspace/data-table';

interface ServiceProbeTarget {
  key: string;
  name: string;
  roleLabel: string;
  dbName: string;
  endpoint: string;
}

interface ServiceHealthResult extends ServiceProbeTarget {
  status: 'Ready' | 'Degraded' | 'Unreachable';
  database: 'Connected' | 'Unreachable';
  latencyMs: number;
  version: string;
  checkedAt: string;
}

const SERVICE_TARGETS: ServiceProbeTarget[] = [
  {
    key: 'identity',
    name: 'Identity Service',
    roleLabel: 'Xác thực JWT, Phiên đăng nhập & RBAC',
    dbName: 'recipehub_identity',
    endpoint: 'api/v1/identity/info',
  },
  {
    key: 'recipes',
    name: 'Recipe Service',
    roleLabel: 'Công thức R&D, Nguyên liệu, Danh mục & PDF',
    dbName: 'recipehub_recipe',
    endpoint: 'api/v1/recipes/info',
  },
  {
    key: 'content',
    name: 'Content Service',
    roleLabel: 'Tư liệu Media, AI Image Drafts & Outbox Relay',
    dbName: 'recipehub_content',
    endpoint: 'api/v1/content/info',
  },
  {
    key: 'audit',
    name: 'Audit Service',
    roleLabel: 'Nhật ký kiểm toán & Truy vết sự kiện',
    dbName: 'recipehub_audit',
    endpoint: 'api/v1/audit/info',
  },
  {
    key: 'quiz',
    name: 'Quiz Service',
    roleLabel: 'Đề kiểm tra nghiệp vụ SOP & Chấm điểm',
    dbName: 'recipehub_quiz',
    endpoint: 'api/v1/quiz/info',
  },
];

export default function AdminSystemMonitoringPage() {
  const [services, setServices] = useState<ServiceHealthResult[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLogDto[]>([]);
  const [totalAuditCount, setTotalAuditCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);

  const runSystemProbe = useCallback(async () => {
    setProbing(true);
    try {
      const probePromises = SERVICE_TARGETS.map(async (target): Promise<ServiceHealthResult> => {
        const start = performance.now();
        try {
          const res = (await requestJson(target.endpoint, null, { method: 'GET' })) as {
            service?: string;
            version?: string;
            status?: string;
            database?: string;
          };
          const latencyMs = Math.max(1, Math.round(performance.now() - start));
          const dbConnected = res?.database === 'Connected' || res?.status === 'Ready' || res?.status === 'Active';
          return {
            ...target,
            status: dbConnected ? 'Ready' : 'Degraded',
            database: dbConnected ? 'Connected' : 'Unreachable',
            latencyMs,
            version: res?.version || '1.0.0',
            checkedAt: new Date().toLocaleTimeString('vi-VN'),
          };
        } catch {
          const latencyMs = Math.max(1, Math.round(performance.now() - start));
          return {
            ...target,
            status: 'Unreachable',
            database: 'Unreachable',
            latencyMs,
            version: '—',
            checkedAt: new Date().toLocaleTimeString('vi-VN'),
          };
        }
      });

      const [probeResults, auditRes] = await Promise.all([
        Promise.all(probePromises),
        listAuditLogs({ page: 1, pageSize: 15 }).catch(() => ({
          items: [] as AuditLogDto[],
          totalCount: 0,
          page: 1,
          pageSize: 15,
        })),
      ]);

      setServices(probeResults);
      setRecentLogs(auditRes.items);
      setTotalAuditCount(auditRes.totalCount);
    } finally {
      setLoading(false);
      setProbing(false);
    }
  }, []);

  useEffect(() => {
    void runSystemProbe();
  }, [runSystemProbe]);

  const healthyCount = services.filter((s) => s.status === 'Ready').length;
  const avgLatency =
    services.length > 0
      ? Math.round(services.reduce((acc, item) => acc + item.latencyMs, 0) / services.length)
      : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Quản trị</p>
          <h1 className="font-display text-3xl font-medium text-foreground sm:text-4xl">Giám sát hệ thống &amp; sự cố</h1>
          <p className="mt-2 text-sm text-muted-foreground">Kiểm tra trạng thái dịch vụ và kết nối cơ sở dữ liệu.</p>
        </div>
        <Button variant="secondary" className="h-10" isLoading={probing} onClick={runSystemProbe}>
          <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.5} /> Kiểm tra lại
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <div key={service.key} className="rounded-lg border border-border bg-card p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-lg font-medium text-foreground">{service.name}</h2>
              <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${service.status === 'Ready' ? 'bg-success-soft text-success' : 'bg-destructive-soft text-destructive'}`}>
                {service.status === 'Ready' ? 'Sẵn sàng' : service.status === 'Degraded' ? 'Suy giảm' : 'Mất kết nối'}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{service.roleLabel}</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div><p className="text-xs text-muted-foreground">Độ trễ</p><p className="mt-1 font-display text-xl tabular-nums text-foreground">{service.latencyMs} ms</p></div>
              <div><p className="text-xs text-muted-foreground">Cơ sở dữ liệu</p><p className="mt-1 text-sm text-foreground">{service.database === 'Connected' ? 'Đã kết nối' : 'Mất kết nối'}</p></div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Lần kiểm tra cuối: {service.checkedAt}</p>
          </div>
        ))}
        {loading && <p className="text-sm text-muted-foreground">Đang kiểm tra dịch vụ...</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-soft"><p className="text-xs text-muted-foreground">Dịch vụ sẵn sàng</p><p className="mt-2 font-display text-xl tabular-nums">{loading ? '...' : `${healthyCount} / ${SERVICE_TARGETS.length}`}</p></div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-soft"><p className="text-xs text-muted-foreground">Độ trễ trung bình</p><p className="mt-2 font-display text-xl tabular-nums">{loading ? '...' : `${avgLatency} ms`}</p></div>
        <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-soft hover:bg-accent"><BarChart3 className="h-5 w-5" strokeWidth={1.5} /><span className="flex-1 text-sm font-semibold">Grafana Dashboard</span><ExternalLink className="h-4 w-4" strokeWidth={1.5} /></a>
        <a href="http://localhost:5050" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-soft hover:bg-accent"><Database className="h-5 w-5" strokeWidth={1.5} /><span className="flex-1 text-sm font-semibold">pgAdmin 4</span><ExternalLink className="h-4 w-4" strokeWidth={1.5} /></a>
      </div>

      {/* Level 3: Microservices & Database Readiness Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-medium text-foreground">
              <Server className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              Trạng thái Dịch vụ &amp; Cơ sở dữ liệu
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mỗi dịch vụ tự kiểm tra kết nối tới schema PostgreSQL độc lập của dịch vụ đó.
            </p>
          </div>
        </div>

        <DataTable<ServiceHealthResult>
          data={services}
          keyExtractor={(item) => item.key}
          isLoading={loading}
          emptyTitle="Chưa có dữ liệu thăm dò dịch vụ"
          emptyMessage="Bấm Kiểm tra toàn hệ thống để thăm dò trạng thái các microservices."
          columns={[
            {
              header: 'Dịch vụ (Microservice)',
              render: (item) => (
                <div>
                  <div className="text-sm font-semibold text-foreground">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.roleLabel}</div>
                </div>
              ),
            },
            {
              header: 'CSDL Độc lập',
              render: (item) => (
                <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                  {item.dbName}
                </span>
              ),
            },
            {
              header: 'Trạng thái API',
              render: (item) =>
                item.status === 'Ready' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động tốt
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive-soft px-2.5 py-1 text-xs font-medium text-destructive">
                    <AlertTriangle className="w-3.5 h-3.5" /> Sự cố kết nối
                  </span>
                ),
            },
            {
              header: 'Kết nối PostgreSQL',
              render: (item) =>
                item.database === 'Connected' ? (
                  <span className="text-xs font-medium text-success">Đã kết nối</span>
                ) : (
                  <span className="text-xs font-medium text-destructive">Mất kết nối</span>
                ),
            },
            {
              header: 'Độ trễ',
              render: (item) => (
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {item.latencyMs} ms
                </span>
              ),
            },
            {
              header: 'Lần kiểm tra cuối',
              className: 'text-right',
              render: (item) => (
                <span className="text-xs tabular-nums text-muted-foreground">{item.checkedAt}</span>
              ),
            },
          ]}
        />
      </div>

      {/* Recent Business Activity Stream Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              Hoạt động hệ thống gần đây ({totalAuditCount} sự kiện)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Các sự kiện thay đổi dữ liệu quan trọng được đẩy qua Redis Streams vào Audit Service.
            </p>
          </div>
          <Link href="/admin/logs">
            <Button variant="secondary" className="h-10">
              Xem toàn bộ nhật ký
            </Button>
          </Link>
        </div>

        <DataTable<AuditLogDto>
          data={recentLogs}
          keyExtractor={(item) => item.id}
          isLoading={loading}
          emptyTitle="Chưa ghi nhận sự kiện hệ thống"
          emptyMessage="Các thao tác tạo/sửa công thức, khóa tài khoản hoặc nộp bài thi sẽ hiển thị tại đây."
          columns={[
            {
              header: 'Thời gian',
              render: (item) => (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {new Date(item.occurredAt).toLocaleString('vi-VN')}
                </span>
              ),
            },
            {
              header: 'Thao tác nghiệp vụ',
              render: (item) => (
                <span className="text-xs font-semibold text-foreground">{getActionLabel(item.action)}</span>
              ),
            },
            {
              header: 'Người thực hiện',
              render: (item) => (
                <span className="text-xs text-foreground">{item.actorName || 'Hệ thống'}</span>
              ),
            },
            {
              header: 'Mô tả sự kiện',
              render: (item) => <span className="text-xs text-muted-foreground">{item.summary}</span>,
            },
          ]}
        />
      </div>
    </div>
  );
}
