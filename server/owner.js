import bcrypt from 'bcryptjs';
import pool from './db.js';

const MIN_OWNER_PASSWORD_LENGTH = 12;

function configuredOwner() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  const name = process.env.OWNER_NAME?.trim() || 'Whisk & Wonder Owner';
  if (!email && !password) return null;
  if (!email || !password) {
    throw new Error('OWNER_EMAIL and OWNER_PASSWORD must be configured together');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('OWNER_EMAIL must be a valid email address');
  }
  if (
    password.length < MIN_OWNER_PASSWORD_LENGTH ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    throw new Error('OWNER_PASSWORD must be at least 12 characters with upper, lower, and numeric characters');
  }
  return { email, password, name };
}

export async function provisionConfiguredOwner({ updateExisting = false } = {}) {
  const config = configuredOwner();
  if (!config) return { configured: false, created: false, updated: false };

  const existing = await pool.query(
    'SELECT id, name, password_hash, is_owner FROM users WHERE email = $1',
    [config.email],
  );

  if (existing.rows.length) {
    if (updateExisting) {
      const passwordHash = await bcrypt.hash(config.password, 12);
      await pool.query(
        'UPDATE users SET name = $1, password_hash = $2, is_owner = true, email_verified = true WHERE id = $3',
        [config.name, passwordHash, existing.rows[0].id],
      );
      return { configured: true, created: false, updated: true };
    }
    await pool.query(
      'UPDATE users SET is_owner = true, email_verified = true WHERE id = $1',
      [existing.rows[0].id],
    );
    return { configured: true, created: false, updated: false };
  }

  const passwordHash = await bcrypt.hash(config.password, 12);
  const initials = config.name.split(/\s+/).map(part => part[0]).join('').toUpperCase().slice(0, 2);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, initials, member_since, is_owner, email_verified)
     VALUES ($1, $2, $3, $4, TO_CHAR(CURRENT_DATE, 'FMMonth YYYY'), true, true)`,
    [config.name, config.email, passwordHash, initials],
  );
  return { configured: true, created: true, updated: false };
}