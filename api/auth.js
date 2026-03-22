const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY || 'change-this-secret-key-in-production';

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(plain, hashed) {
  return bcrypt.compareSync(plain, hashed);
}

function createToken(data) {
  return jwt.sign(data, SECRET_KEY, { expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    const payload = jwt.verify(token, SECRET_KEY);
    if (payload.sub !== 'admin') return null;
    return payload;
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Missing or invalid token' });
  }
  const payload = verifyToken(auth.slice(7));
  if (!payload) {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
  req.admin = payload;
  next();
}

module.exports = { hashPassword, verifyPassword, createToken, verifyToken, requireAdmin };
