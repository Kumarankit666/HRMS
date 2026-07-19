const jwt = require('jsonwebtoken');
const { hasPermission } = require('../config/constants');

/** Reads "Authorization: Bearer <token>", verifies it, attaches req.user = { id, employeeCode, role, fullName, isManager }. */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'No token provided.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ success: false, message: 'Invalid or expired session. Please login again.', code: 'SESSION_EXPIRED' });
    req.user = payload;
    next();
  });
}

/** Use after authenticate(): requirePermission('MANAGE_EMPLOYEES') */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || !hasPermission(req.user.role, permission)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to do this.', code: 'FORBIDDEN' });
    }
    next();
  };
}

/** Use after authenticate(): allow only these roles. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to do this.', code: 'FORBIDDEN' });
    }
    next();
  };
}

module.exports = { authenticate, requirePermission, requireRole };
