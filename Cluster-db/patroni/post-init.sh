#!/bin/bash
set -euo pipefail

CONNECTION_URL="${1:?Patroni connection URL is required}"

CREDENTIALS_FILE="/tmp/patroni-credentials"

if [[ ! -r "$CREDENTIALS_FILE" ]]; then
    echo "ERROR: Credentials file not found or unreadable."
    exit 1
fi

{
    IFS= read -r REPLICATION_PASSWORD
    IFS= read -r MONITOR_PASSWORD
    IFS= read -r DATABASE_NAME
} < "$CREDENTIALS_FILE"

: "${REPLICATION_PASSWORD:?Replication password is required}"
: "${MONITOR_PASSWORD:?Monitor password is required}"
: "${DATABASE_NAME:?Database name is required}"

echo "Creating replication and monitoring roles..."

psql "$CONNECTION_URL" \
    -v ON_ERROR_STOP=1 \
    -v rep_pass="$REPLICATION_PASSWORD" \
    -v mon_pass="$MONITOR_PASSWORD" \
    -v db_name="$DATABASE_NAME" <<'SQL'

SELECT format(
    'CREATE ROLE replicator WITH LOGIN REPLICATION PASSWORD %L',
    :'rep_pass'
)
WHERE NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'replicator'
)
\gexec

SELECT format(
    'CREATE ROLE monitor WITH LOGIN PASSWORD %L',
    :'mon_pass'
)
WHERE NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'monitor'
)
\gexec

GRANT pg_monitor TO monitor;

SELECT format('CREATE DATABASE %I', :'db_name')
WHERE NOT EXISTS (
    SELECT 1 FROM pg_database WHERE datname = :'db_name'
)
\gexec

SQL

echo "Roles, database and monitoring permissions configured successfully."