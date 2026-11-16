#!/bin/bash
set -euo pipefail

# Run only inside the Compose postgres service; uses its existing credentials.
export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
psql --host=127.0.0.1 --port=5432 \
    --username="${POSTGRES_USER:?POSTGRES_USER is required}" \
    --dbname="${POSTGRES_DB:?POSTGRES_DB is required}" \
    --set=ON_ERROR_STOP=1 \
    --set=grafana_db_user="${GRAFANA_DB_USER:-grafana_reader}" <<'SQL'
GRANT pg_monitor TO :"grafana_db_user";
SQL
