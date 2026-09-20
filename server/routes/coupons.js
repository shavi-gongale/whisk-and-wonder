import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireOwner } from '../middleware/auth.js';

const router = Router();

// POST /api/coupons/validate — validate a coupon code
router.post('/validate', async (req, res) => {
  try {
    const { code, total } = req.body;
    const orderTotal = Number(total);
    if (!code) return res.status(400).json({ error: 'Code required' });
    if (!Number.isFinite(orderTotal) || orderTotal < 0) return res.status(400).json({ error: 'Valid order total required' });
    const result = await pool.query(
      `SELECT * FROM coupons WHERE code = $1 AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses IS NULL OR uses_count < max_uses)`,
       [String(code).trim().toUpperCase()]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Invalid or expired coupon' });
    const coupon = result.rows[0];
    if (coupon.min_order && orderTotal < Number(coupon.min_order)) {
      return res.status(400).json({ error: `Minimum order of ₹${coupon.min_order} required` });
    }
    let discount = coupon.type === 'percent'
      ? Math.round(orderTotal * Number(coupon.value) / 100)
      : Math.min(Number(coupon.value), orderTotal);
    if (coupon.max_discount) discount = Math.min(discount, Number(coupon.max_discount));
    res.json({ valid: true, discount, code: coupon.code, description: coupon.description });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Public listing used by checkout; only active, currently valid coupons are exposed.
router.get('/available', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, code, type, value, description, min_order, max_discount, expires_at
       FROM coupons WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses IS NULL OR uses_count < max_uses) ORDER BY created_at DESC`,
    );
    res.json(result.rows.map(row => ({
      id: String(row.id),
      code: row.code,
      type: row.type,
      value: Number(row.value),
      discount: Number(row.value),
      description: row.description,
      minOrder: Number(row.min_order || 0),
      maxDiscount: row.max_discount ? Number(row.max_discount) : undefined,
      expiresAt: row.expires_at,
      active: true,
    })));
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
    if (!/^[A-Z0-9_-]{3,40}$/i.test(String(code || '')) || !['percent', 'flat'].includes(type) ||
      !Number.isFinite(Number(value)) || Number(value) <= 0 || (type === 'percent' && Number(value) > 100)) {
      return res.status(400).json({ error: 'Invalid coupon details' });
    }
    const result = await pool.query(
      `INSERT INTO coupons (code, type, value, description, min_order, max_uses, max_discount, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [String(code).trim().toUpperCase(), type, Number(value), String(description || '').slice(0, 500),
       Number(minOrder || 0), maxUses ? Number(maxUses) : null, req.body.maxDiscount ? Number(req.body.maxDiscount) : null, expiresAt || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id', verifyToken, requireOwner, async (req, res) => {
  try {
    const fields = [];
    const values = [];
    const allowed = { isActive: 'is_active', description: 'description', minOrder: 'min_order', maxUses: 'max_uses', maxDiscount: 'max_discount', expiresAt: 'expires_at' };
    for (const [key, column] of Object.entries(allowed)) {
      if (key in req.body) { values.push(req.body[key]); fields.push(`${column} = $${values.length}`); }
    }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    values.push(req.params.id);
    const result = await pool.query(`UPDATE coupons SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    if (!result.rows.length) return res.status(404).json({ error: 'Coupon not found' });
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', verifyToken, requireOwner, async (req, res) => {
  const result = await pool.query('DELETE FROM coupons WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Coupon not found' });
  res.json({ success: true });
});

export default router;
