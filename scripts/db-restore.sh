#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/crm-backend/.env"
BACKUP_DIR="$ROOT_DIR/backups"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | tail -n1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')"
if [[ -z "${DATABASE_URL}" ]]; then
  echo "DATABASE_URL not found in $ENV_FILE"
  exit 1
fi

if [[ $# -gt 0 ]]; then
  BACKUP_FILE="$1"
else
  BACKUP_FILE="$(ls -t "$BACKUP_DIR"/crm_db_*.sql 2>/dev/null | head -n 1 || true)"
fi

if [[ -z "${BACKUP_FILE}" || ! -f "${BACKUP_FILE}" ]]; then
  echo "Backup file not found. Pass a file path or create a backup first."
  exit 1
fi

echo "Restoring from $BACKUP_FILE"
psql "$DATABASE_URL" -f "$BACKUP_FILE"

echo "Restore completed."
