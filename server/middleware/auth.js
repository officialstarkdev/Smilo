import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Account not found. Please sign in again.' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }
}

/** Front desk + admins: can see and update the schedule. */
export function staffOnly(req, res, next) {
  if (!['staff', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Staff access required.' });
  }
  next();
}

/** Admins only: can edit treatments, team and rooms. */
export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
}
