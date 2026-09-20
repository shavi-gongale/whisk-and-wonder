import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireOwner } from '../middleware/auth.js';

const router = Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const [balance, history] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(points), 0)::int AS points FROM loyalty_transactions WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT id, points, type, description, order_id, created_at FROM loyalty_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [req.user.id]),
    ]);
    res.json({ points: balance.rows[0].points, transactions: history.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to load loyalty history' });
  }
});

router.post('/redeem', verifyToken, async (req, res) => {
  const points = Number(req.body.points);
  if (!Number.isInteger(points) || points < 100 || points % 100 !== 0) {
    return res.status(400).json({ error: 'Points must be redeemed in multiples of 100' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'SELECT COALESCE(SUM(points), 0)::int AS points FROM loyalty_transactions WHERE user_id = $1 FOR UPDATE',
      [req.user.id],
    );
    if (result.rows[0].points < points) throw Object.assign(new Error('Insufficient loyalty points'), { status: 409 });
    await client.query(
      `INSERT INTO loyalty_transactions (user_id, points, type, description)
       VALUES ($1, $2, 'redeemed', $3)`,
      [req.user.id, -points, `Redeemed ${points} Dessert Points for a store reward`],
    );
    await client.query('COMMIT');
    res.json({ points: result.rows[0].points - points });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Unable to redeem points' });
  } finally {
    client.release();
  }
});

router.post('/adjust/:userId', verifyToken, requireOwner, async (req, res) => {
  const points = Number(req.body.points);
  if (!Number.isInteger(points) || points === 0 || Math.abs(points) > 100000) {
    return res.status(400).json({ error: 'Points adjustment is invalid' });
  }
  await pool.query(
    `INSERT INTO loyalty_transactions (user_id, points, type, description)
     VALUES ($1,$2,'owner_adjustment',$3)`,
    [req.params.userId, points, req.body.description || 'Owner loyalty adjustment'],
  );
  res.json({ success: true });
});

export default router;