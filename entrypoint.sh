#!/bin/sh
# entrypoint.sh

PERSISTENT_DB_PATH="${DATABASE_PATH:-/usr/src/app/database.sqlite}" # Default if DATABASE_PATH is not set

DB_DIR=$(dirname "$PERSISTENT_DB_PATH")
if [ ! -d "$DB_DIR" ]; then
  echo "Creating directory for database: $DB_DIR"
  mkdir -p "$DB_DIR"
fi

# The Node.js application (src/db/connection.ts and src/db/setup.ts)
# is responsible for creating the database file if it doesn't exist
# and setting up the schema. No need to copy from image.

echo "Starting application... Node app will ensure database is setup at $PERSISTENT_DB_PATH"
exec node dist/app.js