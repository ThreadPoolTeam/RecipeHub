# RecipeHub monitoring

## Contract
- Preserve the existing business dashboard and all local changes.
- Prometheus scrapes six .NET HTTP entrypoints at `/metrics`: gateway:5000, identity-service:5001, recipe-service:5002, content-service:5003, audit-service:5004, quiz-service:5005.
- Instrument with prometheus-net.AspNetCore 8.2.1. HTTP request count/status/duration and default process/runtime metrics; bounded labels, no raw user IDs or request URLs. Do not count `/metrics` or health probes as business traffic.
- cAdvisor provides CPU, working-set RAM, network and lifecycle metrics for Docker Linux containers. Docker Desktop data describes the Docker VM/containers, not Windows host RAM/CPU.
- Prometheus postgres-exporter and redis-exporter provide database/cache metrics. Reuse grafana_reader for PostgreSQL with pg_monitor; apply an idempotent grant to existing Docker DB only, never reset volumes.
- blackbox-exporter probes web and backend readiness. Dedicated Grafana dashboard UID `recipehub-monitoring`, Prometheus datasource UID `recipehub-prometheus`. Existing SQL dashboard remains.
- Pin images; retain metrics 7 days; Prometheus published on localhost:9090 only. No public exporter ports.

## Execution
1. Add .NET request/runtime metrics (backend owner).
2. Add Docker exporters, Prometheus configuration, datasource and dashboard (infrastructure owner).
3. Update existing runbook and architecture reference; integrate matching metric names/labels.
4. Build backend/frontend once, start changed stack without deleting volumes, generate real HTTP traffic, prove scrape targets/metric values/panel queries and view dashboard in browser.

## Acceptance
CPU/RAM data for RecipeHub containers, network rates, API RPS/status/errors/p95, readiness and scrape status, PostgreSQL connection/activity/transaction metrics and Redis memory/commands/clients metrics. Missing metrics must be shown as missing, not fabricated as zero. Existing login, Recipe info and business dashboard remain operational. No AI generation calls required.

## Status
Completed.

## Verification
- `dotnet build src/backend/RecipeHub.sln -m:1 --nologo`: 0 warnings, 0 errors.
- Windows `npm run build`: compiled and typechecked, then page-data worker crashed with code 3221226505. No frontend source changed for monitoring. `docker compose ... build frontend`: succeeded using cached Linux build layers; this does not prove the Windows crash is fixed.
- Built and started all six instrumented backend images. All 18 scrape targets up; all seven HTTP readiness probes successful.
- cAdvisor initially could not open containerd; mounting `/run/containerd` fixed discovery. CPU/RAM charts visually show all 17 named RecipeHub containers. Values describe Docker Linux containers, not Windows host resources.
- Generated read-only HTTP workload: 160 authenticated info requests returned 200 across multiple scrape intervals. All six services have real RPS and p95 series. Additional intentional 401/403/404 boundary requests were counted.
- Fifteen health/metrics requests left Gateway business request counters unchanged (107 before/after). Route-template labels do not contain the unmatched raw test URL.
- All 43 dashboard expressions executed through Grafana's Prometheus datasource without query errors. Inspected readiness, CPU, RAM, filtered request-rate and p95 charts in the real browser; closed QA tab.
- Two independent read-only reviews initially reported no findings. Additional review found `$1xx` was parsed as a capture name, losing the HTTP status-class label; changed to `${1}xx`, reloaded provisioning, and verified actual `2xx`/`4xx` labels through Prometheus, Grafana datasource and browser. Existing SQL dashboard preserved; Grafana home now points at monitoring.
- Existing Docker PostgreSQL volume preserved; applied only an idempotent pg_monitor grant, no business schema change. No native DB/Redis access, no AI generation API calls.

## Limits
- No Windows host exporter, log ingestion, gRPC application-status instrumentation, worker job progress or notification channels. HTTP 5xx series remain absent until observed, rather than fabricating zero.
- Grafana 11.2 anonymous panel navigation can request `/api/user/preferences` and show an Unauthorized toast; authenticated admin chart viewing worked. This is distinct from metric/datasource permissions, which were verified.
