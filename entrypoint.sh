#!/bin/sh
# entrypoint.sh

echo "[ENTRYPOINT] Running PostgreSQL setup script..."
npm run db:setup:pg

echo "[ENTRYPOINT] Starting application..."
exec node dist/app.js