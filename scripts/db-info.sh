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

echo "DATABASE_URL: $DATABASE_URL"
psql "$DATABASE_URL" -c "select count(*) as users from users;" >/dev/null 2>&1 || {
  echo "Unable to query database."
  exit 1
}

psql "$DATABASE_URL" -c "select count(*) as users from users;"
psql "$DATABASE_URL" -c "select count(*) as companies from companies;"
psql "$DATABASE_URL" -c "select count(*) as contacts from contacts;"
psql "$DATABASE_URL" -c "select count(*) as deals from deals;"
