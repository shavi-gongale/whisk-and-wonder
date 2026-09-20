import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import pool from './db.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readProductsArray(source) {
  const match = source.match(/export const products(?:\s*:\s*[^=]+)?\s*=\s*(\[[\s\S]*?\]);\s*export const seedReviews/);
  if (!match) throw new Error('Could not locate products seed array');
  return vm.runInNewContext(`(${match[1]})`, Object.create(null));
}

function readSeedReviews(source) {
  const match = source.match(/export const seedReviews(?:\s*:\s*[^=]+)?\s*=\s*(\[[\s\S]*?\]);\s*$/);
  if (!match) return [];
  return vm.runInNewContext(`(${match[1]})`, Object.create(null));
}

export async function seedDatabase() {
  const source = await fs.readFile(path.join(ROOT, 'src/app/data/products.ts'), 'utf8');
  const products = readProductsArray(source);
  const count = await pool.query('SELECT COUNT(*)::int AS count FROM products');
  if (count.rows[0].count > 0) {
    const existing = await pool.query('SELECT id FROM products ORDER BY id');
    for (let i = 0; i < Math.min(products.length, existing.rows.length); i += 1) {
      await pool.query('UPDATE products SET source_id = COALESCE(source_id, $1) WHERE id = $2', [products[i].id, existing.rows[i].id]);
    }
    await pool.query(
      `INSERT INTO coupons (code, type, value, description, min_order, max_discount, expires_at)
       VALUES
       ('WELCOME10','percent',10,'10% off on your first order',0,NULL,NULL),
       ('SWEET15','percent',15,'15% off on orders above ₹500',500,NULL,NULL),
       ('BIRTHDAY20','percent',20,'20% off up to ₹300',800,300,NULL),
       ('VIP25','percent',25,'25% off up to ₹500',1500,500,NULL)
       ON CONFLICT (code) DO NOTHING`,
    );
    await seedDeliveryZones();
    await seedReviews(readSeedReviews(source));
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const p of products) {
      await client.query(
        `INSERT INTO products (
          source_id, name, description, long_description, price, original_price, discount,
          rating, review_count, tag, img_id, gallery_img_ids, related_ids, category,
          ingredients, allergens, calories, sizes, availability, prep_time,
          delivery_time, tags, is_new, is_best_seller, is_featured, is_eggless,
          is_vegetarian, is_premium, is_seasonal, stock
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
          $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30
        )`,
        [
          p.id, p.name, p.desc, p.longDesc, p.price, p.originalPrice ?? null, p.discount ?? null,
          p.rating ?? 0, p.reviewCount ?? 0, p.tag ?? 'New', p.imgId ?? null,
          JSON.stringify(p.galleryImgIds ?? []), JSON.stringify(p.relatedIds ?? []),
          p.category ?? 'Uncategorised', JSON.stringify(p.ingredients ?? []),
          JSON.stringify(p.allergens ?? []), p.calories ?? 0, JSON.stringify(p.sizes ?? []),
          p.availability ?? 'In Stock', p.prepTime ?? '1 day', p.deliveryTime ?? 'Same day',
          JSON.stringify(p.tags ?? []), Boolean(p.isNew), Boolean(p.isBestSeller),
          Boolean(p.isFeatured), Boolean(p.isEggless), Boolean(p.isVegetarian),
          Boolean(p.isPremium), Boolean(p.isSeasonal), Number.isInteger(p.stock) ? p.stock : 10,
        ],
      );
    }
    await client.query(
      `INSERT INTO categories (name, slug, sort_order)
       SELECT DISTINCT category, lower(regexp_replace(category, '[^a-zA-Z0-9]+', '-', 'g')), row_number() OVER ()
       FROM products
       ON CONFLICT (name) DO NOTHING`,
    );
    await client.query(
      `INSERT INTO coupons (code, type, value, description, min_order, max_discount, expires_at)
       VALUES
       ('WELCOME10','percent',10,'10% off on your first order',0,NULL,NULL),
       ('SWEET15','percent',15,'15% off on orders above ₹500',500,NULL,NULL),
       ('BIRTHDAY20','percent',20,'20% off up to ₹300',800,300,NULL),
       ('VIP25','percent',25,'25% off up to ₹500',1500,500,NULL)
       ON CONFLICT (code) DO NOTHING`,
    );
    await seedDeliveryZones(client);
    await seedReviews(readSeedReviews(source), client);
    await client.query('COMMIT');
    console.log(`Seeded ${products.length} products into PostgreSQL`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function seedDeliveryZones(client = pool) {
  await client.query(
    `INSERT INTO delivery_zones (name, pincode_prefixes, option_key, fee, min_order, estimated_time)
     VALUES
       ('Mumbai standard', '["4"]', 'standard', 49, 300, '3–5 business days'),
       ('Mumbai express', '["4"]', 'express', 99, 300, 'Next business day'),
       ('Mumbai same day', '["4"]', 'sameday', 149, 300, 'Same day'),
       ('India standard', '[]', 'standard', 79, 500, '4–6 business days')
     ON CONFLICT (name) DO UPDATE SET
       pincode_prefixes = EXCLUDED.pincode_prefixes,
       option_key = EXCLUDED.option_key,
       fee = EXCLUDED.fee,
       min_order = EXCLUDED.min_order,
       estimated_time = EXCLUDED.estimated_time`,
  );
}

async function seedReviews(groups, client = pool) {
  const reviewCount = await client.query('SELECT COUNT(*)::int AS count FROM reviews');
  if (reviewCount.rows[0].count > 0) return;
  for (const group of groups) {
    const product = await client.query('SELECT id FROM products WHERE source_id = $1', [group.productId]);
    if (!product.rows[0]) continue;
    for (const review of group.reviews || []) {
      const sourceUserId = String(review.userId || review.userInitials || review.id);
      const email = `${sourceUserId}@seed.whiskandwonder.local`;
      const user = await client.query(
        `INSERT INTO users (source_id, name, email, password_hash, initials, member_since, email_verified)
         VALUES ($1,$2,$3,$4,$5,$6,true)
         ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name, initials = EXCLUDED.initials
         RETURNING id`,
        [sourceUserId, review.userName || 'Bakery customer', email, 'seed-account', review.userInitials || 'CU', 'November 2024'],
      );
      await client.query(
        `INSERT INTO reviews (user_id, product_id, rating, text, is_verified, likes, owner_reply, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT DO NOTHING`,
        [user.rows[0].id, product.rows[0].id, review.rating, review.text, Boolean(review.isVerified), review.likes || 0, review.ownerReply || null, review.date || new Date()],
      );
    }
  }
}