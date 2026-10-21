# Tasks 1.1–1.8 implementation journal

## Implemented

- Identity entities and PostgreSQL mapping aligned with `Identity.dbml`.
- JWT login, refresh rotation, logout, hashed refresh sessions, account administration, and lock revocation.
- Shared role/permission authorization library and usage guide.
- Unit catalog/conversion, ingredient catalog/soft delete, yield calculations, recipe snapshots, drift detection, and approved-version immutability.
- Forward-only initial migrations for Identity and Recipe databases.
- Docker Compose connection-string key alignment.

## Verification

- `dotnet build src/backend/RecipeHub.sln --no-restore`: 0 warnings, 0 errors.
- `dotnet test src/backend/RecipeHub.sln --no-restore`: 15 passed, 0 failed.
- Identity and Recipe idempotent migration SQL generation: passed.
- `docker compose config --quiet`: passed.
- `git diff --check`: passed.
