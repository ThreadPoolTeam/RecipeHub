# Scout Report

## Project State
- `README.md` only.
- `plans/` and `docs/` absent before planning.
- Branch: `main`.

## Reference Observations
- Backend reference: `BuildingBlocks`, gateway, and per-service Application/Domain/Infrastructure/Presentation layout.
- Frontend reference: `src/app`, auth route group, role-specific route trees, Docker support.

## Recommended Reuse
- Directory-level structural conventions.
- Layer dependency direction.
- App Router role-oriented navigation shape.

## Explicit Non-Reuse
- Reference business modules.
- Ocelot/RabbitMQ/SQL Server choices; user selected YARP/Redis Streams/PostgreSQL.
- Implemented auth and feature code.

## Foundation Boundary
Only startup wiring, health/service-info probes, one gRPC ping, one Redis heartbeat, and static role placeholder pages.
