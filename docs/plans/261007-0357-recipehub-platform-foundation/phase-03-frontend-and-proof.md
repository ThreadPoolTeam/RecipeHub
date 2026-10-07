# Phase 3 — Frontend Shell and Integration Proof

## Context Links
- [Plan](./plan.md)
- [Runtime shells](./phase-02-runtime-infrastructure-shells.md)

## Overview
- Priority: P1
- Status: Pending
- Effort: 3h
- Goal: Add a navigable Next.js shell, runbook, and non-business end-to-end proof.

## Requirements
- Current stable Next.js App Router, React, TypeScript, Tailwind CSS.
- Containerized standalone output.
- Placeholder navigation for Administrator, R&D Staff, Viewer.
- One server-side gateway client for connectivity status; browser does not know internal service URLs.
- Clear “foundation only / coming later” labels.
- README covers architecture, stack, startup, diagnostics, and deferred work.

## Architecture

```text
src/frontend/recipehub-web/src/
  app/
    (public)/page.tsx
    (workspace)/layout.tsx
    (workspace)/admin/page.tsx
    (workspace)/rnd/page.tsx
    (workspace)/viewer/page.tsx
    api/health/route.ts
  components/
    app-shell/
    platform-status/
  lib/server/gateway-client.ts
```

No AuthContext, token storage, Axios interceptor, domain DTO, form, or recipe table yet. Those would imply behavior not implemented.

## Related Files

Create/modify only:
- `src/frontend/recipehub-web/**`.
- `tests/smoke/platform-foundation.*`.
- `README.md`.
- `docs/system-architecture.md`.
- `docs/development-rules.md`, `docs/code-standards.md` if project lacks them.
- `infra/compose.yaml` only to add frontend service.

## Implementation Steps
1. Scaffold Next.js with App Router/TypeScript/Tailwind; enable `output: 'standalone'`.
2. Build accessible app shell: header, sidebar, active navigation, responsive layout. Pages show role name, future module names, and explicit deferred-state notices.
3. Add server-only gateway base URL and status fetch. Expose only sanitized status to the page; avoid `NEXT_PUBLIC_*` for internal addresses.
4. Add frontend `/api/health` for container liveness.
5. Add multi-stage Dockerfile, then extend the Phase 2 Compose file with the frontend service; expose frontend and gateway only.
6. Add smoke script that starts/uses Compose, waits for worker readiness, invokes the Development-only heartbeat endpoint, and verifies: frontend 200, gateway health, one proxied `/api/v1/...` service info response, gRPC probe result, heartbeat consumed/acked.
7. Rewrite README with the local environment bootstrap, one-command Compose startup, port map, diagram, troubleshooting, and explicit deferred backlog.
8. Document assignment mapping: foundation wires required technologies; future milestone must add actual REST CRUD/JWT/business workflow before submission.

## Todo
- [ ] Scaffold Next.js standalone app.
- [ ] Add role placeholder routes and app shell.
- [ ] Add server-only gateway status integration.
- [ ] Add frontend container to Compose.
- [ ] Add platform smoke scenario.
- [ ] Document architecture, startup, and deferred assignment work.

## Success Criteria
- Frontend loads through documented local URL and shows all three role placeholders.
- Platform status reaches gateway without exposing internal Compose hostnames to browser code.
- Smoke command proves HTTP proxy, PostgreSQL readiness, gRPC, and Redis producer/consumer wiring.
- README says the assignment is not functionally complete until deferred CRUD/JWT/business workflow is implemented.

## Risks
- Placeholder role pages can be mistaken for authorization. Labels and docs must state no authentication/authorization exists yet.
- Frontend connectivity check can couple rendering to backend availability. Render degraded status, not a page crash.

## Security
- No JWT in localStorage/cookies because auth is deferred.
- Server-only environment variable holds internal gateway URL.
- Status output excludes connection strings, stack traces, and dependency credentials.

## Deferred Backlog
- Identity issuance/refresh/role authorization.
- Recipe model, versions, ingredients, steps, formula constraints, CRUD/search/filter/sort/page.
- Content/media and Cloudflare R2.
- Audit persistence/reporting and robust Redis pending recovery/DLQ/outbox.
- AI providers and PDF ingestion.
- Production deployment, TLS, secret management, telemetry, CI/CD.
