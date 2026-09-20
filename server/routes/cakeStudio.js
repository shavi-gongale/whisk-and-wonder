import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireOwner } from '../middleware/auth.js';

const router = Router();

function mapDesign(row) {
  return {
    id: String(row.id),
    name: row.name,
    configuration: row.configuration || {},
    referenceImageUrl: row.reference_image_url || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/designs', verifyToken, async (req, res) => {
  const result = await pool.query('SELECT * FROM cake_studio_designs WHERE user_id = $1 ORDER BY updated_at DESC', [req.user.id]);
  res.json(result.rows.map(mapDesign));
});

router.post('/designs', verifyToken, async (req, res) => {
  const { name, configuration, referenceImageUrl } = req.body;
  if (!name || typeof name !== 'string' || name.length > 255 || !configuration || typeof configuration !== 'object') {
    return res.status(400).json({ error: 'Design name and configuration are required' });
  }
  const result = await pool.query(
    `INSERT INTO cake_studio_designs (user_id, name, configuration, reference_image_url)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.user.id, name.trim(), JSON.stringify(configuration), referenceImageUrl || null],
  );
  res.status(201).json(mapDesign(result.rows[0]));
});

router.patch('/designs/:id', verifyToken, async (req, res) => {
  const fields = [];
  const values = [];
  if (typeof req.body.name === 'string' && req.body.name.trim()) {
    values.push(req.body.name.trim()); fields.push(`name = $${values.length}`);
  }
  if (req.body.configuration && typeof req.body.configuration === 'object') {
    values.push(JSON.stringify(req.body.configuration)); fields.push(`configuration = $${values.length}`);
  }
  if ('referenceImageUrl' in req.body) {
    values.push(req.body.referenceImageUrl || null); fields.push(`reference_image_url = $${values.length}`);
  }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  values.push(req.params.id, req.user.id);
  const result = await pool.query(
    `UPDATE cake_studio_designs SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`,
    values,
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Design not found' });
  res.json(mapDesign(result.rows[0]));
});

router.delete('/designs/:id', verifyToken, async (req, res) => {
  await pool.query('DELETE FROM cake_studio_designs WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ success: true });
});

router.get('/orders', verifyToken, async (req, res) => {
  const owner = await pool.query('SELECT is_owner FROM users WHERE id = $1', [req.user.id]);
  const isOwner = Boolean(owner.rows[0]?.is_owner);
  const query = isOwner
    ? `SELECT c.*, u.name AS customer_name, u.email AS customer_email
       FROM cake_studio_orders c LEFT JOIN users u ON u.id = c.user_id ORDER BY c.created_at DESC LIMIT 200`
    : 'SELECT * FROM cake_studio_orders WHERE user_id = $1 ORDER BY created_at DESC';
  const result = await pool.query(query, isOwner ? [] : [req.user.id]);
  res.json(result.rows);
});

router.patch('/orders/:id', verifyToken, requireOwner, async (req, res) => {
  const allowed = new Set(['New', 'Reviewing', 'In Production', 'Ready', 'Completed', 'Cancelled']);
  if (!allowed.has(req.body.status)) return res.status(400).json({ error: 'Invalid cake order status' });
  const result = await pool.query(
    'UPDATE cake_studio_orders SET status = $1, owner_notes = COALESCE($2, owner_notes), updated_at = NOW() WHERE id = $3 RETURNING *',
    [req.body.status, req.body.ownerNotes, req.params.id],
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Cake order not found' });
  res.json(result.rows[0]);
});

export default router;