import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import pool from '../db.js';
import { signToken, verifyToken } from '../middleware/auth.js';

const router = Router();
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function tokenHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function issueOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (name.trim().length < 2 || name.trim().length > 100) return res.status(400).json({ error: 'Name must be 2-100 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ error: 'Valid email required' });
    if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 10 characters with upper, lower, and numeric characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const initials = name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const memberSince = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    const verificationToken = issueOpaqueToken();
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, initials, member_since, points, orders_count, is_owner,
        email_verification_token_hash, email_verification_expires_at)
       VALUES ($1, $2, $3, $4, $5, 50, 0, false, $6, NOW() + INTERVAL '24 hours')
       RETURNING id, name, email, initials, member_since, points, orders_count, is_owner, phone, avatar, email_verified`,
      [name.trim(), normalizedEmail, hash, initials, memberSince, tokenHash(verificationToken)]
    );
    const user = mapUser(result.rows[0]);
    const token = signToken({ id: user.id, email: user.email, isOwner: user.isOwner });
    res.json({ user, token });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const normalizedEmail = email.trim().toLowerCase();
    const attempt = loginAttempts.get(normalizedEmail) || { count: 0, lockedUntil: 0 };
    if (attempt.lockedUntil > Date.now()) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
    }

    const result = await pool.query(
      `SELECT id, name, email, password_hash, initials, member_since, points, orders_count, is_owner, phone, avatar,
        email_verified, locked_until, failed_login_attempts
       FROM users WHERE email = $1`,
      [normalizedEmail]
    );
    if (!result.rows.length) {
      loginAttempts.set(normalizedEmail, { count: attempt.count + 1, lockedUntil: attempt.count + 1 >= MAX_ATTEMPTS ? Date.now() + LOCK_MINUTES * 60_000 : 0 });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const row = result.rows[0];
    if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
      return res.status(429).json({ error: 'Account temporarily locked. Try again later.' });
    }
    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      const nextCount = Number(row.failed_login_attempts || 0) + 1;
      await pool.query(
        `UPDATE users SET failed_login_attempts = $1, locked_until = CASE WHEN $1 >= $2 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END WHERE id = $3`,
        [nextCount, MAX_ATTEMPTS, row.id],
      );
      return res.status(nextCount >= MAX_ATTEMPTS ? 429 : 401).json({ error: nextCount >= MAX_ATTEMPTS ? 'Too many failed attempts. Try again later.' : 'Invalid email or password' });
    }

    await pool.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [row.id]);
    loginAttempts.delete(normalizedEmail);
    const user = mapUser(row);
    const token = signToken({ id: user.id, email: user.email, isOwner: user.isOwner });
    res.json({ user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const normalizedEmail = email.trim().toLowerCase();
    const user = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (user.rows[0]) {
      const resetToken = issueOpaqueToken();
      await pool.query(
        `UPDATE users SET reset_token_hash = $1, reset_token_expires_at = NOW() + INTERVAL '30 minutes' WHERE id = $2`,
        [tokenHash(resetToken), user.rows[0].id],
      );
      // A configured email adapter can consume this URL without changing the auth contract.
      if (process.env.PASSWORD_RESET_URL && process.env.EMAIL_PROVIDER) {
        console.info(`Password reset delivery requested for ${normalizedEmail}`);
      }
    }
    res.json({ message: 'If an account exists for that email, reset instructions have been requested.' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Reset token is required' });
    if (typeof password !== 'string' || password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 10 characters with upper, lower, and numeric characters' });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires_at = NULL,
        failed_login_attempts = 0, locked_until = NULL
       WHERE reset_token_hash = $2 AND reset_token_expires_at > NOW()
       RETURNING id`,
      [hash, tokenHash(token)],
    );
    if (!result.rows.length) return res.status(400).json({ error: 'Reset link is invalid or expired' });
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Verification token is required' });
    const result = await pool.query(
      `UPDATE users SET email_verified = true, email_verification_token_hash = NULL, email_verification_expires_at = NULL
       WHERE email_verification_token_hash = $1 AND email_verification_expires_at > NOW()
       RETURNING id`,
      [tokenHash(token)],
    );
    if (!result.rows.length) return res.status(400).json({ error: 'Verification link is invalid or expired' });
    res.json({ message: 'Email verified successfully.' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', verifyToken, (_req, res) => res.json({ success: true }));

// GET /api/auth/me — returns current user from token
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, initials, member_since, points, orders_count, is_owner, phone, avatar, email_verified
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: mapUser(result.rows[0]) });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

function mapUser(row) {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    initials: row.initials,
    memberSince: row.member_since,
    points: row.points,
    orders: row.orders_count,
    isOwner: row.is_owner,
    emailVerified: Boolean(row.email_verified),
    phone: row.phone || undefined,
    avatar: row.avatar || undefined,
  };
}

export default router;
