import { Pool } from 'pg';

const globalForPg = globalThis as unknown as { pgPool: Pool };

const dbUrl = process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/ibuynaija_dev';

// Enable SSL for remote (non-localhost) databases (required by Supabase)
const isRemote = !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');

export const pool = globalForPg.pgPool ?? new Pool({
  connectionString: dbUrl,
  max: 10,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

export default pool;
