import { Router } from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(p.source_id, p.id::text) AS product_id
       FROM wishlist w JOIN products p ON p.id = w.product_id
       WHERE w.user_id = $1`,
      [req.user.id],
    );
    res.json(result.rows.map(r => r.product_id));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Bulk sync must be declared before the dynamic product-id route.
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length > 500) {
      return res.status(400).json({ error: 'productIds must be an array with at most 500 items' });
    }
    const ids = [...new Set(productIds.map(String).filter(Boolean))];
    for (const sourceId of ids) {
      const product = await pool.query(
        'SELECT id FROM products WHERE source_id = $1 OR id::text = $1',
        [sourceId],
      );
      if (product.rows[0]) {
        await pool.query(
          'INSERT INTO wishlist (user_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [req.user.id, product.rows[0].id],
        );
      }
    }
    const result = await pool.query(
      `SELECT COALESCE(p.source_id, p.id::text) AS product_id
       FROM wishlist w JOIN products p ON p.id = w.product_id
       WHERE w.user_id = $1`,
      [req.user.id],
    );
    res.json(result.rows.map(r => r.product_id));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/:productId', verifyToken, async (req, res) => {
  try {
    const product = await pool.query(
      'SELECT id FROM products WHERE source_id = $1 OR id::text = $1',
      [req.params.productId],
    );
    if (!product.rows[0]) return res.status(404).json({ error: 'Product not found' });
    await pool.query(
      'INSERT INTO wishlist (user_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.user.id, product.rows[0].id],
    );
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:productId', verifyToken, async (req, res) => {
  try {
    const product = await pool.query(
      'SELECT id FROM products WHERE source_id = $1 OR id::text = $1',
      [req.params.productId],
    );
    if (!product.rows[0]) return res.status(404).json({ error: 'Product not found' });
    await pool.query('DELETE FROM wishlist WHERE user_id=$1 AND product_id=$2', [req.user.id, product.rows[0].id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
