import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireOwner } from '../middleware/auth.js';

const router = Router();

// POST /api/coupons/validate — validate a coupon code
router.post('/validate', async (req, res) => {
  try {
    const { code, total } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });
    const result = await pool.query(
      `SELECT * FROM coupons WHERE code = $1 AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses IS NULL OR uses_count < max_uses)`,
      [code.toUpperCase()]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Invalid or expired coupon' });
    const coupon = result.rows[0];
    if (coupon.min_order && total < coupon.min_order) {
      return res.status(400).json({ error: `Minimum order of ₹${coupon.min_order} required` });
    }
    const discount = coupon.type === 'percent'
      ? Math.round(total * coupon.value / 100)
      : Math.min(coupon.value, total);
    res.json({ valid: true, discount, code: coupon.code, description: coupon.description });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/coupons/use — increment uses when order placed
router.post('/use', async (req, res) => {
  try {
    const { code } = req.body;
    await pool.query('UPDATE coupons SET uses_count = uses_count + 1 WHERE code = $1', [code.toUpperCase()]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Owner CRUD
router.get('/', verifyToken, requireOwner, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', verifyToken, requireOwner, async (req, res) => {
  try {
    const { code, type, value, description, minOrder, maxUses, expiresAt } = req.body;
    const result = await pool.query(
      `INSERT INTO coupons (code, type, value, description, min_order, max_uses, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [code.toUpperCase(), type, value, description||'', minOrder||null, maxUses||null, expiresAt||null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id', verifyToken, requireOwner, async (req, res) => {
  try {
    const { isActive } = req.body;
    await pool.query('UPDATE coupons SET is_active = $1 WHERE id = $2', [isActive, req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export default router;
