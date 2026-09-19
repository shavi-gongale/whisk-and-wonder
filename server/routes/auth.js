import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { signToken, verifyToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (name.trim().length < 2 || name.trim().length > 100) return res.status(400).json({ error: 'Name must be 2-100 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ error: 'Valid email required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const initials = name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const memberSince = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, initials, member_since, points, orders_count, is_owner)
       VALUES ($1, $2, $3, $4, $5, 50, 0, false) RETURNING id, name, email, initials, member_since, points, orders_count, is_owner, phone, avatar`,
      [name.trim(), normalizedEmail, hash, initials, memberSince]
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

    const result = await pool.query(
      `SELECT id, name, email, password_hash, initials, member_since, points, orders_count, is_owner, phone, avatar
       FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid email or password' });

    const row = result.rows[0];
    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

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
    if (!process.env.PASSWORD_RESET_URL || !process.env.EMAIL_PROVIDER) {
      return res.status(503).json({ error: 'Password reset delivery is not configured yet' });
    }
    res.status(501).json({ error: 'Password reset delivery adapter is not implemented' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me — returns current user from token
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, initials, member_since, points, orders_count, is_owner, phone, avatar
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
    phone: row.phone || undefined,
    avatar: row.avatar || undefined,
  };
}

export default router;
