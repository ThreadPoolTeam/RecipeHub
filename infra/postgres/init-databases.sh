#!/bin/bash
set -e

# Initialize isolated databases and user roles for RecipeHub microservices.
# Role model per database (DB First: DDL account separate from runtime account):
#   <svc>_migrator : owns the database/schema, runs DDL + seed (never used by services)
#   <svc>_user     : runtime only - CONNECT, USAGE on schema, DML on tables, USAGE/SELECT on sequences
#   grafana_reader : SELECT for Grafana datasources + pg_monitor for postgres-exporter
IDENTITY_MIGRATOR_USER="${IDENTITY_MIGRATOR_USER:-identity_migrator}"
IDENTITY_MIGRATOR_PASSWORD="${IDENTITY_MIGRATOR_PASSWORD:-identity_migrator_pw}"
RECIPE_MIGRATOR_USER="${RECIPE_MIGRATOR_USER:-recipe_migrator}"
RECIPE_MIGRATOR_PASSWORD="${RECIPE_MIGRATOR_PASSWORD:-recipe_migrator_pw}"
CONTENT_MIGRATOR_USER="${CONTENT_MIGRATOR_USER:-content_migrator}"
CONTENT_MIGRATOR_PASSWORD="${CONTENT_MIGRATOR_PASSWORD:-content_migrator_pw}"
GRAFANA_DB_USER="${GRAFANA_DB_USER:-grafana_reader}"
GRAFANA_DB_PASSWORD="${GRAFANA_DB_PASSWORD:-grafana_reader_pw}"

psql -v ON_ERROR_STOP=1 -v grafana_db_user="$GRAFANA_DB_USER" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- 0. Read-only business data and PostgreSQL statistics for monitoring
    CREATE USER ${GRAFANA_DB_USER} WITH ENCRYPTED PASSWORD '${GRAFANA_DB_PASSWORD}';
    GRANT pg_monitor TO :"grafana_db_user";

    -- 1. Identity Service: DDL migration role owns DB; runtime role gets least privilege
    CREATE USER ${IDENTITY_MIGRATOR_USER} WITH ENCRYPTED PASSWORD '${IDENTITY_MIGRATOR_PASSWORD}';
    CREATE USER ${IDENTITY_DB_USER:-identity_user} WITH ENCRYPTED PASSWORD '${IDENTITY_DB_PASSWORD:-identity_pw}';
    CREATE DATABASE ${IDENTITY_DB_NAME:-recipehub_identity} OWNER ${IDENTITY_MIGRATOR_USER};
    GRANT CONNECT ON DATABASE ${IDENTITY_DB_NAME:-recipehub_identity} TO ${IDENTITY_DB_USER:-identity_user}, ${GRAFANA_DB_USER};

    -- 2. Recipe Service: DDL migration role owns DB; runtime role gets least privilege
    CREATE USER ${RECIPE_MIGRATOR_USER} WITH ENCRYPTED PASSWORD '${RECIPE_MIGRATOR_PASSWORD}';
    CREATE USER ${RECIPE_DB_USER:-recipe_user} WITH ENCRYPTED PASSWORD '${RECIPE_DB_PASSWORD:-recipe_pw}';
    CREATE DATABASE ${RECIPE_DB_NAME:-recipehub_recipe} OWNER ${RECIPE_MIGRATOR_USER};
    GRANT CONNECT ON DATABASE ${RECIPE_DB_NAME:-recipehub_recipe} TO ${RECIPE_DB_USER:-recipe_user}, ${GRAFANA_DB_USER};

    -- 3. Content Service: DDL migration role owns DB; runtime role gets least privilege
    CREATE USER ${CONTENT_MIGRATOR_USER} WITH ENCRYPTED PASSWORD '${CONTENT_MIGRATOR_PASSWORD}';
    CREATE USER ${CONTENT_DB_USER:-content_user} WITH ENCRYPTED PASSWORD '${CONTENT_DB_PASSWORD:-content_pw}';
    CREATE DATABASE ${CONTENT_DB_NAME:-recipehub_content} OWNER ${CONTENT_MIGRATOR_USER};
    GRANT CONNECT ON DATABASE ${CONTENT_DB_NAME:-recipehub_content} TO ${CONTENT_DB_USER:-content_user}, ${GRAFANA_DB_USER};

    -- 4. Audit Service: DDL migration role owns DB; runtime role gets least privilege (append/read only)
    CREATE USER ${AUDIT_MIGRATOR_USER:-audit_migrator} WITH ENCRYPTED PASSWORD '${AUDIT_MIGRATOR_PASSWORD:-audit_migrator_pw}';
    CREATE USER ${AUDIT_DB_USER:-audit_user} WITH ENCRYPTED PASSWORD '${AUDIT_DB_PASSWORD:-audit_pw}';
    CREATE DATABASE ${AUDIT_DB_NAME:-recipehub_audit} OWNER ${AUDIT_MIGRATOR_USER:-audit_migrator};
    GRANT CONNECT ON DATABASE ${AUDIT_DB_NAME:-recipehub_audit} TO ${AUDIT_DB_USER:-audit_user}, ${GRAFANA_DB_USER};

    -- 5. Quiz Service: DDL migration role owns DB; runtime role gets least privilege
    CREATE USER ${QUIZ_MIGRATOR_USER:-quiz_migrator} WITH ENCRYPTED PASSWORD '${QUIZ_MIGRATOR_PASSWORD:-quiz_migrator_pw}';
    CREATE USER ${QUIZ_DB_USER:-quiz_user} WITH ENCRYPTED PASSWORD '${QUIZ_DB_PASSWORD:-quiz_pw}';
    CREATE DATABASE ${QUIZ_DB_NAME:-recipehub_quiz} OWNER ${QUIZ_MIGRATOR_USER:-quiz_migrator};
    GRANT CONNECT ON DATABASE ${QUIZ_DB_NAME:-recipehub_quiz} TO ${QUIZ_DB_USER:-quiz_user}, ${GRAFANA_DB_USER};
EOSQL

# Run a SQL file as a migration role: run_sql_file <migrator_user> <migrator_password> <database> <file>
run_sql_file() {
    PGPASSWORD="$2" psql -v ON_ERROR_STOP=1 --username "$1" --dbname "$3" -f "$4"
}

# 1. Execute official versioned DDL for Identity Service as Identity migration role
if [ -f "/schema/identity-db/RecipeHub.Identity.postgres" ]; then
    run_sql_file "${IDENTITY_MIGRATOR_USER}" "${IDENTITY_MIGRATOR_PASSWORD}" "${IDENTITY_DB_NAME:-recipehub_identity}" "/schema/identity-db/RecipeHub.Identity.postgres"
fi

# Grant least-privilege runtime DML to identity_user; Grafana gets read-only on non-secret data only
# (roles + non-credential columns of users; password_hash and auth_sessions stay unreadable).
PGPASSWORD="${IDENTITY_MIGRATOR_PASSWORD}" psql -v ON_ERROR_STOP=1 --username "${IDENTITY_MIGRATOR_USER}" --dbname "${IDENTITY_DB_NAME:-recipehub_identity}" <<-EOSQL
    GRANT USAGE ON SCHEMA identity_db TO ${IDENTITY_DB_USER:-identity_user}, ${GRAFANA_DB_USER};
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity_db TO ${IDENTITY_DB_USER:-identity_user};
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA identity_db TO ${IDENTITY_DB_USER:-identity_user};
    ALTER DEFAULT PRIVILEGES FOR ROLE ${IDENTITY_MIGRATOR_USER} IN SCHEMA identity_db GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${IDENTITY_DB_USER:-identity_user};
    ALTER DEFAULT PRIVILEGES FOR ROLE ${IDENTITY_MIGRATOR_USER} IN SCHEMA identity_db GRANT USAGE, SELECT ON SEQUENCES TO ${IDENTITY_DB_USER:-identity_user};
    GRANT SELECT ON identity_db.roles TO ${GRAFANA_DB_USER};
    GRANT SELECT (id, email, full_name, role_id, is_active, created_at, updated_at) ON identity_db.users TO ${GRAFANA_DB_USER};
EOSQL

# 2. Execute official versioned DDL & reference catalog seed for Recipe Service as Recipe migration role
if [ -f "/schema/recipe-db/RecipeHub.Recipe.postgres" ]; then
    run_sql_file "${RECIPE_MIGRATOR_USER}" "${RECIPE_MIGRATOR_PASSWORD}" "${RECIPE_DB_NAME:-recipehub_recipe}" "/schema/recipe-db/RecipeHub.Recipe.postgres"
fi

if [ -f "/schema/recipe-db/migrations/20261028_seed_catalog.sql" ]; then
    run_sql_file "${RECIPE_MIGRATOR_USER}" "${RECIPE_MIGRATOR_PASSWORD}" "${RECIPE_DB_NAME:-recipehub_recipe}" "/schema/recipe-db/migrations/20261028_seed_catalog.sql"
fi

# Base units (is_base/factor_to_base) for seeded catalog; idempotent, must run after the seed
if [ -f "/schema/recipe-db/migrations/20261107_seed_catalog_base_units.sql" ]; then
    run_sql_file "${RECIPE_MIGRATOR_USER}" "${RECIPE_MIGRATOR_PASSWORD}" "${RECIPE_DB_NAME:-recipehub_recipe}" "/schema/recipe-db/migrations/20261107_seed_catalog_base_units.sql"
fi

# Grant least-privilege runtime DML to recipe_user; read-only to Grafana
PGPASSWORD="${RECIPE_MIGRATOR_PASSWORD}" psql -v ON_ERROR_STOP=1 --username "${RECIPE_MIGRATOR_USER}" --dbname "${RECIPE_DB_NAME:-recipehub_recipe}" <<-EOSQL
    GRANT USAGE ON SCHEMA recipe_db TO ${RECIPE_DB_USER:-recipe_user}, ${GRAFANA_DB_USER};
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA recipe_db TO ${RECIPE_DB_USER:-recipe_user};
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA recipe_db TO ${RECIPE_DB_USER:-recipe_user};
    ALTER DEFAULT PRIVILEGES FOR ROLE ${RECIPE_MIGRATOR_USER} IN SCHEMA recipe_db GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${RECIPE_DB_USER:-recipe_user};
    ALTER DEFAULT PRIVILEGES FOR ROLE ${RECIPE_MIGRATOR_USER} IN SCHEMA recipe_db GRANT USAGE, SELECT ON SEQUENCES TO ${RECIPE_DB_USER:-recipe_user};
    GRANT SELECT ON ALL TABLES IN SCHEMA recipe_db TO ${GRAFANA_DB_USER};
    ALTER DEFAULT PRIVILEGES FOR ROLE ${RECIPE_MIGRATOR_USER} IN SCHEMA recipe_db GRANT SELECT ON TABLES TO ${GRAFANA_DB_USER};
EOSQL

# 3. Execute official versioned DDL for Content Service as Content migration role
if [ -f "/schema/content-db/RecipeHub.Content.postgres" ]; then
    run_sql_file "${CONTENT_MIGRATOR_USER}" "${CONTENT_MIGRATOR_PASSWORD}" "${CONTENT_DB_NAME:-recipehub_content}" "/schema/content-db/RecipeHub.Content.postgres"
fi

# Grant least-privilege runtime DML to content_user; read-only to Grafana
PGPASSWORD="${CONTENT_MIGRATOR_PASSWORD}" psql -v ON_ERROR_STOP=1 --username "${CONTENT_MIGRATOR_USER}" --dbname "${CONTENT_DB_NAME:-recipehub_content}" <<-EOSQL
    GRANT USAGE ON SCHEMA content_db TO ${CONTENT_DB_USER:-content_user}, ${GRAFANA_DB_USER};
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA content_db TO ${CONTENT_DB_USER:-content_user};
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA content_db TO ${CONTENT_DB_USER:-content_user};
    ALTER DEFAULT PRIVILEGES FOR ROLE ${CONTENT_MIGRATOR_USER} IN SCHEMA content_db GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${CONTENT_DB_USER:-content_user};
    ALTER DEFAULT PRIVILEGES FOR ROLE ${CONTENT_MIGRATOR_USER} IN SCHEMA content_db GRANT USAGE, SELECT ON SEQUENCES TO ${CONTENT_DB_USER:-content_user};
    GRANT SELECT ON ALL TABLES IN SCHEMA content_db TO ${GRAFANA_DB_USER};
    ALTER DEFAULT PRIVILEGES FOR ROLE ${CONTENT_MIGRATOR_USER} IN SCHEMA content_db GRANT SELECT ON TABLES TO ${GRAFANA_DB_USER};
EOSQL

# 4. Execute official versioned DDL as Quiz migration role (sole authority for fresh DB)
if [ -f "/schema/quiz-db/RecipeHub.Quiz.postgres" ]; then
    PGPASSWORD="${QUIZ_MIGRATOR_PASSWORD:-quiz_migrator_pw}" psql -v ON_ERROR_STOP=1 --username "${QUIZ_MIGRATOR_USER:-quiz_migrator}" --dbname "${QUIZ_DB_NAME:-recipehub_quiz}" -f "/schema/quiz-db/RecipeHub.Quiz.postgres"
fi

# Grant least-privilege runtime DML to quiz_user; read-only to Grafana
PGPASSWORD="${QUIZ_MIGRATOR_PASSWORD:-quiz_migrator_pw}" psql -v ON_ERROR_STOP=1 --username "${QUIZ_MIGRATOR_USER:-quiz_migrator}" --dbname "${QUIZ_DB_NAME:-recipehub_quiz}" <<-EOSQL
    GRANT USAGE ON SCHEMA quiz_db TO ${QUIZ_DB_USER:-quiz_user}, ${GRAFANA_DB_USER};
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA quiz_db TO ${QUIZ_DB_USER:-quiz_user};
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA quiz_db TO ${QUIZ_DB_USER:-quiz_user};
    ALTER DEFAULT PRIVILEGES IN SCHEMA quiz_db GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${QUIZ_DB_USER:-quiz_user};
    ALTER DEFAULT PRIVILEGES IN SCHEMA quiz_db GRANT USAGE, SELECT ON SEQUENCES TO ${QUIZ_DB_USER:-quiz_user};
    GRANT SELECT ON ALL TABLES IN SCHEMA quiz_db TO ${GRAFANA_DB_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA quiz_db GRANT SELECT ON TABLES TO ${GRAFANA_DB_USER};
EOSQL

# 5. Execute official versioned DDL as Audit migration role (sole authority for fresh DB)
if [ -f "/schema/audit-db/RecipeHub.Audit.postgres" ]; then
    PGPASSWORD="${AUDIT_MIGRATOR_PASSWORD:-audit_migrator_pw}" psql -v ON_ERROR_STOP=1 --username "${AUDIT_MIGRATOR_USER:-audit_migrator}" --dbname "${AUDIT_DB_NAME:-recipehub_audit}" -f "/schema/audit-db/RecipeHub.Audit.postgres"
fi

# Grant least-privilege runtime DML to audit_user (SELECT, INSERT only, NO UPDATE/DELETE/DDL); read-only to Grafana
PGPASSWORD="${AUDIT_MIGRATOR_PASSWORD:-audit_migrator_pw}" psql -v ON_ERROR_STOP=1 --username "${AUDIT_MIGRATOR_USER:-audit_migrator}" --dbname "${AUDIT_DB_NAME:-recipehub_audit}" <<-EOSQL
    GRANT USAGE ON SCHEMA audit_db TO ${AUDIT_DB_USER:-audit_user}, ${GRAFANA_DB_USER};
    GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA audit_db TO ${AUDIT_DB_USER:-audit_user};
    ALTER DEFAULT PRIVILEGES IN SCHEMA audit_db GRANT SELECT, INSERT ON TABLES TO ${AUDIT_DB_USER:-audit_user};
    REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA audit_db FROM ${AUDIT_DB_USER:-audit_user};
    GRANT SELECT ON ALL TABLES IN SCHEMA audit_db TO ${GRAFANA_DB_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA audit_db GRANT SELECT ON TABLES TO ${GRAFANA_DB_USER};
EOSQL
