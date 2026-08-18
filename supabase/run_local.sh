#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Run ibuynaija migrations + seed against a local PostgreSQL instance.
# Usage: bash supabase/run_local.sh [--reset]
# --reset: drops and recreates the ibuynaija_dev database first.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PGBIN="/c/Program Files/PostgreSQL/17/bin"
PSQL="$PGBIN/psql.exe"
DB_NAME="ibuynaija_dev"
DB_USER="postgres"

MIGRATIONS_DIR="$(dirname "$0")/migrations"
SEED_DIR="$(dirname "$0")/seed"

# ─── Reset (optional) ────────────────────────────────────────────────────────
if [[ "${1:-}" == "--reset" ]]; then
  echo "→ Dropping database $DB_NAME..."
  "$PSQL" -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>&1
fi

# ─── Create DB if needed ─────────────────────────────────────────────────────
echo "→ Creating database $DB_NAME (if not exists)..."
"$PSQL" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>&1 || true

# ─── Run migrations in order ─────────────────────────────────────────────────
echo "→ Running migrations..."
for f in "$MIGRATIONS_DIR"/0*.sql; do
  echo "   ↳ $(basename "$f")"
  "$PSQL" -U "$DB_USER" -d "$DB_NAME" -f "$f" -v ON_ERROR_STOP=1 2>&1
done

# ─── Run seed ────────────────────────────────────────────────────────────────
echo "→ Running seed..."
for f in "$SEED_DIR"/0*.sql; do
  echo "   ↳ $(basename "$f")"
  "$PSQL" -U "$DB_USER" -d "$DB_NAME" -f "$f" -v ON_ERROR_STOP=1 2>&1
done

echo ""
echo "✓ Done. Database: $DB_NAME"
