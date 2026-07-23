import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireOwner, optionalToken } from '../middleware/auth.js';

const router = Router();

// GET /api/reviews?productId=
router.get('/', optionalToken, async (req, res) => {
  try {
    const { productId } = req.query;
    let query = `SELECT r.*, u.name as user_name, u.initials as user_initials
                 FROM reviews r LEFT JOIN users u ON r.user_id = u.id`;
    const params = [];
    if (productId) { params.push(productId); query += ` WHERE r.product_id = $1`; }
    query += ` ORDER BY r.created_at DESC`;
    if (!req.user?.isOwner) query += ` AND r.is_hidden = false`;
    const result = await pool.query(query, params);
    res.json(result.rows.map(mapReview));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/reviews
router.post('/', verifyToken, async (req, res) => {
  try {
    const { productId, rating, text, imgId } = req.body;
    if (!productId || !rating || !text) return res.status(400).json({ error: 'productId, rating, text required' });
    const result = await pool.query(
      `INSERT INTO reviews (user_id, product_id, rating, text, img_id, is_verified, likes)
       VALUES ($1,$2,$3,$4,$5,true,0) RETURNING *, $6::text as user_name, $7::text as user_initials`,
      [req.user.id, productId, rating, text, imgId||null,
       (await pool.query('SELECT name FROM users WHERE id=$1',[req.user.id])).rows[0]?.name || 'Customer',
       (await pool.query('SELECT initials FROM users WHERE id=$1',[req.user.id])).rows[0]?.initials || 'CU']
    );
    // Update product rating
    await pool.query(`
      UPDATE products SET
        rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE product_id = $1 AND is_hidden = false),
        review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1 AND is_hidden = false)
      WHERE id = $1`, [productId]);
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
    res.json({ likes: result.rows[0]?.likes || 0 });
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
    await pool.query(`UPDATE reviews SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
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
