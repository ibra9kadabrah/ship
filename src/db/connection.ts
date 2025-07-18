import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: `-c search_path=mrv_app`
});

pool.on('connect', (client) => {
  client.query('SET search_path TO mrv_app');
  console.log('[DB] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DB] Error with PostgreSQL pool', err);
  process.exit(-1);
});

export default pool;