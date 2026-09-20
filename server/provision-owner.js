import pool from './db.js';
import { initDb } from './init-db.js';
import { provisionConfiguredOwner } from './owner.js';

await initDb();
const result = await provisionConfiguredOwner({ updateExisting: true });
console.log(result.created ? 'Owner account created.' : 'Owner account provisioned.');
await pool.end();