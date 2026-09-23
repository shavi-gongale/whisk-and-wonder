import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from './db.js';
import { initDb } from './init-db.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import usersRouter from './routes/users.js';
import reviewsRouter from './routes/reviews.js';
import newsletterRouter from './routes/newsletter.js';
import contactRouter from './routes/contact.js';
import wishlistRouter from './routes/wishlist.js';
import couponsRouter from './routes/coupons.js';
import notificationsRouter from './routes/notifications.js';
import loyaltyRouter from './routes/loyalty.js';
import cakeStudioRouter from './routes/cakeStudio.js';
import paymentsRouter from './routes/payments.js';
import adminRouter from './routes/admin.js';
import deliveryRouter from './routes/delivery.js';
import { verifyToken, requireOwner } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 3001;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const configuredDomains = [
  ...(process.env.CORS_ORIGINS?.split(',') || []),
].map(value => String(value || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
  .filter(Boolean);
const allowedOrigins = new Set([
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  ...configuredDomains.flatMap(domain => [
    `https://${domain}`,
    `https://${domain}:5000`,
    `http://${domain}`,
    `http://${domain}:5000`,
  ]),
]);
const isAllowedConfiguredOrigin = (origin) => {
  try {
    const parsed = new URL(origin);
    return configuredDomains.includes(parsed.hostname);
  } catch {
    return false;
  }
};
const requestWindows = new Map();
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || isAllowedConfiguredOrigin(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed'));
  },
  credentials: true,
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  next();
});
app.use((req, res, next) => {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const windowMs = 60_000;
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt > windowMs) {
    requestWindows.set(key, { startedAt: now, count: 1 });
  } else {
    current.count += 1;
    if (current.count > (req.path.startsWith('/api/auth') ? 30 : 180)) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }
  }
  if (requestWindows.size > 5000) {
    for (const [entry, value] of requestWindows) if (now - value.startedAt > windowMs) requestWindows.delete(entry);
  }
  next();
});
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth',       authRouter);
app.use('/api/products',   productsRouter);
app.use('/api/orders',     ordersRouter);
app.use('/api/users',      usersRouter);
app.use('/api/reviews',    reviewsRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/contact',    contactRouter);
app.use('/api/wishlist',   wishlistRouter);
app.use('/api/coupons',    couponsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/loyalty', loyaltyRouter);
app.use('/api/cake-studio', cakeStudioRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/delivery', deliveryRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use((err, _req, res, _next) => {
  if (err?.message === 'Origin not allowed') return res.status(403).json({ error: 'Origin not allowed' });
  console.error('Unhandled API error:', err);
  res.status(500).json({ error: 'Unexpected server error' });
});

// Analytics snapshot for owner dashboard — owner only
app.get('/api/analytics', verifyToken, requireOwner, async (req, res) => {
  try {
    const [orders, users, products, reviews, newsletter] = await Promise.all([
      pool.query('SELECT COUNT(*) as count, COALESCE(SUM(total),0) as revenue FROM orders'),
      pool.query('SELECT COUNT(*) as count FROM users WHERE is_owner = false'),
      pool.query('SELECT COUNT(*) as count FROM products WHERE is_hidden = false'),
      pool.query('SELECT COUNT(*) as count FROM reviews WHERE is_hidden = false'),
      pool.query('SELECT COUNT(*) as count FROM newsletter'),
    ]);
    const today = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total),0) as revenue
       FROM orders WHERE created_at::date = CURRENT_DATE`
    );
    const recentOrders = await pool.query(
      `SELECT o.*, u.name as customer_name FROM orders o LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC LIMIT 10`
    );
    res.json({
      totalOrders: Number(orders.rows[0].count),
      totalRevenue: Number(orders.rows[0].revenue),
      totalCustomers: Number(users.rows[0].count),
      totalProducts: Number(products.rows[0].count),
      totalReviews: Number(reviews.rows[0].count),
      newsletterSubscribers: Number(newsletter.rows[0].count),
      todayOrders: Number(today.rows[0].count),
      todayRevenue: Number(today.rows[0].revenue),
      recentOrders: recentOrders.rows,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.use(express.static(path.join(ROOT, 'dist')));
app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
  res.sendFile(path.join(ROOT, 'dist', 'index.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🍰 Whisk & Wonder API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  });
