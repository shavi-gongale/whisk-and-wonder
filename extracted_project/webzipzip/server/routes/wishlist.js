import { Router } from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT product_id FROM wishlist WHERE user_id = $1', [req.user.id]);
    res.json(result.rows.map(r => r.product_id));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/:productId', verifyToken, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO wishlist (user_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.productId]
    );
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:productId', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM wishlist WHERE user_id=$1 AND product_id=$2', [req.user.id, req.params.productId]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Bulk sync from localStorage when user logs in
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) return res.status(400).json({ error: 'productIds array required' });
    for (const pid of productIds) {
      await pool.query(
        'INSERT INTO wishlist (user_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [req.user.id, pid]
      );
    }
    const result = await pool.query('SELECT product_id FROM wishlist WHERE user_id = $1', [req.user.id]);
    res.json(result.rows.map(r => r.product_id));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
