#!/bin/bash
set -e

# Initialize isolated databases and user roles for RecipeHub microservices
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- 1. Identity Service
    CREATE USER ${IDENTITY_DB_USER:-identity_user} WITH ENCRYPTED PASSWORD '${IDENTITY_DB_PASSWORD:-identity_pw}';
    CREATE DATABASE ${IDENTITY_DB_NAME:-recipehub_identity} OWNER ${IDENTITY_DB_USER:-identity_user};
    GRANT ALL PRIVILEGES ON DATABASE ${IDENTITY_DB_NAME:-recipehub_identity} TO ${IDENTITY_DB_USER:-identity_user};

    -- 2. Recipe Service
    CREATE USER ${RECIPE_DB_USER:-recipe_user} WITH ENCRYPTED PASSWORD '${RECIPE_DB_PASSWORD:-recipe_pw}';
    CREATE DATABASE ${RECIPE_DB_NAME:-recipehub_recipe} OWNER ${RECIPE_DB_USER:-recipe_user};
    GRANT ALL PRIVILEGES ON DATABASE ${RECIPE_DB_NAME:-recipehub_recipe} TO ${RECIPE_DB_USER:-recipe_user};

    -- 3. Content Service
    CREATE USER ${CONTENT_DB_USER:-content_user} WITH ENCRYPTED PASSWORD '${CONTENT_DB_PASSWORD:-content_pw}';
    CREATE DATABASE ${CONTENT_DB_NAME:-recipehub_content} OWNER ${CONTENT_DB_USER:-content_user};
    GRANT ALL PRIVILEGES ON DATABASE ${CONTENT_DB_NAME:-recipehub_content} TO ${CONTENT_DB_USER:-content_user};

    -- 4. Audit Service
    CREATE USER ${AUDIT_DB_USER:-audit_user} WITH ENCRYPTED PASSWORD '${AUDIT_DB_PASSWORD:-audit_pw}';
    CREATE DATABASE ${AUDIT_DB_NAME:-recipehub_audit} OWNER ${AUDIT_DB_USER:-audit_user};
    GRANT ALL PRIVILEGES ON DATABASE ${AUDIT_DB_NAME:-recipehub_audit} TO ${AUDIT_DB_USER:-audit_user};
EOSQL
