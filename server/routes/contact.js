import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireOwner } from '../middleware/auth.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required' });
    await pool.query(
      `INSERT INTO contact_messages (name, email, subject, message) VALUES ($1,$2,$3,$4)`,
      [name, email.toLowerCase(), subject||'', message]
    );
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/', verifyToken, requireOwner, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id/read', verifyToken, requireOwner, async (req, res) => {
  try {
    await pool.query('UPDATE contact_messages SET is_read = true WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
