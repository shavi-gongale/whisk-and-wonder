import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireOwner, optionalToken } from '../middleware/auth.js';

const router = Router();

async function resolveProductId(value) {
  const result = await pool.query(
    'SELECT id FROM products WHERE id::text = $1 OR source_id = $1',
    [String(value)],
  );
  return result.rows[0]?.id || null;
}

// GET /api/reviews?productId=
router.get('/', optionalToken, async (req, res) => {
  try {
    const { productId } = req.query;
    let query = `SELECT r.*, u.name as user_name, u.initials as user_initials
                 FROM reviews r LEFT JOIN users u ON r.user_id = u.id`;
    const params = [];
    const conditions = [];
    if (productId) {
      const numericProductId = await resolveProductId(productId);
      if (!numericProductId) return res.json([]);
      params.push(numericProductId);
      conditions.push(`r.product_id = $${params.length}`);
    }
    if (!req.user?.isOwner) conditions.push(`r.is_hidden = false`);
    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ` ORDER BY r.created_at DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows.map(mapReview));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/reviews
router.post('/', verifyToken, async (req, res) => {
  try {
    const { productId, rating, text, imgId } = req.body;
    if (!productId || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5 || typeof text !== 'string' || text.trim().length < 10 || text.length > 2000) {
      return res.status(400).json({ error: 'A product, rating from 1 to 5, and review text of 10-2000 characters are required' });
    }
    const numericProductId = await resolveProductId(productId);
    if (!numericProductId) return res.status(404).json({ error: 'Product not found' });
    const duplicate = await pool.query('SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2', [req.user.id, numericProductId]);
    if (duplicate.rows.length) return res.status(409).json({ error: 'You have already reviewed this product' });
    const purchase = await pool.query(
      `SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status NOT IN ('Cancelled','Refunded') LIMIT 1`,
      [req.user.id, numericProductId],
    );
    const result = await pool.query(
      `INSERT INTO reviews (user_id, product_id, rating, text, img_id, is_verified, likes)
       VALUES ($1,$2,$3,$4,$5,$6,0) RETURNING *, $7::text as user_name, $8::text as user_initials`,
      [req.user.id, numericProductId, Number(rating), text.trim(), imgId||null, purchase.rows.length > 0,
       (await pool.query('SELECT name FROM users WHERE id=$1',[req.user.id])).rows[0]?.name || 'Customer',
       (await pool.query('SELECT initials FROM users WHERE id=$1',[req.user.id])).rows[0]?.initials || 'CU']
    );
    // Update product rating
    await pool.query(`
      UPDATE products SET
        rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE product_id = $1 AND is_hidden = false),
        review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1 AND is_hidden = false)
      WHERE id = $1`, [numericProductId]);
    // Re-fetch with user info
    const full = await pool.query(
      `SELECT r.*, u.name as user_name, u.initials as user_initials FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.id = $1`,
      [result.rows[0].id]
    );
    res.status(201).json(mapReview(full.rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/reviews/:id/helpful
router.post('/:id/helpful', async (req, res) => {
  try {
    const result = await pool.query('UPDATE reviews SET likes = likes + 1 WHERE id = $1 RETURNING likes', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Review not found' });
    res.json({ likes: result.rows[0].likes });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/reviews/:id — owner can add reply or hide
router.patch('/:id', verifyToken, requireOwner, async (req, res) => {
  try {
    const { ownerReply, isHidden } = req.body;
    const fields = []; const values = [];
    if (ownerReply !== undefined) { values.push(ownerReply); fields.push(`owner_reply = $${values.length}`); }
    if (isHidden !== undefined) { values.push(isHidden); fields.push(`is_hidden = $${values.length}`); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    values.push(req.params.id);
    const result = await pool.query(`UPDATE reviews SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    if (!result.rows.length) return res.status(404).json({ error: 'Review not found' });
    if (ownerReply !== undefined) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         SELECT user_id, 'review', 'Your review received a reply', $1, jsonb_build_object('reviewId', id)
         FROM reviews WHERE id = $2 AND user_id IS NOT NULL`,
        ['The bakery replied to your review.', req.params.id],
      );
    }
    res.json(mapReview(result.rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', verifyToken, requireOwner, async (req, res) => {
  const result = await pool.query('DELETE FROM reviews WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Review not found' });
  res.json({ success: true });
});

function mapReview(row) {
  return {
    id: String(row.id), userId: String(row.user_id),
    userName: row.user_name || 'Anonymous', userInitials: row.user_initials || 'AN',
    rating: Number(row.rating), text: row.text,
    date: row.created_at, likes: row.likes || 0,
    isVerified: row.is_verified, imgId: row.img_id||undefined,
    ownerReply: row.owner_reply||undefined, isHidden: row.is_hidden,
    productId: row.product_id,
  };
}

export default router;
