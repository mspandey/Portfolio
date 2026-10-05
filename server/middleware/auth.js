import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'portfolio_dev_jwt_secret_change_in_production';

export function authenticateAdmin(req, res, next) {
  let token = null;

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token;
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
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
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export { JWT_SECRET };
