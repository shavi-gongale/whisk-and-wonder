import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/zones', async (req, res) => {
  const pincode = String(req.query.pincode || '');
  const result = await pool.query('SELECT * FROM delivery_zones WHERE is_active = true ORDER BY min_order DESC, fee ASC');
  const zones = result.rows.filter(zone => {
    const prefixes = Array.isArray(zone.pincode_prefixes) ? zone.pincode_prefixes : [];
    return !pincode || prefixes.length === 0 || prefixes.some(prefix => pincode.startsWith(String(prefix)));
  });
  res.json(zones.map(zone => ({
    id: String(zone.id),
    name: zone.name,
    optionKey: zone.option_key,
    fee: Number(zone.fee),
    minOrder: Number(zone.min_order || 0),
    estimatedTime: zone.estimated_time,
  })));
});

export default router;