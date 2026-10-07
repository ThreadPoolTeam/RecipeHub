# Scaffold Research Findings

## Summary
- Repository contains only a minimal README; no existing plan or development standards.
- Assignment requires .NET 8+, REST/JWT, gRPC, broker, worker, EF relational DB, Docker, Swagger. This plan only wires foundations; functional compliance remains deferred.
- KFC reference backend uses layered service projects and shared building blocks. Reuse shape, not code/business scope.
- KFC reference frontend uses Next.js App Router with role routes. Keep route grouping; omit its implemented auth/domain features.
- Supplied Phê La formula PDF is domain input for a future plan, not scaffold seed data.

## Technology Decisions
- .NET 8 LTS, ASP.NET Core, EF Core/Npgsql.
- YARP configuration-driven routes/clusters.
- Redis Streams consumer group: `XADD`, `XREADGROUP`, process, then `XACK`.
- Neutral gRPC service probe to prove transport without faking a domain service.
- Next.js App Router with standalone Docker output.
- Docker Compose local orchestration.

## Guardrails
- No real business entities, repositories, use cases, CRUD, seed data, auth flow, or formula parser.
- No generic repository/CQRS/event bus abstraction before a business use case requires it.
- No production claims from a local scaffold.
- Each placeholder must say what remains deferred.
