import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireOwner } from '../middleware/auth.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
    await pool.query(
      `INSERT INTO newsletter (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
      [email.toLowerCase()]
    );
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/', verifyToken, requireOwner, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM newsletter ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
