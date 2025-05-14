#!/bin/sh
# entrypoint.sh

PERSISTENT_DB_PATH="$DATABASE_PATH"
INITIAL_DB_IN_IMAGE="/usr/src/app/database.sqlite" 

DB_DIR=$(dirname "$PERSISTENT_DB_PATH")
if [ ! -d "$DB_DIR" ]; then
  echo "Creating directory for database: $DB_DIR"
  mkdir -p "$DB_DIR"
fi

if [ ! -f "$PERSISTENT_DB_PATH" ] && [ -f "$INITIAL_DB_IN_IMAGE" ]; then
  echo "Database not found at $PERSISTENT_DB_PATH. Copying initial database from image..."
  cp "$INITIAL_DB_IN_IMAGE" "$PERSISTENT_DB_PATH"
elif [ ! -f "$PERSISTENT_DB_PATH" ] && [ ! -f "$INITIAL_DB_IN_IMAGE" ]; then
  echo "Warning: Database not found at $PERSISTENT_DB_PATH and no initial database in image."
else
  echo "Database found at $PERSISTENT_DB_PATH or no initial DB in image to copy."
fi

echo "Starting application... Will use database at $PERSISTENT_DB_PATH"
exec node dist/app.js