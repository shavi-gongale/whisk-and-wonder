import { Router } from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// PATCH /api/users/profile
router.patch('/profile', verifyToken, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const fields = []; const values = [];
    if (name !== undefined) { values.push(name); fields.push(`name = $${values.length}`); }
    if (phone !== undefined) { values.push(phone); fields.push(`phone = $${values.length}`); }
    if (avatar !== undefined) { values.push(avatar); fields.push(`avatar = $${values.length}`); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    if (name) {
      const initials = name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
      values.push(initials); fields.push(`initials = $${values.length}`);
    }
    values.push(req.user.id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING id, name, email, initials, member_since, points, orders_count, is_owner, phone, avatar`,
      values
    );
    const row = result.rows[0];
    res.json({
      id: String(row.id), name: row.name, email: row.email, initials: row.initials,
      memberSince: row.member_since, points: row.points, orders: row.orders_count,
      isOwner: row.is_owner, phone: row.phone||undefined, avatar: row.avatar||undefined,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/users/addresses
router.get('/addresses', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC', [req.user.id]);
    res.json(result.rows.map(mapAddr));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/users/addresses
router.post('/addresses', verifyToken, async (req, res) => {
  try {
    const a = req.body;
    if (a.isDefault) await pool.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    const result = await pool.query(
      `INSERT INTO addresses (user_id, label, name, phone, line1, line2, city, state, pincode, is_default, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.user.id, a.label, a.name, a.phone, a.line1, a.line2||null, a.city, a.state, a.pincode, a.isDefault||false, a.lat||null, a.lng||null]
    );
    res.status(201).json(mapAddr(result.rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/users/addresses/:id
router.patch('/addresses/:id', verifyToken, async (req, res) => {
  try {
    const a = req.body;
    if (a.isDefault) await pool.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    const fields = []; const values = [];
    ['label','name','phone','line1','line2','city','state','pincode','is_default','lat','lng'].forEach(col => {
      const jsKey = col === 'is_default' ? 'isDefault' : col;
      if (jsKey in a) { values.push(a[jsKey]); fields.push(`${col} = $${values.length}`); }
    });
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    values.push(req.params.id); values.push(req.user.id);
    const result = await pool.query(
      `UPDATE addresses SET ${fields.join(', ')} WHERE id = $${values.length-1} AND user_id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Address not found' });
    res.json(mapAddr(result.rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/users/addresses/:id
router.delete('/addresses/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

function mapAddr(row) {
  return {
    id: String(row.id), label: row.label, name: row.name, phone: row.phone,
    line1: row.line1, line2: row.line2||undefined, city: row.city, state: row.state,
    pincode: row.pincode, isDefault: row.is_default, lat: row.lat||undefined, lng: row.lng||undefined,
  };
}

export default router;
