import express from 'express';
import cors from 'cors';
import pool from './db.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import usersRouter from './routes/users.js';
import reviewsRouter from './routes/reviews.js';
import newsletterRouter from './routes/newsletter.js';
import contactRouter from './routes/contact.js';
import wishlistRouter from './routes/wishlist.js';
import couponsRouter from './routes/coupons.js';

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));

app.use('/api/auth',       authRouter);
app.use('/api/products',   productsRouter);
app.use('/api/orders',     ordersRouter);
app.use('/api/users',      usersRouter);
app.use('/api/reviews',    reviewsRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/contact',    contactRouter);
app.use('/api/wishlist',   wishlistRouter);
app.use('/api/coupons',    couponsRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Analytics snapshot for owner dashboard
app.get('/api/analytics', async (req, res) => {
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🍰 Whisk & Wonder API running on port ${PORT}`);
});
