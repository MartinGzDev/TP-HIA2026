#!/bin/bash
set -euo pipefail

: "${PATRONI_NAME:?PATRONI_NAME is required}"
: "${PATRONI_RESTAPI_CONNECT_ADDRESS:?REST API address is required}"
: "${PATRONI_POSTGRESQL_CONNECT_ADDRESS:?PostgreSQL address is required}"
: "${PATRONI_SUPERUSER_PASSWORD:?Superuser password is required}"
: "${PATRONI_REPLICATION_PASSWORD:?Replication password is required}"
: "${PATRONI_MONITOR_PASSWORD:?Monitor password is required}"
: "${PATRONI_DB_NAME:?Database name is required}"

# Ensure PostgreSQL data directory has secure permissions
DATA_DIR="${PGDATA:-/var/lib/postgresql/data}"
chmod 700 "$DATA_DIR"

CONFIG_FILE="/tmp/patroni.yml"
CREDENTIALS_FILE="/tmp/patroni-credentials"

echo "Starting Patroni node: ${PATRONI_NAME}"

# Guardar credenciales para el hook post_init
printf '%s\n%s\n%s\n' \
    "$PATRONI_REPLICATION_PASSWORD" \
    "$PATRONI_MONITOR_PASSWORD" \
    "$PATRONI_DB_NAME" \
    > "$CREDENTIALS_FILE"

chmod 600 "$CREDENTIALS_FILE"

# Generar configuración de Patroni
envsubst '${PATRONI_NAME} ${PATRONI_RESTAPI_CONNECT_ADDRESS} ${PATRONI_POSTGRESQL_CONNECT_ADDRESS} ${PATRONI_SUPERUSER_PASSWORD} ${PATRONI_REPLICATION_PASSWORD} ${PATRONI_MONITOR_PASSWORD}' \
    < /etc/patroni/patroni.yml.template \
    > "$CONFIG_FILE"

chmod 600 "$CONFIG_FILE"

exec patroni "$CONFIG_FILE"
