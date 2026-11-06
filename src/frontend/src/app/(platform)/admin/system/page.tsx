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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Level 1: Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1917] flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-[#B47820]" />
            Giám Sát Hệ Thống &amp; Xử Lý Sự Cố
          </h1>
          <p className="text-[#706E68] text-sm mt-1">
            Kiểm tra sức khỏe 5 Microservices qua YARP Gateway, trạng thái kết nối 5 CSDL PostgreSQL và công cụ vận hành.
          </p>
        </div>
        <Button variant="gold" size="sm" isLoading={probing} onClick={runSystemProbe}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Kiểm tra toàn hệ thống
        </Button>
      </div>

      {/* Level 2: Summary Metrics & External Tool Launchers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E8E2D9] rounded-xl p-4 shadow-xs">
          <div className="text-[11px] text-[#706E68] uppercase font-semibold">Trạng thái Microservices</div>
          <div className="text-xl font-bold text-[#166534] mt-1 font-mono tabular-nums">
            {loading ? '...' : `${healthyCount} / ${SERVICE_TARGETS.length} Sẵn sàng`}
          </div>
          <div className="text-xs text-[#706E68] mt-1">Kết nối qua YARP Gateway (/api/v1/*)</div>
        </div>

        <div className="bg-white border border-[#E8E2D9] rounded-xl p-4 shadow-xs">
          <div className="text-[11px] text-[#706E68] uppercase font-semibold">Độ trễ phản hồi trung bình</div>
          <div className="text-xl font-bold text-[#1A1917] mt-1 font-mono tabular-nums">
            {loading ? '...' : `${avgLatency} ms`}
          </div>
          <div className="text-xs text-[#706E68] mt-1">Bao gồm kiểm tra kết nối PostgreSQL</div>
        </div>

        <a
          href="http://localhost:3001"
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-white hover:bg-[#FAF9F5] border border-[#E8E2D9] hover:border-[#B47820] rounded-xl p-4 shadow-xs transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#706E68] uppercase font-semibold">Grafana Dashboard</span>
            <ExternalLink className="w-4 h-4 text-[#B47820] group-hover:translate-x-0.5 transition" />
          </div>
          <div className="text-base font-bold text-[#1A1917] group-hover:text-[#B47820] mt-1 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-[#B47820]" /> Cổng 3001
          </div>
          <div className="text-xs text-[#706E68] mt-1">Biểu đồ trực quan 5 CSDL PostgreSQL</div>
        </a>

        <a
          href="http://localhost:5050"
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-white hover:bg-[#FAF9F5] border border-[#E8E2D9] hover:border-[#B47820] rounded-xl p-4 shadow-xs transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#706E68] uppercase font-semibold">pgAdmin 4 Web</span>
            <ExternalLink className="w-4 h-4 text-[#B47820] group-hover:translate-x-0.5 transition" />
          </div>
          <div className="text-base font-bold text-[#1A1917] group-hover:text-[#B47820] mt-1 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-[#B47820]" /> Cổng 5050
          </div>
          <div className="text-xs text-[#706E68] mt-1">Quản trị trực tiếp 5 Database-per-service</div>
        </a>
      </div>

      {/* Level 3: Microservices & Database Readiness Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1A1917] flex items-center gap-2">
              <Server className="w-4 h-4 text-[#B47820]" />
              Trạng thái Dịch vụ &amp; Cơ sở dữ liệu
            </h2>
            <p className="text-xs text-[#706E68] mt-0.5">
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
                  <div className="font-semibold text-[#1A1917] text-sm">{item.name}</div>
                  <div className="text-xs text-[#706E68]">{item.roleLabel}</div>
                </div>
              ),
            },
            {
              header: 'CSDL Độc lập',
              render: (item) => (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F5F0E8] text-[#1A1917] border border-[#E8E2D9]">
                  {item.dbName}
                </span>
              ),
            },
            {
              header: 'Trạng thái API',
              render: (item) =>
                item.status === 'Ready' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động tốt
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
                    <AlertTriangle className="w-3.5 h-3.5" /> Sự cố kết nối
                  </span>
                ),
            },
            {
              header: 'Kết nối PostgreSQL',
              render: (item) =>
                item.database === 'Connected' ? (
                  <span className="text-xs font-medium text-[#166534]">Đã kết nối</span>
                ) : (
                  <span className="text-xs font-medium text-[#991B1B]">Mất kết nối</span>
                ),
            },
            {
              header: 'Độ trễ',
              render: (item) => (
                <span className="font-mono text-xs font-semibold tabular-nums text-[#1A1917]">
                  {item.latencyMs} ms
                </span>
              ),
            },
            {
              header: 'Lần kiểm tra cuối',
              className: 'text-right',
              render: (item) => (
                <span className="font-mono text-xs text-[#706E68] tabular-nums">{item.checkedAt}</span>
              ),
            },
          ]}
        />
      </div>

      {/* Recent Business Activity Stream Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1A1917] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B47820]" />
              Hoạt động hệ thống gần đây ({totalAuditCount} sự kiện)
            </h2>
            <p className="text-xs text-[#706E68] mt-0.5">
              Các sự kiện thay đổi dữ liệu quan trọng được đẩy qua Redis Streams vào Audit Service.
            </p>
          </div>
          <Link href="/admin/logs">
            <Button variant="secondary" size="sm">
              Xem toàn bộ Nhật ký Audit &rarr;
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
                <span className="font-mono text-xs text-[#706E68] tabular-nums">
                  {new Date(item.occurredAt).toLocaleString('vi-VN')}
                </span>
              ),
            },
            {
              header: 'Thao tác nghiệp vụ',
              render: (item) => (
                <span className="font-semibold text-xs text-[#1A1917]">{getActionLabel(item.action)}</span>
              ),
            },
            {
              header: 'Người thực hiện',
              render: (item) => (
                <span className="text-xs text-[#1A1917]">{item.actorName || 'Hệ thống'}</span>
              ),
            },
            {
              header: 'Mô tả sự kiện',
              render: (item) => <span className="text-xs text-[#706E68]">{item.summary}</span>,
            },
          ]}
        />
      </div>
    </div>
  );
}
