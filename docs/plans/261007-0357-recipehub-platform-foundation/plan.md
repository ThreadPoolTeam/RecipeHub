---
title: "RecipeHub platform foundation"
description: "Scaffold a runnable microservice platform shell; defer all formula-management business behavior."
status: pending
priority: P1
effort: 10h
branch: main
tags: [infra, frontend, backend, database, api]
blockedBy: []
blocks: []
created: 2026-10-07
---

# RecipeHub Platform Foundation Plan

## Overview

Build only the technical frame shown in the supplied architecture: .NET 8 Clean Architecture service shells, YARP, PostgreSQL, Redis Streams, a .NET worker, gRPC wiring, Next.js, and Docker Compose. One placeholder health/message path proves wiring. Formula rules from the Phê La PDF remain future work.

## Scope Boundary

### In scope
- Greenfield monorepo/solution layout.
- Empty Clean Architecture projects for Identity, Recipe, Content, and Audit boundaries.
- Configuration and dependency wiring for PostgreSQL, Redis Streams, gRPC, JWT middleware, YARP, Next.js, Docker Compose.
- Health/readiness endpoints and one non-business connectivity smoke path.
- Placeholder role/navigation surfaces: Administrator, R&D Staff, Viewer.

### Not in scope
- Real users, login flows, permissions, refresh tokens, or production security policy.
- Recipe CRUD, search/filter/sort/page behavior, formula calculations, approval/versioning, PDF import, AI, R2 uploads.
- Reliable event retry/DLQ/outbox implementation, audit reporting, scheduled jobs.
- Production deployment, observability stack, CI/CD, cloud resources.
- Copying business code from the KFC reference repositories.

## Decisions

- Target `.NET 8` LTS for assignment compatibility; pin compatible package versions during execution from current NuGet metadata.
- Use one repository and one `.sln`; each future service owns Domain/Application/Infrastructure/Api projects.
- PostgreSQL database-per-service logically; one PostgreSQL container with separate databases for local development.
- Redis Streams contract exists only as a sample producer/consumer heartbeat event. At-least-once recovery is deferred.
- gRPC contract is a neutral `Ping`/`GetServiceInfo` probe, not fake domain logic.
- YARP exposes one public origin and forwards versioned route prefixes to service shells.
- Next.js App Router uses route groups and static placeholders; no fake business data layer.

## Target Shape

```text
src/
  backend/
    RecipeHub.sln
    BuildingBlocks/
    Gateway/RecipeHub.Gateway/
    Services/{Identity,Recipe,Content,Audit}/
    Workers/RecipeHub.BackgroundWorker/
    Contracts/RecipeHub.GrpcContracts/
  frontend/
    recipehub-web/
infra/
  compose.yaml
  postgres/
docs/
tests/smoke/
```

## Dependency Graph

```text
Phase 1: workspace and contracts
          ├── Phase 2: backend + infrastructure shells
          └── Phase 3: frontend + runbook + smoke proof
Phase 3 integration proof depends on Phase 2 runtime endpoints.
```

## File Ownership

| Phase | Ownership |
|---|---|
| 1 | Root configs, `src/backend/RecipeHub.sln`, all `.csproj` files, shared contracts |
| 2 | Backend host/config/source files, backend Dockerfiles, `infra/postgres/**`, initial `infra/compose.yaml` |
| 3 | `src/frontend/**`, `tests/smoke/**`, `README.md`, `docs/**`; sequenced handoff to extend `infra/compose.yaml` |

## Phases

| Phase | Name | Status |
|---|---|---|
| 1 | [Workspace and project contracts](./phase-01-workspace-and-contracts.md) | Pending |
| 2 | [Runtime infrastructure shells](./phase-02-runtime-infrastructure-shells.md) | Pending |
| 3 | [Frontend shell and integration proof](./phase-03-frontend-and-proof.md) | Pending |

## Success Criteria

- After the documented local bootstrap step, a fresh checkout starts through one Docker Compose command.
- Checked-in development-only PostgreSQL bootstrap creates the separate local databases; secrets still come from a copied untracked environment file.
- Gateway, four API shells, worker, frontend, PostgreSQL, and Redis become healthy.
- Gateway forwards each versioned placeholder service health/info route.
- One gRPC ping succeeds between two service shells.
- One sample Redis Stream event is deterministically published after worker readiness, consumed, acknowledged, and visible in logs.
- Next.js renders role-based placeholder navigation and gateway connectivity status.
- No business entity, fake CRUD, formula rule, or production-auth claim is presented as complete.

## Sources

- `PRN232 - Final Assignment.pdf`: .NET 8+, REST, JWT, gRPC, message broker, worker, Docker requirements.
- `Bộ công thức Phê La Update 13_07_2026 (1).pdf`: future domain source only.
- KFC reference repositories: structural inspiration for layered services and Next.js App Router; no code dependency.
- YARP 2.3 documentation: configuration-driven routes/clusters and health checks.
- Redis documentation: consumer groups require `XREADGROUP` then `XACK`; reliability hardening deferred.
- Next.js 16 documentation: App Router, server/client boundary, standalone container output.

## Red Team Review

- Reviewed: 2026-10-07
- Result: no critical blocker; 5 findings accepted.
- Corrections: self-contained local bootstrap, deterministic heartbeat trigger, versioned gateway routes, phase-correct runnable acceptance, sequenced Compose ownership.

## Validation Log

- User decision: foundation only; business behavior and reference-code reuse deferred.
- Validation outcome: no further interview needed. Plan contains no unresolved tradeoff that changes the requested scaffold.
