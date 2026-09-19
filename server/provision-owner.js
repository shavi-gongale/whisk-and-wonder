import bcrypt from 'bcryptjs';
import pool from './db.js';
import { initDb } from './init-db.js';

const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
const password = process.env.OWNER_PASSWORD;
const name = process.env.OWNER_NAME?.trim() || 'Whisk & Wonder Owner';

if (!email || !password || password.length < 12) {
  throw new Error('Set OWNER_EMAIL and OWNER_PASSWORD (minimum 12 characters) to provision an owner');
}

await initDb();
const hash = await bcrypt.hash(password, 12);
await pool.query(
  `INSERT INTO users (name, email, password_hash, initials, member_since, is_owner)
   VALUES ($1,$2,$3,$4,$5,true)
   ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, is_owner = true`,
  [name, email, hash, name.split(/\s+/).map(part => part[0]).join('').toUpperCase().slice(0, 2), new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })],
);
console.log(`Owner provisioned for ${email}`);
await pool.end();