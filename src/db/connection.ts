import Database from 'better-sqlite3';
import path from 'path';

// Ensure the database directory exists
const dbDir = path.join(__dirname, '../../');
const dbPath = path.join(dbDir, 'database.sqlite');

// Create the database connection
const db = new Database(dbPath, { verbose: console.log });

export default db;