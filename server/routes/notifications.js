import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireOwner } from '../middleware/auth.js';

const router = Router();

function mapNotification(row) {
  return {
    id: String(row.id),
    type: row.type,
    title: row.title,
    message: row.message,
    data: row.data || {},
    date: row.created_at,
    isRead: Boolean(row.is_read),
  };
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const owner = await pool.query('SELECT is_owner FROM users WHERE id = $1', [req.user.id]);
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1 OR ($2 = true AND user_id IS NULL)
       ORDER BY created_at DESC LIMIT 100`,
      [req.user.id, Boolean(owner.rows[0]?.is_owner)],
    );
    res.json(result.rows.map(mapNotification));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to load notifications' });
  }
});

router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const owner = await pool.query('SELECT is_owner FROM users WHERE id = $1', [req.user.id]);
    const result = await pool.query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1 AND (user_id = $2 OR ($3 = true AND user_id IS NULL))
       RETURNING *`,
      [req.params.id, req.user.id, Boolean(owner.rows[0]?.is_owner)],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Notification not found' });
    res.json(mapNotification(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to update notification' });
  }
});

router.post('/read-all', verifyToken, async (req, res) => {
  try {
    const owner = await pool.query('SELECT is_owner FROM users WHERE id = $1', [req.user.id]);
    await pool.query(
      `UPDATE notifications SET is_read = true
       WHERE user_id = $1 OR ($2 = true AND user_id IS NULL)`,
      [req.user.id, Boolean(owner.rows[0]?.is_owner)],
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to update notifications' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const owner = await pool.query('SELECT is_owner FROM users WHERE id = $1', [req.user.id]);
    await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND (user_id = $2 OR ($3 = true AND user_id IS NULL))`,
      [req.params.id, req.user.id, Boolean(owner.rows[0]?.is_owner)],
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to clear notification' });
  }
});

router.get('/owner/unread-count', verifyToken, requireOwner, async (_req, res) => {
  const result = await pool.query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id IS NULL AND is_read = false');
  res.json({ count: result.rows[0].count });
});

export default router;