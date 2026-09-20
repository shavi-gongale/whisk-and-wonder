import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireOwner } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken, requireOwner);

router.get('/categories', async (_req, res) => {
  const result = await pool.query('SELECT * FROM categories ORDER BY sort_order, name');
  res.json(result.rows);
});

router.post('/categories', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 2 || name.length > 120) return res.status(400).json({ error: 'Category name is invalid' });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const result = await pool.query(
    `INSERT INTO categories (name, slug, description, image_url, sort_order)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [name, slug, String(req.body.description || ''), req.body.imageUrl || null, Number(req.body.sortOrder || 0)],
  );
  res.status(201).json(result.rows[0]);
});

router.patch('/categories/:id', async (req, res) => {
  const fields = [];
  const values = [];
  for (const [key, column] of Object.entries({ name: 'name', description: 'description', imageUrl: 'image_url', isActive: 'is_active', sortOrder: 'sort_order' })) {
    if (key in req.body) { values.push(req.body[key]); fields.push(`${column} = $${values.length}`); }
  }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  values.push(req.params.id);
  const result = await pool.query(`UPDATE categories SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`, values);
  if (!result.rows.length) return res.status(404).json({ error: 'Category not found' });
  res.json(result.rows[0]);
});

router.delete('/categories/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true });
});

router.get('/inventory', async (_req, res) => {
  const result = await pool.query(
    `SELECT p.id, p.source_id, p.name, p.stock, p.availability,
      COALESCE((SELECT SUM(quantity_change) FROM inventory_movements m WHERE m.product_id = p.id), 0)::int AS net_movement
     FROM products p ORDER BY p.stock ASC, p.name`,
  );
  res.json(result.rows);
});

router.patch('/inventory/:id', async (req, res) => {
  const quantity = Number(req.body.quantityChange);
  if (!Number.isInteger(quantity) || quantity === 0 || Math.abs(quantity) > 10000) return res.status(400).json({ error: 'Stock adjustment is invalid' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const product = await client.query('SELECT id, stock FROM products WHERE id = $1 OR source_id = $1 FOR UPDATE', [req.params.id]);
    if (!product.rows.length) throw Object.assign(new Error('Product not found'), { status: 404 });
    const nextStock = Number(product.rows[0].stock) + quantity;
    if (nextStock < 0) throw Object.assign(new Error('Stock cannot become negative'), { status: 409 });
    await client.query('UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2', [nextStock, product.rows[0].id]);
    await client.query('INSERT INTO inventory_movements (product_id, quantity_change, reason) VALUES ($1,$2,$3)', [product.rows[0].id, quantity, req.body.reason || 'owner_adjustment']);
    await client.query('COMMIT');
    res.json({ success: true, stock: nextStock });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Unable to adjust inventory' });
  } finally {
    client.release();
  }
});

router.get('/settings', async (_req, res) => {
  const result = await pool.query('SELECT key, value, updated_at FROM admin_settings ORDER BY key');
  res.json(Object.fromEntries(result.rows.map(row => [row.key, row.value])));
});

router.patch('/settings', async (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Settings object required' });
  for (const [key, value] of Object.entries(req.body)) {
    if (!/^[a-z][a-z0-9_]{0,99}$/i.test(key)) continue;
    await pool.query(
      `INSERT INTO admin_settings (key, value, updated_by) VALUES ($1,$2,$3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [key, JSON.stringify(value), req.user.id],
    );
  }
  res.json({ success: true });
});

router.get('/customers', async (_req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.phone, u.points, u.orders_count, u.email_verified, u.created_at,
      COALESCE(SUM(o.total), 0) AS total_spent
     FROM users u LEFT JOIN orders o ON o.user_id = u.id
     WHERE u.is_owner = false GROUP BY u.id ORDER BY u.created_at DESC`,
  );
  res.json(result.rows);
});

const exportQueries = {
  orders: `SELECT id, user_id, subtotal, delivery_fee, discount, total, status, payment_status, created_at FROM orders ORDER BY created_at DESC`,
  customers: `SELECT id, name, email, phone, points, orders_count, created_at FROM users WHERE is_owner = false ORDER BY created_at DESC`,
  products: `SELECT id, source_id, name, category, price, stock, is_hidden, created_at FROM products ORDER BY created_at DESC`,
  inventory: `SELECT product_id, quantity_change, reason, order_id, created_at FROM inventory_movements ORDER BY created_at DESC`,
  sales: `SELECT created_at::date AS day, COUNT(*)::int AS orders, SUM(total) AS revenue FROM orders GROUP BY 1 ORDER BY 1 DESC`,
};

router.get('/exports/:resource', async (req, res) => {
  const query = exportQueries[req.params.resource];
  if (!query) return res.status(404).json({ error: 'Export type not found' });
  const result = await pool.query(query);
  const columns = result.fields.map(field => field.name);
  const csv = [columns, ...result.rows.map(row => columns.map(column => JSON.stringify(row[column] ?? '')))]
    .map(row => row.join(',')).join('\n');
  res.type('text/csv').setHeader('Content-Disposition', `attachment; filename="${req.params.resource}.csv"`).send(csv);
});

export default router;