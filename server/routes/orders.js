import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireOwner, optionalToken } from '../middleware/auth.js';

const router = Router();

const ALL_STATUSES = [
  'Order Confirmed','Payment Confirmed','Preparing','Baking','Decorating','Packaging','Out For Delivery','Delivered','Cancelled','Refunded'
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
    if (!/^\d{6}$/.test(String(address.pincode || ''))) return res.status(400).json({ error: 'A valid 6-digit delivery pincode is required' });
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
        price: unitPrice, quantity, qty: quantity, category: product.category, size: size || undefined,
      });
      await client.query('UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2', [quantity, product.id]);
    }
    const zoneResult = await client.query('SELECT * FROM delivery_zones WHERE is_active = true ORDER BY min_order DESC');
    const pincode = String(address.pincode);
    const matchingZones = zoneResult.rows.filter(zone => {
      const prefixes = Array.isArray(zone.pincode_prefixes) ? zone.pincode_prefixes : [];
      return prefixes.length === 0 || prefixes.some(prefix => pincode.startsWith(String(prefix)));
    });
    const requestedDeliveryFee = Number(req.body.deliveryFee ?? 0);
    const zone = matchingZones.find(candidate => Number(candidate.fee) === requestedDeliveryFee) || matchingZones.find(candidate => candidate.option_key === 'standard');
    if (!zone) throw Object.assign(new Error('Delivery is not available for this pincode'), { status: 400 });
    if (subtotal < Number(zone.min_order || 0)) throw Object.assign(new Error(`Minimum order of ₹${zone.min_order} required for this delivery zone`), { status: 400 });
    const deliveryFee = Number(zone.fee);
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
      if (userId) {
        const priorUse = await client.query('SELECT 1 FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2', [coupon.id, userId]);
        if (priorUse.rows.length) throw Object.assign(new Error('You have already used this coupon'), { status: 409 });
      }
      discount = coupon.type === 'percent'
        ? Math.min(subtotal, Math.round(subtotal * Number(coupon.value) / 100))
        : Math.min(subtotal, Number(coupon.value));
      if (coupon.max_discount) discount = Math.min(discount, Number(coupon.max_discount));
      normalizedCoupon = coupon.code;
    }
    const total = Math.max(0, subtotal + deliveryFee - discount);
    const now = new Date().toISOString();
    const trackingSteps = ALL_STATUSES.map((step, i) =>
      i === 0 ? { step, completedAt: now } : { step }
    );
    const result = await client.query(
      `INSERT INTO orders (user_id, items, subtotal, delivery_fee, discount, total, status,
        status_updated_at, address, payment_method, coupon_code, notes, estimated_delivery, tracking_steps, payment_status)
       VALUES ($1,$2,$3,$4,$5,$6,'Order Confirmed',$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [userId, JSON.stringify(canonicalItems), subtotal, deliveryFee, discount, total, now,
       JSON.stringify(address), paymentMethod, normalizedCoupon, notes||null, estimatedDelivery||'', JSON.stringify(trackingSteps),
       paymentMethod === 'cod' ? 'pending' : 'pending']
    );
    const orderId = result.rows[0].id;
    for (const item of canonicalItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price)
          VALUES ($1,$2,$3,$4,$5,$6,$7)`,
         [orderId, Number(item.productId), item.name, item.size || null, item.quantity, item.price, JSON.stringify({ category: item.category })],
      );
      await client.query(
        'INSERT INTO inventory_movements (product_id, quantity_change, reason, order_id) VALUES ($1,$2,$3,$4)',
        [Number(item.productId), -item.quantity, 'order_confirmed', orderId],
      );
    }
    if (normalizedCoupon) {
      const coupon = await client.query('SELECT id FROM coupons WHERE code = $1', [normalizedCoupon]);
      await client.query(
        `INSERT INTO coupon_redemptions (coupon_id, user_id, order_id) VALUES ($1,$2,$3)`,
        [coupon.rows[0].id, userId, orderId],
      );
      await client.query('UPDATE coupons SET uses_count = uses_count + 1 WHERE id = $1', [coupon.rows[0].id]);
    }
    await client.query(
      `INSERT INTO order_events (order_id, status, note) VALUES ($1, 'Order Confirmed', 'Order created')`,
      [orderId],
    );
    await client.query(
      `INSERT INTO payments (order_id, provider, amount, currency, status)
       VALUES ($1, $2, $3, 'INR', 'pending')`,
      [orderId, paymentMethod === 'cod' ? 'cod' : 'razorpay', total],
    );
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'order', 'Order received', 'Your bakery order has been received and is being prepared.', jsonb_build_object('orderId', $2))`,
      [userId, orderId],
    );
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES (NULL, 'order', 'New order received', $1, jsonb_build_object('orderId', $2))`,
      [`New order #${orderId} for ₹${total.toFixed(0)}.`, orderId],
    );
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
    const ownerCheck = await pool.query('SELECT is_owner FROM users WHERE id = $1', [req.user.id]);
    if (ownerCheck.rows[0]?.is_owner) {
      result = await pool.query(
        `SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
         FROM orders o LEFT JOIN users u ON u.id = o.user_id
         ORDER BY o.created_at DESC LIMIT 200`,
      );
    } else {
      result = await pool.query(
        `SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
         FROM orders o LEFT JOIN users u ON u.id = o.user_id
         WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
        [req.user.id],
      );
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
    const ownerCheck = await pool.query('SELECT is_owner FROM users WHERE id = $1', [req.user.id]);
    if (!ownerCheck.rows[0]?.is_owner && String(order.user_id) !== String(req.user.id))
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
    const row = await pool.query('SELECT tracking_steps, user_id FROM orders WHERE id = $1', [req.params.id]);
    if (!row.rows.length) return res.status(404).json({ error: 'Order not found' });
    const steps = (row.rows[0].tracking_steps || []).map(ts =>
      ts.step === status && !ts.completedAt ? { ...ts, completedAt: now } : ts
    );
    const result = await pool.query(
      `UPDATE orders SET status = $1, status_updated_at = $2, tracking_steps = $3 WHERE id = $4 RETURNING *`,
      [status, now, JSON.stringify(steps), req.params.id]
    );
    await pool.query('INSERT INTO order_events (order_id, status, note) VALUES ($1,$2,$3)', [req.params.id, status, 'Updated by owner']);
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'order', 'Order status updated', $2, jsonb_build_object('orderId', $3))`,
      [row.rows[0].user_id, `Your order is now ${status}.`, req.params.id],
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
    paymentStatus: row.payment_status || 'pending',
    orderNum: `WW-${String(row.id).padStart(6, '0')}`,
    customer: {
      name: row.customer_name || row.address?.name || 'Guest customer',
      email: row.customer_email || row.address?.email || '',
      phone: row.customer_phone || row.address?.phone || '',
    },
  };
}

export default router;
