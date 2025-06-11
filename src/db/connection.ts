import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Determine project root dynamically, works in both src and dist
const projectRoot = path.resolve(__dirname, '../../');

const defaultDbPath = path.join(projectRoot, 'database.sqlite');
const dbPathFromEnv = process.env.DATABASE_PATH;

let dbPathToUse = dbPathFromEnv || defaultDbPath;

export function getDbPath(): string {
  return dbPathToUse;
}

// If DATABASE_PATH is set (e.g., for Render persistent disk), ensure its directory exists
if (dbPathFromEnv) {
    const dbDir = path.dirname(dbPathFromEnv);
    if (!fs.existsSync(dbDir)) {
        console.log(`[DB] Creating directory for database: ${dbDir}`);
        fs.mkdirSync(dbDir, { recursive: true });
    }
}

console.log(`[DB] Using database at: ${dbPathToUse}`);
// The { fileMustExist: true } option can be added if the initial DB seeding is handled robustly by the entrypoint.
// For now, allow it to create if not exists, setupDatabase will initialize tables.
const db = new Database(dbPathToUse, { verbose: console.log /*, fileMustExist: false */ });

export default db;