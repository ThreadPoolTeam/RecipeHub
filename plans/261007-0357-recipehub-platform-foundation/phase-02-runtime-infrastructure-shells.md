# Phase 2 — Runtime Infrastructure Shells

## Context Links
- [Plan](./plan.md)
- [Workspace contracts](./phase-01-workspace-and-contracts.md)

## Overview
- Priority: P1
- Status: Pending
- Effort: 4h
- Goal: Make every backend/infrastructure component start and prove transport connectivity only.

## Requirements
- YARP route prefixes `/api/v1/identity/*`, `/api/v1/recipes/*`, `/api/v1/content/*`, and `/api/v1/audit/*`.
- One PostgreSQL container; separate local databases and credentials per service.
- Checked-in development bootstrap creates databases only; credentials come from an untracked environment file copied from `.env.example`.
- Redis container and one `platform.heartbeat.v1` stream.
- One .NET `BackgroundService` consumer group that logs and acknowledges the sample heartbeat.
- One gRPC server/client ping pair.
- Health endpoints distinguish liveness from readiness.
- Dockerfiles and Compose orchestration with health-based dependencies.

## Architecture

```text
Browser -> Next.js -> YARP
                    ├─ /api/v1/identity/* -> Identity.Api
                    ├─ /api/v1/recipes/*  -> Recipe.Api
                    ├─ /api/v1/content/*  -> Content.Api
                    └─ /api/v1/audit/*    -> Audit.Api

Content.Api --gRPC Ping--> Recipe.Api
Recipe.Api --XADD platform.heartbeat--> Redis
BackgroundWorker --XREADGROUP/XACK--> Redis
Service shells --readiness--> own PostgreSQL database
```

The endpoints above return service metadata/health only. `/api/v1/recipes/*` is a namespace reservation, not Recipe CRUD.

## Related Files

Create/modify only:
- `src/backend/Gateway/RecipeHub.Gateway/**`.
- `src/backend/Services/{Identity,Recipe,Content,Audit}/**` host/config files.
- `src/backend/Workers/RecipeHub.BackgroundWorker/**`.
- `infra/compose.yaml`, `infra/postgres/**`.
- Per-host `Dockerfile`, `appsettings.json`, `appsettings.Development.json`.

## Implementation Steps
1. Add consistent Problem Details, correlation ID propagation, structured console logging, OpenAPI, and `/health/live`, `/health/ready` to API shells.
2. Configure each service with its own connection string/database. Add empty `DbContext` and initial infrastructure migration only if needed to prove EF/PostgreSQL connectivity; do not invent domain tables.
3. Configure Recipe API as gRPC probe server and Content API as its client over Compose HTTP/2.
4. Configure YARP routes/clusters from settings, preserving correlation/authorization headers. Enable service health checks; no custom proxy middleware unless required.
5. Add a Development-only heartbeat publish endpoint. The smoke script invokes it only after worker readiness; do not publish during startup. Response/log names must say `platform heartbeat`, not recipe creation.
6. Implement worker loop: ensure consumer group with `MKSTREAM`, signal readiness, block-read new messages, deserialize envelope, log event ID, and `XACK` only after successful handling. Explicitly omit retry/DLQ claims from completion.
7. Compose PostgreSQL, Redis, gateway, four APIs, and worker. Add checked-in database bootstrap and document copying `.env.example` to an untracked local environment file. Use internal DNS service names; expose only gateway and development diagnostics ports.
8. Add deterministic startup/readiness conditions and graceful cancellation.

## Todo
- [ ] Wire shared host defaults and health endpoints.
- [ ] Wire isolated PostgreSQL readiness per service.
- [ ] Wire neutral gRPC ping.
- [ ] Configure YARP route namespaces.
- [ ] Wire Redis heartbeat producer and worker consumer.
- [ ] Containerize and start backend stack.

## Success Criteria
- After the documented environment bootstrap, Compose reports PostgreSQL, Redis, gateway, four independently runnable APIs, and worker healthy/running.
- Gateway returns each service metadata endpoint through its `/api/v1/...` route.
- Content service log/endpoint proves gRPC ping response from Recipe service.
- Calling the heartbeat endpoint after worker readiness produces one log entry and Redis pending count returns zero after acknowledgment.
- No domain table or business endpoint exists.

## Risks
- gRPC h2c in containers fails if Kestrel protocol/listener configuration differs. Document exact internal port/protocol.
- `depends_on` alone does not prove readiness. Use health checks and application retry for startup connections.
- Acknowledging before processing loses events. Ack only after the placeholder handler completes.

## Security
- Gateway is the intended public ingress; service ports remain internal in normal Compose profile.
- JWT middleware configured but protected routes deferred until a real identity flow exists.
- Redis/PostgreSQL credentials supplied by environment; local-only values never presented as production-safe.

## Next Steps
Phase 3 adds the frontend shell and one automated connectivity proof.
