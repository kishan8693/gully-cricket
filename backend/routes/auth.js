import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// POST /api/auth/register
router.post('/register', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password at least 6 characters'),
  body('role').optional().isIn(['admin', 'user'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const { username, password, role } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ success: false, message: 'Username already exists' });
    const user = new User({ username, password, role: role || 'user' });
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      success: true,
      message: 'Registered successfully',
      token,
      user: { id: user._id, username: user.username, role: user.role, profileImage: user.profileImage }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, role: user.role, profileImage: user.profileImage }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/profile - update own profile (username, password, profileImage)
router.put('/profile', auth, upload.single('profileImage'), [
  body('username').optional().trim().isLength({ min: 3 }).withMessage('Username at least 3 characters'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const passwordChanged = req.body.password && req.body.password.length >= 6;
    if (req.body.username) user.username = req.body.username;
    if (req.body.password) user.password = req.body.password;
    if (req.file) user.profileImage = `/uploads/users/${req.file.filename}`;
    await user.save();
    const token = passwordChanged ? jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' }) : null;
    res.json({
      success: true,
      message: passwordChanged ? 'Profile updated. Please log in again with your new password.' : 'Profile updated',
      reLogin: passwordChanged,
      token,
      user: { id: user._id, username: user.username, role: user.role, profileImage: user.profileImage }
    });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Username already taken' });
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
