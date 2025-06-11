#!/bin/sh
# entrypoint.sh

PERSISTENT_DB_PATH="${DATABASE_PATH:-/var/data/database.sqlite}"

echo "[ENTRYPOINT] Using database path: $PERSISTENT_DB_PATH"
echo "[ENTRYPOINT] Checking database status..."

# Debug information
ls -la /var/data/ 2>/dev/null || echo "[ENTRYPOINT] /var/data/ does not exist"
ls -la /usr/src/app/data/ 2>/dev/null || echo "[ENTRYPOINT] /usr/src/app/data/ does not exist"

if [ -f "$PERSISTENT_DB_PATH" ]; then
    echo "[ENTRYPOINT] Database file exists: $PERSISTENT_DB_PATH"
    echo "[ENTRYPOINT] Database file size: $(stat -c%s "$PERSISTENT_DB_PATH" 2>/dev/null || echo "unknown")"
    
    # Check if database has tables
    if command -v sqlite3 >/dev/null 2>&1; then
        echo "[ENTRYPOINT] Checking tables in database..."
        sqlite3 "$PERSISTENT_DB_PATH" ".tables" 2>/dev/null || echo "[ENTRYPOINT] Could not read database tables"
    fi
else
    echo "[ENTRYPOINT] Database file does not exist: $PERSISTENT_DB_PATH"
fi

DB_DIR=$(dirname "$PERSISTENT_DB_PATH")
if [ ! -d "$DB_DIR" ]; then
  echo "[ENTRYPOINT] Creating directory for database: $DB_DIR"
  mkdir -p "$DB_DIR"
fi

echo "[ENTRYPOINT] Starting application..."

# --- TEMPORARY FIX TO RECREATE DB ---
if [ -f "$PERSISTENT_DB_PATH" ]; then
    echo "[ENTRYPOINT] Deleting existing database file at $PERSISTENT_DB_PATH to force re-creation."
    rm "$PERSISTENT_DB_PATH"
fi
# --- END TEMPORARY FIX ---

exec node dist/app.js