# Phase 1 — Workspace and Project Contracts

## Context Links
- [Plan](./plan.md)
- [Assignment](../../../../PRN232/material/PRN232%20-%20Final%20Assignment.pdf)

## Overview
- Priority: P1
- Status: Pending
- Effort: 3h
- Goal: Create compilable project boundaries and neutral contracts. No business behavior.

## Requirements
- Pin `.NET 8` through `global.json`; use central package management.
- Create one backend solution and project references enforcing Domain ← Application ← Infrastructure ← API.
- Create shells for Identity, Recipe, Content, Audit, Gateway, BackgroundWorker, and shared gRPC contracts.
- Keep shared building blocks limited to transport/platform concerns. No shared domain model or generic repository.
- Add `.editorconfig`, `.gitignore`, `.env.example`, and root command conventions.

## Architecture

Each service gets four projects even if initially empty:

```text
RecipeHub.<Service>.Domain          # no project references
RecipeHub.<Service>.Application     # Domain only
RecipeHub.<Service>.Infrastructure  # Application + Domain
RecipeHub.<Service>.Api             # Application + Infrastructure
```

Exceptions:
- Audit API remains a shell; event persistence belongs to future work.
- Worker references platform event contracts, not service infrastructure internals.
- Gateway references no service project.
- `.proto` contracts live in `RecipeHub.GrpcContracts`; generated client/server code stays transport-only.

## Related Files

Create under project root:
- `global.json`, `Directory.Build.props`, `Directory.Packages.props`, `.editorconfig`, `.env.example`.
- `src/backend/RecipeHub.sln`.
- `src/backend/BuildingBlocks/RecipeHub.BuildingBlocks/`.
- `src/backend/Contracts/RecipeHub.GrpcContracts/` with `service_probe.proto`.
- Service project directories under `src/backend/Services/`.
- `src/backend/Gateway/RecipeHub.Gateway/`.
- `src/backend/Workers/RecipeHub.BackgroundWorker/`.

## Implementation Steps
1. Pin SDK and nullable/implicit-usings/warnings defaults centrally.
2. Create solution folders and projects; add only legal references above.
3. Add package references centrally: ASP.NET Core JWT bearer, EF Core/Npgsql, gRPC, YARP, StackExchange.Redis, OpenAPI/Swagger, health checks.
4. Define `ServiceProbe.Ping` request/reply containing correlation ID, service name, and UTC timestamp. No domain fields.
5. Define minimal event envelope contract: `eventId`, `eventType`, `occurredAtUtc`, `correlationId`, `source`, `schemaVersion`, `payload`. Sample type: `platform.heartbeat.v1`.
6. Add configuration option records for PostgreSQL, Redis, JWT validation, and service endpoints. Do not add secrets/default passwords to tracked settings.
7. Add compile-only tests/checks for forbidden reference direction if an existing convention supports it; otherwise verify through solution build.

## Todo
- [ ] Pin SDK and central package versions.
- [ ] Create solution/projects and legal project references.
- [ ] Add neutral gRPC and event contracts.
- [ ] Add option contracts and safe example environment variables.
- [ ] Confirm full backend solution restores and builds.

## Success Criteria
- `dotnet build src/backend/RecipeHub.sln` succeeds.
- Domain projects depend on no infrastructure/framework package.
- Solution contains every agreed project and only legal project references; runnable host acceptance belongs to Phase 2.
- Contracts contain no recipe/user/audit business behavior.

## Risks
- Four projects per service create many files. Accepted because user explicitly requested Clean Architecture; keep every project empty except startup wiring.
- Shared BuildingBlocks can become coupling. Restrict to cross-cutting transport/config primitives.

## Security
- `.env.example` contains names/placeholders only.
- JWT setup is validation plumbing only; no insecure token issuer endpoint.
- Local development credentials supplied through untracked environment variables.

## Next Steps
Phase 2 fills runtime hosts/configuration without adding domain logic.
