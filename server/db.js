import pg from 'pg';
const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
let isLocalDatabase = false;
try {
  const hostname = new URL(databaseUrl).hostname;
  isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(hostname);
} catch {
  isLocalDatabase = false;
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
});

export default pool;
