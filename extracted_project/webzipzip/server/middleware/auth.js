import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'ww_dev_secret_change_in_prod';

export function verifyToken(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalToken(req, _res, next) {
  const header = req.headers['authorization'];
  if (header) {
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    try { req.user = jwt.verify(token, JWT_SECRET); } catch { /* ignore */ }
  }
  next();
}

export function requireOwner(req, res, next) {
  if (!req.user?.isOwner) return res.status(403).json({ error: 'Owner access required' });
  next();
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}
