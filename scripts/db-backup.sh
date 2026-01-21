#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/crm-backend/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | tail -n1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')"
if [[ -z "${DATABASE_URL}" ]]; then
  echo "DATABASE_URL not found in $ENV_FILE"
  exit 1
fi

BACKUP_DIR="$ROOT_DIR/backups"
mkdir -p "$BACKUP_DIR"

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/crm_db_${TS}.sql"

pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

echo "Backup written to $BACKUP_FILE"
