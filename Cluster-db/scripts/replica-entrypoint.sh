#!/bin/bash
set -e

PGDATA="${PGDATA:-/var/lib/postgresql/data}"
PGPASSFILE="/var/lib/postgresql/.pgpass"
mkdir -p "$PGDATA"
chown postgres:postgres "$PGDATA"

echo "Configurando credenciales de replicacion..."

printf 'postgres:5432:replication:%s:%s\n' \
    "$REPLICATION_USER" "$REPLICATION_PASSWORD" > "$PGPASSFILE"

chmod 600 "$PGPASSFILE"
chown postgres:postgres "$PGPASSFILE"

export PGPASSFILE

if [ ! -s "$PGDATA/PG_VERSION" ]; then
    echo "Esperando al nodo principal..."

    until pg_isready -h postgres -p 5432 -U "$REPLICATION_USER"; do
        sleep 3
    done

    echo "Ejecutando copia inicial..."

    gosu postgres pg_basebackup \
        -h postgres \
        -p 5432 \
        -U "$REPLICATION_USER" \
        -D "$PGDATA" \
        -Fp \
        -Xs \
        -P \
        -R

    echo "Replica inicializada correctamente."
fi

exec docker-entrypoint.sh postgres \
    -c hot_standby=on
