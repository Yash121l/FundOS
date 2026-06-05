#!/bin/sh
set -e

echo "[entrypoint] Waiting for Postgres to be ready..."
until pg_isready -h "${PGHOST:-db}" -U "${PGUSER:-signalos}" 2>/dev/null; do
  sleep 1
done
echo "[entrypoint] Postgres is ready."

echo "[entrypoint] Running database migrations..."
pnpm db:migrate

echo "[entrypoint] Seeding database..."
pnpm db:seed

echo "[entrypoint] Done. Starting app..."
exec "$@"
