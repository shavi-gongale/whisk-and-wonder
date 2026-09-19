import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireOwner, optionalToken } from '../middleware/auth.js';

const router = Router();

const ALL_STATUSES = [
  'Order Confirmed','Preparing','Baking','Decorating','Packaging','Out For Delivery','Delivered'
];

// POST /api/orders — create order (auth optional; guest orders use user_id = null)
router.post('/', optionalToken, async (req, res) => {
  let client;
  try {
    const { items, address, paymentMethod, couponCode, notes, estimatedDelivery } = req.body;
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return res.status(400).json({ error: 'At least one order item is required' });
    }
    if (!address || typeof address !== 'object') return res.status(400).json({ error: 'Delivery address is required' });
    const safePaymentMethods = new Set(['cod', 'card', 'upi', 'netbanking']);
    if (!safePaymentMethods.has(paymentMethod)) return res.status(400).json({ error: 'Unsupported payment method' });
    const userId = req.user?.id || null;
    client = await pool.connect();
    await client.query('BEGIN');
    const canonicalItems = [];
    let subtotal = 0;
    for (const item of items) {
      const productKey = String(item.productId ?? '');
      const quantity = Number(item.qty ?? item.quantity);
      if (!productKey || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
        throw Object.assign(new Error('Invalid order item'), { status: 400 });
      }
      const productResult = await client.query(
        'SELECT * FROM products WHERE (source_id = $1 OR id::text = $1) AND is_hidden = false FOR UPDATE',
        [productKey],
      );
      const product = productResult.rows[0];
      if (!product) throw Object.assign(new Error('One or more products are unavailable'), { status: 400 });
      if (product.stock < quantity) throw Object.assign(new Error(`${product.name} has only ${product.stock} left`), { status: 409 });
      const size = typeof item.size === 'string' ? item.size : '';
      const sizeOption = Array.isArray(product.sizes) ? product.sizes.find(s => s.label === size) : null;
      const unitPrice = Number(sizeOption?.price ?? product.price);
      subtotal += unitPrice * quantity;
      canonicalItems.push({
        id: product.source_id || String(product.id), productId: product.id, name: product.name, imgId: product.img_id,
        price: unitPrice, quantity, size: size || undefined,
      });
      await client.query('UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2', [quantity, product.id]);
    }
    const requestedDeliveryFee = Number(req.body.deliveryFee ?? 0);
    const deliveryFee = [0, 49, 99, 149].includes(requestedDeliveryFee) ? requestedDeliveryFee : 0;
    let discount = 0;
    let normalizedCoupon = null;
    if (couponCode) {
      const couponResult = await client.query(
        `SELECT * FROM coupons WHERE code = $1 AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR uses_count < max_uses) FOR UPDATE`,
        [String(couponCode).trim().toUpperCase()],
      );
      const coupon = couponResult.rows[0];
      if (!coupon) throw Object.assign(new Error('Invalid or expired coupon'), { status: 400 });
      if (Number(coupon.min_order || 0) > subtotal) throw Object.assign(new Error(`Minimum order of ₹${coupon.min_order} required`), { status: 400 });
      discount = coupon.type === 'percent'
        ? Math.min(subtotal, Math.round(subtotal * Number(coupon.value) / 100))
        : Math.min(subtotal, Number(coupon.value));
      normalizedCoupon = coupon.code;
    }
    const total = Math.max(0, subtotal + deliveryFee - discount);
    const now = new Date().toISOString();
    const trackingSteps = ALL_STATUSES.map((step, i) =>
      i === 0 ? { step, completedAt: now } : { step }
    );
    const result = await client.query(
      `INSERT INTO orders (user_id, items, subtotal, delivery_fee, discount, total, status,
        status_updated_at, address, payment_method, coupon_code, notes, estimated_delivery, tracking_steps)
       VALUES ($1,$2,$3,$4,$5,$6,'Order Confirmed',$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [userId, JSON.stringify(canonicalItems), subtotal, deliveryFee, discount, total, now,
       JSON.stringify(address), paymentMethod, normalizedCoupon, notes||null, estimatedDelivery||'', JSON.stringify(trackingSteps)]
    );
    const orderId = result.rows[0].id;
    for (const item of canonicalItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [orderId, Number(item.productId), item.name, item.size || null, item.quantity, item.price],
      );
      await client.query(
        'INSERT INTO inventory_movements (product_id, quantity_change, reason, order_id) VALUES ($1,$2,$3,$4)',
        [Number(item.productId), -item.quantity, 'order_confirmed', orderId],
      );
    }
    if (normalizedCoupon) {
      await client.query('UPDATE coupons SET uses_count = uses_count + 1 WHERE code = $1', [normalizedCoupon]);
    }
    // Update user order count
    if (userId) {
      await client.query('UPDATE users SET orders_count = orders_count + 1, points = points + $1 WHERE id = $2',
        [Math.floor(total), userId]);
      await client.query(
        `INSERT INTO loyalty_transactions (user_id, points, type, description, order_id)
         VALUES ($1,$2,'earned','Points earned from order',$3)`,
        [userId, Math.floor(total), orderId],
      );
    }
    await client.query('COMMIT');
    res.status(201).json(mapOrder(result.rows[0]));
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error(err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
  } finally {
    client?.release();
  }
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
