import { Router } from 'express';
import crypto from 'node:crypto';
import pool from '../db.js';
import { verifyToken, requireOwner } from '../middleware/auth.js';

const router = Router();

router.get('/config', (_req, res) => {
  res.json({ provider: 'razorpay', configured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET), keyId: process.env.RAZORPAY_KEY_ID || null });
});

router.post('/create-order', verifyToken, async (req, res) => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ error: 'Online payments are not configured. Use cash on delivery or add Razorpay credentials.' });
  }
  const amount = Number(req.body.amount);
  const orderId = String(req.body.orderId || '');
  if (!Number.isFinite(amount) || amount <= 0 || !/^\d+$/.test(orderId)) return res.status(400).json({ error: 'Valid order and amount required' });
  const order = await pool.query('SELECT total, payment_status FROM orders WHERE id = $1 AND user_id = $2', [orderId, req.user.id]);
  if (!order.rows.length) return res.status(404).json({ error: 'Order not found' });
  if (Number(order.rows[0].total) !== amount || order.rows[0].payment_status === 'paid') return res.status(409).json({ error: 'Payment amount or state is invalid' });
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt: `ww_order_${orderId}` }),
  });
  if (!response.ok) return res.status(502).json({ error: 'Payment provider could not create an order' });
  const providerOrder = await response.json();
  await pool.query(
    `INSERT INTO payments (order_id, provider, provider_order_id, amount, currency, status, raw_response)
     VALUES ($1,'razorpay',$2,$3,'INR','created',$4)
     ON CONFLICT (provider, provider_order_id) DO NOTHING`,
    [orderId, providerOrder.id, amount, JSON.stringify({ id: providerOrder.id, amount: providerOrder.amount })],
  );
  res.json({ id: providerOrder.id, amount: providerOrder.amount, currency: providerOrder.currency, keyId: process.env.RAZORPAY_KEY_ID });
});

router.post('/verify', verifyToken, async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) return res.status(400).json({ error: 'Payment verification fields are required' });
  if (!process.env.RAZORPAY_KEY_SECRET) return res.status(503).json({ error: 'Online payments are not configured' });
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
  const actual = Buffer.from(String(razorpaySignature));
  if (actual.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), actual)) return res.status(400).json({ error: 'Payment signature verification failed' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const payment = await client.query(
      `SELECT p.*, o.user_id, o.total FROM payments p JOIN orders o ON o.id = p.order_id
       WHERE p.provider = 'razorpay' AND p.provider_order_id = $1 FOR UPDATE`,
      [razorpayOrderId],
    );
    if (!payment.rows.length || String(payment.rows[0].user_id) !== String(req.user.id)) throw Object.assign(new Error('Payment not found'), { status: 404 });
    if (payment.rows[0].status === 'paid') {
      await client.query('COMMIT');
      return res.json({ success: true, status: 'paid' });
    }
    await client.query(
      `UPDATE payments SET provider_payment_id = $1, status = 'paid', updated_at = NOW() WHERE id = $2`,
      [razorpayPaymentId, payment.rows[0].id],
    );
    await client.query(`UPDATE orders SET payment_status = 'paid', status = 'Payment Confirmed', status_updated_at = NOW() WHERE id = $1`, [payment.rows[0].order_id]);
    await client.query('COMMIT');
    res.json({ success: true, status: 'paid' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Payment verification failed' });
  } finally {
    client.release();
  }
});

router.post('/webhook', async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) return res.status(400).json({ error: 'Webhook verification is not configured' });
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex');
  if (expected !== signature) return res.status(400).json({ error: 'Invalid webhook signature' });
  const payment = req.body?.payload?.payment?.entity;
  if (payment?.order_id) {
    await pool.query(
      `UPDATE payments SET provider_payment_id = COALESCE(provider_payment_id, $1), status = CASE WHEN $2 = 'captured' THEN 'paid' ELSE status END, raw_response = $3, updated_at = NOW()
       WHERE provider = 'razorpay' AND provider_order_id = $4`,
      [payment.id, payment.status, JSON.stringify(req.body), payment.order_id],
    );
  }
  res.json({ received: true });
});

router.post('/refund/:orderId', verifyToken, requireOwner, async (req, res) => {
  const result = await pool.query(
    `UPDATE payments SET status = 'refunded', updated_at = NOW()
     WHERE order_id = $1 AND status = 'paid' RETURNING id`,
    [req.params.orderId],
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Paid payment not found' });
  await pool.query(`UPDATE orders SET payment_status = 'refunded', status = 'Refunded', status_updated_at = NOW() WHERE id = $1`, [req.params.orderId]);
  res.json({ success: true });
});

export default router;