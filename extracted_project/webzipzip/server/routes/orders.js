import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireOwner, optionalToken } from '../middleware/auth.js';

const router = Router();

const ALL_STATUSES = [
  'Order Confirmed','Preparing','Baking','Decorating','Packaging','Out For Delivery','Delivered'
];

// POST /api/orders — create order (auth optional; guest orders use user_id = null)
router.post('/', optionalToken, async (req, res) => {
  try {
    const { items, subtotal, deliveryFee, discount, total, address, paymentMethod, couponCode, notes, estimatedDelivery } = req.body;
    const userId = req.user?.id || null;
    const now = new Date().toISOString();
    const trackingSteps = ALL_STATUSES.map((step, i) =>
      i === 0 ? { step, completedAt: now } : { step }
    );
    const result = await pool.query(
      `INSERT INTO orders (user_id, items, subtotal, delivery_fee, discount, total, status,
        status_updated_at, address, payment_method, coupon_code, notes, estimated_delivery, tracking_steps)
       VALUES ($1,$2,$3,$4,$5,$6,'Order Confirmed',$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [userId, JSON.stringify(items), subtotal, deliveryFee||0, discount||0, total, now,
       address, paymentMethod, couponCode||null, notes||null, estimatedDelivery||'', JSON.stringify(trackingSteps)]
    );
    // Update user order count
    if (userId) {
      await pool.query('UPDATE users SET orders_count = orders_count + 1, points = points + $1 WHERE id = $2',
        [Math.floor(total), userId]);
    }
    res.status(201).json(mapOrder(result.rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/orders — owner sees all, user sees own
router.get('/', verifyToken, async (req, res) => {
  try {
    let result;
    if (req.user.isOwner) {
      result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200');
    } else {
      result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    }
    res.json(result.rows.map(mapOrder));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/orders/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    const order = result.rows[0];
    if (!req.user.isOwner && String(order.user_id) !== String(req.user.id))
      return res.status(403).json({ error: 'Forbidden' });
    res.json(mapOrder(order));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/orders/:id/status — owner only
router.patch('/:id/status', verifyToken, requireOwner, async (req, res) => {
  try {
    const { status } = req.body;
    if (!ALL_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const now = new Date().toISOString();
    const row = await pool.query('SELECT tracking_steps FROM orders WHERE id = $1', [req.params.id]);
    if (!row.rows.length) return res.status(404).json({ error: 'Order not found' });
    const steps = (row.rows[0].tracking_steps || []).map(ts =>
      ts.step === status && !ts.completedAt ? { ...ts, completedAt: now } : ts
    );
    const result = await pool.query(
      `UPDATE orders SET status = $1, status_updated_at = $2, tracking_steps = $3 WHERE id = $4 RETURNING *`,
      [status, now, JSON.stringify(steps), req.params.id]
    );
    res.json(mapOrder(result.rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

function mapOrder(row) {
  return {
    id: String(row.id), items: row.items || [],
    subtotal: Number(row.subtotal), deliveryFee: Number(row.delivery_fee),
    discount: Number(row.discount), total: Number(row.total),
    date: row.created_at, status: row.status, statusUpdatedAt: row.status_updated_at,
    address: row.address, paymentMethod: row.payment_method,
    couponCode: row.coupon_code || undefined, notes: row.notes || undefined,
    estimatedDelivery: row.estimated_delivery, trackingSteps: row.tracking_steps || [],
  };
}

export default router;
