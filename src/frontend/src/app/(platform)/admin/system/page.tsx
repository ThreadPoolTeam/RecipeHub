'use client';

import { pageTitleClass } from '@/components/workspace/page-header';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Database,
  ExternalLink,
  BarChart3,
} from 'lucide-react';
import { requestJson } from '@/lib/api/client';
import { usePolling } from '@/components/workspace/use-polling';
import { ServiceHealthTable } from './service-health-table';

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
    roleLabel: 'Nhật ký hoạt động & Truy vết sự kiện',
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
  const [loading, setLoading] = useState(true);
  const probingRef = useRef(false);

  const runSystemProbe = useCallback(async () => {
    if (probingRef.current) return;
    probingRef.current = true;
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
            version: 'Chưa cập nhật',
            checkedAt: new Date().toLocaleTimeString('vi-VN'),
          };
        }
      });

      const probeResults = await Promise.all(probePromises);
      setServices(probeResults);
    } finally {
      setLoading(false);
      probingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void runSystemProbe();
  }, [runSystemProbe]);
  usePolling(runSystemProbe);

  const healthyCount = services.filter((s) => s.status === 'Ready').length;
  const measured = services.filter((s) => s.status !== 'Unreachable');
  const avgLatency =
    measured.length > 0
      ? Math.round(measured.reduce((acc, item) => acc + item.latencyMs, 0) / measured.length)
      : null;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Quản trị</p>
          <h1 className={pageTitleClass}>Giám sát hệ thống &amp; sự cố</h1>
          <p className="mt-2 text-sm text-muted-foreground">Kiểm tra trạng thái dịch vụ và kết nối cơ sở dữ liệu.</p>
        </div>
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
              <div><p className="text-xs text-muted-foreground">Độ trễ</p><p className={`mt-1 tabular-nums ${service.status === 'Unreachable' ? 'text-sm text-muted-foreground' : 'font-display text-xl text-foreground'}`}>{service.status === 'Unreachable' ? 'Không đo được' : `${service.latencyMs} ms`}</p></div>
              <div><p className="text-xs text-muted-foreground">Cơ sở dữ liệu</p><p className="mt-1 text-sm text-foreground">{service.database === 'Connected' ? 'Đã kết nối' : 'Mất kết nối'}</p></div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Lần kiểm tra cuối: {service.checkedAt}</p>
          </div>
        ))}
        {loading && <p className="text-sm text-muted-foreground">Đang kiểm tra dịch vụ...</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-soft"><p className="text-xs text-muted-foreground">Dịch vụ sẵn sàng</p><p className="mt-2 font-display text-xl tabular-nums">{loading ? '...' : `${healthyCount} / ${SERVICE_TARGETS.length}`}</p></div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-soft"><p className="text-xs text-muted-foreground">Độ trễ trung bình</p><p className="mt-2 font-display text-xl tabular-nums">{loading ? '...' : avgLatency === null ? 'Không đo được' : `${avgLatency} ms`}</p></div>
        <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-soft hover:bg-accent"><BarChart3 className="h-5 w-5" strokeWidth={1.5} /><span className="flex-1 text-sm font-semibold">Grafana Dashboard</span><ExternalLink className="h-4 w-4" strokeWidth={1.5} /></a>
        <a href="http://localhost:5050" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-soft hover:bg-accent"><Database className="h-5 w-5" strokeWidth={1.5} /><span className="flex-1 text-sm font-semibold">pgAdmin 4</span><ExternalLink className="h-4 w-4" strokeWidth={1.5} /></a>
      </div>

      <ServiceHealthTable services={services} loading={loading} />

    </div>
  );
}
