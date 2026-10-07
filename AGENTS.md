# Agent Operating Guidelines & Project Context

## Project Overview
- **Project Name:** RecipeHub
- **Domain:** Coffee & Beverage R&D Formula Management System (Hệ thống quản lý công thức R&D chuỗi đồ uống)
- **Target Course:** PRN232 / PRM Semester 8 (FPT University)
- **Architecture:** .NET 8 Microservices Clean Architecture, YARP Reverse Proxy Gateway, PostgreSQL (database-per-service), Redis Streams, gRPC, Next.js 14 App Router, Docker Compose.

---

## Directory Structure
```text
RecipeHub/
├── src/
│   ├── backend/
│   │   ├── RecipeHub.sln
│   │   ├── BuildingBlocks/RecipeHub.BuildingBlocks/         # Shared envelope, options, events
│   │   ├── Contracts/RecipeHub.GrpcContracts/               # Protobuf contracts (probe.proto)
│   │   ├── Gateway/RecipeHub.Gateway/                       # YARP API Gateway (/api/v1/...)
│   │   ├── Services/
│   │   │   ├── Identity/ (Domain, Application, Infrastructure, Api)
│   │   │   ├── Recipe/   (Domain, Application, Infrastructure, Api)
│   │   │   ├── Content/  (Domain, Application, Infrastructure, Api)
│   │   │   └── Audit/    (Domain, Application, Infrastructure, Api)
│   │   └── Workers/
│   │       └── RecipeHub.BackgroundWorker/                  # Redis Streams consumer with MKSTREAM & ACK
│   └── frontend/
│       └── recipehub-web/                                   # Next.js 14 App Router (Standalone)
├── infra/
│   ├── compose.yaml                                         # Full-stack Docker Compose
│   └── postgres/init-databases.sh                           # 4 independent databases bootstrap
├── docs/
│   ├── journals/                                            # Development journals & logs
│   ├── plans/                                               # Implementation plans and phases
│   └── materials/                                           # Domain documents and assignment guides
├── tests/
│   └── smoke/smoke-test.sh                                  # Strict fail-fast smoke test
├── AGENTS.md                                                # Guidelines for AI coding agents
├── README.md                                                # Quickstart and runbook
└── .env.example                                             # Environment variables template
```

---

## Technical Constraints & Boundaries
1. **Clean Architecture Dependency Direction:**
   - `Domain` depends on NOTHING.
   - `Application` depends on `Domain` and `BuildingBlocks`.
   - `Infrastructure` depends on `Application` and `Domain`.
   - `Api` references `Infrastructure`, `Application`, and `BuildingBlocks`.
2. **Inter-Service Communication:**
   - Synchronous RPC: Use **gRPC** via contracts defined in `src/backend/Contracts/RecipeHub.GrpcContracts`.
   - Asynchronous Messaging: Use **Redis Streams** via `EventEnvelope<T>` in `BuildingBlocks` with explicit consumer groups (`XREADGROUP` + `XACK`).
   - External Gateway: Use **YARP** routes prefixed with `/api/v1/{service-name}/*`.
3. **Database Isolation:**
   - Logical Database-per-service: `recipehub_identity`, `recipehub_recipe`, `recipehub_content`, `recipehub_audit`.
   - Separate credentials per database service defined in `.env`.
4. **Deferred Scope (Do NOT implement unless explicitly planned):**
   - Complex formula calculation logic.
   - Production JWT token issuance / OAuth2 flows.
   - AI/Gemini formula assistants.
   - Cloudflare R2 file storage.

---

## Working Rules for Agents
- **Language & Style:** Communication in Vietnamese, concise/terse caveman style unless asked otherwise.
- **Git Workflow:** Atomic commits (no big-bang commits). Include scope prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- **Validation:** Always verify changes (`dotnet build src/backend/RecipeHub.sln`, `npm run build`) before claiming completion.
