#!/bin/sh
# entrypoint.sh

# Use Render's environment variable, with fallback for local development
PERSISTENT_DB_PATH="${DATABASE_PATH:-/usr/src/app/data/database.sqlite}"

echo "[ENTRYPOINT] Using database path: $PERSISTENT_DB_PATH"

DB_DIR=$(dirname "$PERSISTENT_DB_PATH")
if [ ! -d "$DB_DIR" ]; then
  echo "[ENTRYPOINT] Creating directory for database: $DB_DIR"
  mkdir -p "$DB_DIR"
fi

# Check if we can write to the database directory
if [ ! -w "$DB_DIR" ]; then
  echo "[ENTRYPOINT] WARNING: Cannot write to database directory: $DB_DIR"
  ls -la "$DB_DIR"
fi

echo "[ENTRYPOINT] Starting application... Node app will ensure database is setup at $PERSISTENT_DB_PATH"
exec node dist/app.js