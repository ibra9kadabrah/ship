"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Determine project root dynamically, works in both src and dist
const projectRoot = path_1.default.resolve(__dirname, '../../');
const defaultDbPath = path_1.default.join(projectRoot, 'database.sqlite');
const dbPathFromEnv = process.env.DATABASE_PATH;
let dbPathToUse = dbPathFromEnv || defaultDbPath;
// If DATABASE_PATH is set (e.g., for Render persistent disk), ensure its directory exists
if (dbPathFromEnv) {
    const dbDir = path_1.default.dirname(dbPathFromEnv);
    if (!fs_1.default.existsSync(dbDir)) {
        console.log(`[DB] Creating directory for database: ${dbDir}`);
        fs_1.default.mkdirSync(dbDir, { recursive: true });
    }
}
console.log(`[DB] Using database at: ${dbPathToUse}`);
// The { fileMustExist: true } option can be added if the initial DB seeding is handled robustly by the entrypoint.
// For now, allow it to create if not exists, setupDatabase will initialize tables.
const db = new better_sqlite3_1.default(dbPathToUse, { verbose: console.log /*, fileMustExist: false */ });
exports.default = db;
