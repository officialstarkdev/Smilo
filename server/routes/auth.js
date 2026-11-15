import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { str } from '../utils/validate.js';

// Staff sign-in only. Patients don't need accounts: they book as guests and
// manage appointments with the link/code from their confirmation.
// (The old public /register route was removed; create staff via the seed.)
const router = Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const email = str(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'That email and password don’t match.' });
    }
    res.json({ token: signToken(user._id), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
