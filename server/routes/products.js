import { Router } from 'express';
import pool from '../db.js';
import { verifyToken, requireOwner } from '../middleware/auth.js';

const router = Router();

// GET /api/products — public
router.get('/', async (req, res) => {
  try {
    const { category, search, limit, offset } = req.query;
    let query = `SELECT * FROM products WHERE is_hidden = false`;
    const params = [];
    if (category && category !== 'All') { params.push(category); query += ` AND category = $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`; }
    query += ` ORDER BY is_featured DESC, is_best_seller DESC, created_at DESC`;
    if (limit) { params.push(parseInt(limit)); query += ` LIMIT $${params.length}`; }
    if (offset) { params.push(parseInt(offset)); query += ` OFFSET $${params.length}`; }
    const result = await pool.query(query, params);
    res.json(result.rows.map(mapProduct));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/products/:id — public
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE (id::text = $1 OR source_id = $1) AND is_hidden = false', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(mapProduct(result.rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/products — owner only
router.post('/', verifyToken, requireOwner, async (req, res) => {
  try {
    const p = req.body;
    const validation = validateProduct(p);
    if (validation) return res.status(400).json({ error: validation });
    const result = await pool.query(
      `INSERT INTO products (name, description, long_description, price, original_price, discount,
        rating, review_count, tag, img_id, gallery_img_ids, category, ingredients, allergens,
        related_ids, calories, sizes, availability, prep_time, delivery_time, tags,
        is_new, is_best_seller, is_featured, is_eggless, is_vegetarian, is_premium, is_seasonal, stock)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
       RETURNING *`,
      [p.name, p.desc, p.longDesc, p.price, p.originalPrice||null, p.discount||null,
       p.rating||0, p.reviewCount||0, p.tag||'New', p.imgId, JSON.stringify(p.galleryImgIds||[]),
       p.category, JSON.stringify(p.ingredients||[]), JSON.stringify(p.allergens||[]), JSON.stringify(p.relatedIds||[]),
       p.calories||0, JSON.stringify(p.sizes||[]), p.availability||'In Stock',
       p.prepTime||'1 day', p.deliveryTime||'Same day', JSON.stringify(p.tags||[]),
       p.isNew||false, p.isBestSeller||false, p.isFeatured||false, p.isEggless||false,
       p.isVegetarian||false, p.isPremium||false, p.isSeasonal||false, p.stock||10]
    );
    res.status(201).json(mapProduct(result.rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/products/:id — owner only
router.patch('/:id', verifyToken, requireOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const p = req.body;
    const validation = validateProduct(p, true);
    if (validation) return res.status(400).json({ error: validation });
    const fields = [];
    const values = [];
    const map = {
      name:'name', desc:'description', longDesc:'long_description', price:'price',
      originalPrice:'original_price', discount:'discount', tag:'tag', imgId:'img_id',
      galleryImgIds:'gallery_img_ids', category:'category', ingredients:'ingredients',
      allergens:'allergens', calories:'calories', sizes:'sizes', availability:'availability',
      prepTime:'prep_time', deliveryTime:'delivery_time', tags:'tags', relatedIds:'related_ids',
      isNew:'is_new', isBestSeller:'is_best_seller', isFeatured:'is_featured',
      isEggless:'is_eggless', isVegetarian:'is_vegetarian', isPremium:'is_premium',
      isSeasonal:'is_seasonal', isHidden:'is_hidden', stock:'stock',
      rating:'rating', reviewCount:'review_count',
    };
    const jsonCols = new Set(['gallery_img_ids','ingredients','allergens','sizes','tags','related_ids']);
    for (const [jsKey, dbCol] of Object.entries(map)) {
      if (jsKey in p) {
        values.push(jsonCols.has(dbCol) ? JSON.stringify(p[jsKey]) : p[jsKey]);
        fields.push(`${dbCol} = $${values.length}`);
      }
    }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    const result = await pool.query(
      `UPDATE products SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(mapProduct(result.rows[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/products/:id — owner only (soft delete)
router.delete('/:id', verifyToken, requireOwner, async (req, res) => {
  try {
    await pool.query('UPDATE products SET is_hidden = true WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

function mapProduct(row) {
  return {
    id: row.source_id || String(row.id), name: row.name, desc: row.description, longDesc: row.long_description,
    price: Number(row.price), originalPrice: row.original_price ? Number(row.original_price) : undefined,
    discount: row.discount || undefined, rating: Number(row.rating), reviewCount: row.review_count,
    tag: row.tag, imgId: row.img_id,
    galleryImgIds: row.gallery_img_ids || [],
    category: row.category,
    ingredients: row.ingredients || [], allergens: row.allergens || [],
    calories: row.calories, sizes: row.sizes || [],
    availability: row.availability, prepTime: row.prep_time, deliveryTime: row.delivery_time,
    tags: row.tags || [], isNew: row.is_new, isBestSeller: row.is_best_seller,
    isFeatured: row.is_featured, isEggless: row.is_eggless, isVegetarian: row.is_vegetarian,
    isPremium: row.is_premium, isSeasonal: row.is_seasonal, isHidden: row.is_hidden,
    stock: row.stock, relatedIds: row.related_ids || [],
  };
}

function validateProduct(p, partial = false) {
  if (!partial && (!p || typeof p !== 'object')) return 'Product payload is required';
  if ('name' in p && (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 255)) return 'Name must be 1-255 characters';
  if (!partial && p.price === undefined) return 'Price is required';
  if ('price' in p && (!Number.isFinite(Number(p.price)) || Number(p.price) < 0)) return 'Price must be a non-negative number';
  if ('stock' in p && (!Number.isInteger(Number(p.stock)) || Number(p.stock) < 0)) return 'Stock must be a non-negative integer';
  if ('rating' in p && (!Number.isFinite(Number(p.rating)) || Number(p.rating) < 0 || Number(p.rating) > 5)) return 'Rating must be between 0 and 5';
  if ('galleryImgIds' in p && !Array.isArray(p.galleryImgIds)) return 'Gallery images must be an array';
  if ('sizes' in p && !Array.isArray(p.sizes)) return 'Sizes must be an array';
  return null;
}

export default router;
