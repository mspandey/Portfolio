import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'portfolio_dev_jwt_secret_change_in_production';

export function authenticateAdmin(req, res, next) {
  let token = null;

  // 1. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.admin_token) {
    // 2. Check HTTP-only cookie
    token = req.cookies.admin_token;
  } else if (req.query && req.query.token) {
    // 3. Fallback query param
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Admin authorization required' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired session' });
  }
}

export function isRequestFromAdmin(req) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token;
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return Boolean(decoded && decoded.role === 'admin');
  } catch {
    return false;
  }
}

export { JWT_SECRET };

