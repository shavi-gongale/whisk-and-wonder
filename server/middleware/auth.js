import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be configured and at least 32 characters long');
}

export function verifyToken(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    req.user = jwt.verify(token, JWT_SECRET, { issuer: 'whisk-wonder-api', audience: 'whisk-wonder-web' });
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalToken(req, _res, next) {
  const header = req.headers['authorization'];
  if (header) {
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    try { req.user = jwt.verify(token, JWT_SECRET, { issuer: 'whisk-wonder-api', audience: 'whisk-wonder-web' }); } catch { /* ignore */ }
  }
  next();
}

export async function requireOwner(req, res, next) {
  try {
    const { default: pool } = await import('../db.js');
    const result = await pool.query('SELECT is_owner FROM users WHERE id = $1', [req.user?.id]);
    if (!result.rows[0]?.is_owner) return res.status(403).json({ error: 'Owner access required' });
    req.user.isOwner = true;
    next();
  } catch (err) {
    console.error('Owner authorization failed:', err);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d', issuer: 'whisk-wonder-api', audience: 'whisk-wonder-web' });
}
